// Utility functions
function createGradientDef(svg, id, color1, color2) {
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", id)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
        
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", color1);
        
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color2);
        
    return `url(#${id})`;
}

function createTooltip() {
    return d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
}

// Create proper axes with grid lines
function createAxes(svg, width, height, margin, xMax, yMax, xLabel, yLabel) {
    // Create X scale
    const xScale = d3.scaleLinear()
        .domain([0, xMax])
        .range([margin.left, width - margin.right]);
        
    // Create Y scale
    const yScale = d3.scaleLinear()
        .domain([0, yMax])
        .range([height - margin.bottom, margin.top]);
    
    // X grid
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale)
            .ticks(10)
            .tickSize(-(height - margin.top - margin.bottom))
            .tickFormat("")
        )
        .attr("opacity", 0.3);
    
    // Y grid
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale)
            .ticks(10)
            .tickSize(-(width - margin.left - margin.right))
            .tickFormat("")
        )
        .attr("opacity", 0.3);
        
    // X axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .attr("color", "#333");
        
    // Y axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale))
        .attr("color", "#333");
        
    // X label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 5)
        .text(xLabel)
        .attr("fill", "#333")
        .attr("font-weight", "500");
        
    // Y label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 15)
        .text(yLabel)
        .attr("fill", "#333")
        .attr("font-weight", "500");
        
    return { xScale, yScale };
}

// Global state to track current visualization settings
let currentState = {
    intrinsicDim: 2,
    optimalK: 3,
    colorByCluster: true
};

// Fetch PCA Data and render scree plot
fetch('/pca')
    .then(response => response.json())
    .then(data => {
        const svg = d3.select("#screePlot");
        svg.selectAll("*").remove(); // Clear any existing content
        
        const width = +svg.attr("width");
        const height = +svg.attr("height");
        const margin = { top: 50, right: 40, bottom: 60, left: 70 };
        const eigenvalues = data.eigenvalues;
        
        // Store intrinsic dimension
        currentState.intrinsicDim = data.intrinsic_dim;
        
        // Calculate total variance and explained variance percentages
        const totalVariance = d3.sum(eigenvalues);
        const explainedVariance = eigenvalues.map(val => (val / totalVariance) * 100);
        
        // Create a gradient for bars
        const barGradient = createGradientDef(svg, "barGradient", "#4361ee", "#3a0ca3");
        const selectedBarGradient = createGradientDef(svg, "selectedBarGradient", "#7209b7", "#f72585");
        
        // Create tooltip
        const tooltip = createTooltip();
        
        // Create axes with explained variance instead of eigenvalues
        const { xScale, yScale } = createAxes(
            svg, width, height, margin, 
            eigenvalues.length, Math.max(...explainedVariance) * 1.1, 
            "Principal Component", "Explained Variance (%)"
        );
        
        // Calculate cumulative variance
        const cumulativeVariance = explainedVariance.reduce((acc, val) => {
            if (acc.length === 0) {
                return [val];
            }
            return [...acc, acc[acc.length - 1] + val];
        }, []);
        
        // Create secondary y-axis for cumulative variance
        const y2Scale = d3.scaleLinear()
            .domain([0, 100])
            .range([height - margin.bottom, margin.top]);
            
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${width - margin.right},0)`)
            .call(d3.axisRight(y2Scale).tickFormat(d => `${d.toFixed(0)}%`))
            .attr("color", "#e63946");
            
        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(90)")
            .attr("x", height / 2)
            .attr("y", -(width - margin.right + 35))
            .text("Cumulative Variance Explained")
            .attr("fill", "#e63946")
            .attr("font-weight", "500");
        
        // Add bars for explained variance percentages
        svg.selectAll("rect.eigenvalue")
            .data(explainedVariance)
            .enter()
            .append("rect")
            .attr("class", "eigenvalue")
            .attr("x", (d, i) => xScale(i + 0.5) - 15)
            .attr("y", d => yScale(d))
            .attr("width", 30)
            .attr("height", d => height - margin.bottom - yScale(d))
            .attr("fill", (d, i) => (i + 1 === currentState.intrinsicDim) ? selectedBarGradient : barGradient)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                const i = explainedVariance.indexOf(d);
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(`<strong>PC ${i+1}</strong><br>Eigenvalue: ${eigenvalues[i].toFixed(2)}<br>Variance Explained: ${d.toFixed(2)}%<br>Cumulative: ${cumulativeVariance[i].toFixed(2)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .on("click", (event, d) => {
                const clickedIndex = explainedVariance.indexOf(d);
                handleDimensionalitySelection(clickedIndex + 1);
                
                // Update the colors of all bars
                svg.selectAll("rect.eigenvalue")
                    .attr("fill", (d, i) => (i === clickedIndex) ? selectedBarGradient : barGradient);
            });
            
        // Add line for cumulative variance
        const line = d3.line()
            .x((d, i) => xScale(i + 1))
            .y(d => y2Scale(d))
            .curve(d3.curveMonotoneX);
            
        svg.append("path")
            .datum(cumulativeVariance)
            .attr("class", "cumulative-line")
            .attr("fill", "none")
            .attr("stroke", "#e63946")
            .attr("stroke-width", 3)
            .attr("d", line);
            
        // Add points to the line
        svg.selectAll("circle.cumulative-point")
            .data(cumulativeVariance)
            .enter()
            .append("circle")
            .attr("class", "cumulative-point")
            .attr("cx", (d, i) => xScale(i + 1))
            .attr("cy", d => y2Scale(d))
            .attr("r", 5)
            .attr("fill", "#e63946")
            .attr("stroke", "white")
            .attr("stroke-width", 2);
            
        // Add line to show intrinsic dimensionality threshold
        if (data.intrinsic_dim) {
            svg.append("line")
                .attr("x1", xScale(data.intrinsic_dim))
                .attr("y1", margin.top)
                .attr("x2", xScale(data.intrinsic_dim))
                .attr("y2", height - margin.bottom)
                .attr("stroke", "#7209b7")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "6,4");
                
            svg.append("text")
                .attr("x", xScale(data.intrinsic_dim) + 10)
                .attr("y", margin.top + 20)
                .text(`Intrinsic Dimensionality: ${data.intrinsic_dim}`)
                .attr("fill", "#7209b7")
                .attr("font-weight", "bold");
        }
        
        // Add a title to the plot
        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text("PCA Scree Plot");
            
        // Add a subtitle
        svg.append("text")
            .attr("class", "chart-subtitle")
            .attr("x", width / 2)
            .attr("y", margin.top / 2 + 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#666")
            .text("Variance explained by each principal component");
    });

// Function to handle dimensionality selection
function handleDimensionalitySelection(dim) {
    console.log(`Selected dimensionality: ${dim}`);
    currentState.intrinsicDim = dim;
    
    // Update biplot based on selected dimensionality
    updateBiplot(dim);
    
    // Update the cluster coloring
    if (currentState.colorByCluster) {
        updateBiplotClusters(currentState.optimalK);
    }
    
    // Update scatterplot matrix based on new dimensionality
    updateScatterMatrix(dim);
    
    // Update top attributes display
    updateTopAttributesDisplay(dim);
}

// Function to update scatterplot matrix based on dimensionality
function updateScatterMatrix(dim) {
    fetch(`/scatter_matrix?dim=${dim}`)
        .then(response => response.json())
        .then(data => {
            renderScatterMatrix(data.scatter_data);
            // After rendering, update colors based on current cluster assignments
            if (currentState.colorByCluster) {
                updateScatterMatrixColors(currentState.optimalK);
            }
        });
}

// Function to update biplot based on dimensionality
function updateBiplot(dim) {
    fetch(`/biplot?dim=${dim}`)
        .then(response => response.json())
        .then(data => {
            renderBiplot(data);
        });
}

// Function to update top attributes display
function updateTopAttributesDisplay(dim) {
    fetch(`/top_pca_attributes?dim=${dim}`)
        .then(response => response.json())
        .then(data => {
            renderTopAttributes(data.top_attributes);
        });
}

// Fetch K-means data and render elbow plot
fetch('/kmeans')
    .then(response => response.json())
    .then(data => {
        const svg = d3.select("#elbowPlot");
        svg.selectAll("*").remove(); // Clear any existing content
        
        const width = +svg.attr("width");
        const height = +svg.attr("height");
        const margin = { top: 50, right: 40, bottom: 60, left: 70 };
        const mseScores = data.mse_scores;
        
        // Store optimal k
        currentState.optimalK = data.optimal_k;
        
        // Create gradients
        const barGradient = createGradientDef(svg, "kmeansBarGradient", "#4cc9f0", "#4895ef");
        const selectedBarGradient = createGradientDef(svg, "selectedKmeansBarGradient", "#f72585", "#7209b7");
        
        // Create tooltip
        const tooltip = createTooltip();
        
        // Create axes
        const { xScale, yScale } = createAxes(
            svg, width, height, margin, 
            mseScores.length, Math.max(...mseScores) * 1.1, 
            "Number of Clusters (k)", "Mean Squared Error"
        );
        
        // Add bars for MSE scores
        svg.selectAll("rect.mse")
            .data(mseScores)
            .enter()
            .append("rect")
            .attr("class", "mse")
            .attr("x", (d, i) => xScale(i + 0.5) - 15)
            .attr("y", d => yScale(d))
            .attr("width", 30)
            .attr("height", d => height - margin.bottom - yScale(d))
            .attr("fill", (d, i) => (i + 1 === data.optimal_k) ? selectedBarGradient : barGradient)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                const i = mseScores.indexOf(d);
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(`<strong>k = ${i+1}</strong><br>MSE: ${d.toFixed(2)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .on("click", (event, d) => {
                const clickedK = mseScores.indexOf(d) + 1;
                handleClusterSelection(clickedK);
                
                // Update the colors of all bars
                svg.selectAll("rect.mse")
                    .attr("fill", (d, i) => (i + 1 === clickedK) ? selectedBarGradient : barGradient);
            });
            
        // Add line to show optimal k
        svg.append("line")
            .attr("x1", xScale(data.optimal_k))
            .attr("y1", margin.top)
            .attr("x2", xScale(data.optimal_k))
            .attr("y2", height - margin.bottom)
            .attr("stroke", "#f72585")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "6,4");
            
        svg.append("text")
            .attr("x", xScale(data.optimal_k) + 10)
            .attr("y", margin.top + 20)
            .text(`Optimal k: ${data.optimal_k}`)
            .attr("fill", "#f72585")
            .attr("font-weight", "bold");
            
        // Add a title to the plot
        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text("K-Means Clustering Elbow Plot");
            
        // Add a subtitle
        svg.append("text")
            .attr("class", "chart-subtitle")
            .attr("x", width / 2)
            .attr("y", margin.top / 2 + 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#666")
            .text("Lower MSE indicates better fit, optimal k shown by elbow point");
    });

// Function to handle cluster selection
function handleClusterSelection(k) {
    console.log(`Selected k: ${k}`);
    currentState.optimalK = k;
    
    // Update color by cluster flag
    currentState.colorByCluster = true;
    
    // Update biplot with new clusters
    updateBiplotClusters(k);
    
    // Update scatter matrix with new clusters
    updateScatterMatrixColors(k);
}

// Function to update biplot clusters
function updateBiplotClusters(k) {
    fetch(`/clusters/${k}`)
        .then(response => response.json())
        .then(data => {
            const svg = d3.select("#biplot");
            
            // Update points with cluster colors
            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
            
            svg.selectAll("circle.data-point")
                .transition()
                .duration(500)
                .attr("fill", (d, i) => colorScale(data.clusters[i]))
                .attr("stroke", (d, i) => d3.rgb(colorScale(data.clusters[i])).darker(0.5));
                
            // Add or update legend
            updateClusterLegend(svg, k, colorScale);
        });
}

// Function to update scatter matrix colors
function updateScatterMatrixColors(k) {
    fetch(`/clusters/${k}`)
        .then(response => response.json())
        .then(data => {
            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
            
            d3.selectAll(".scatter-dot")
                .transition()
                .duration(500)
                .attr("fill", (d, i) => colorScale(data.clusters[i % data.clusters.length]))
                .attr("stroke", (d, i) => d3.rgb(colorScale(data.clusters[i % data.clusters.length])).darker(0.5));
        });
}

// Function to update cluster legend
function updateClusterLegend(svg, k, colorScale) {
    const width = +svg.attr("width");
    const legendMargin = 20;
    const legendItemHeight = 20;
    
    // Remove existing legend
    svg.selectAll(".legend").remove();
    
    // Create legend group
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100}, 20)`);
        
    // Add legend title
    legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .text("Clusters")
        .attr("font-weight", "bold")
        .attr("font-size", "10px");
        
    // Add legend items
    for (let i = 0; i < k; i++) {
        const legendItem = legend.append("g")
            .attr("transform", `translate(0, ${i * legendItemHeight + 15})`);
            
        legendItem.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", colorScale(i))
            .attr("rx", 2)
            .attr("ry", 2);
            
        legendItem.append("text")
            .attr("x", 16)
            .attr("y", 10)
            .text(`Cluster ${i + 1}`)
            .attr("font-size", "10px");
    }
}

// Function to render biplot
// Function to render biplot
function renderBiplot(data) {
    const svg = d3.select("#biplot");
    svg.selectAll("*").remove(); // Clear any existing content
    
    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const margin = { top: 50, right: 40, bottom: 60, left: 70 };
    
    // Create tooltip
    const tooltip = createTooltip();
    
    // Define scales
    const xExtent = d3.extent(data.pca_projected, d => d[0]);
    const yExtent = d3.extent(data.pca_projected, d => d[1]);
    
    // Add padding to extents
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    
    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([margin.left, width - margin.right]);
        
    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height - margin.bottom, margin.top]);
        
    // Create axes with grid
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale)
            .ticks(10)
            .tickSize(-(height - margin.top - margin.bottom))
            .tickFormat("")
        )
        .attr("opacity", 0.3);
        
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale)
            .ticks(10)
            .tickSize(-(width - margin.left - margin.right))
            .tickFormat("")
        )
        .attr("opacity", 0.3);
        
    // Add axes
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));
        
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));
        
    // Add axis labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 5)
        .text("Principal Component 1")
        .attr("fill", "#333")
        .attr("font-weight", "500");
        
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 15)
        .text("Principal Component 2")
        .attr("fill", "#333")
        .attr("font-weight", "500");
        
    // Draw data points
    svg.selectAll("circle.data-point")
        .data(data.pca_projected)
        .enter()
        .append("circle")
        .attr("class", "data-point")
        .attr("cx", d => xScale(d[0]))
        .attr("cy", d => yScale(d[1]))
        .attr("r", 4)
        .attr("fill", "#4361ee")
        .attr("opacity", 0.7)
        .attr("stroke", "#3a0ca3")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(100)
                .attr("r", 6)
                .attr("opacity", 1);
                
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
                
            tooltip.html(`<strong>Point</strong><br>PC1: ${d[0].toFixed(2)}<br>PC2: ${d[1].toFixed(2)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 4)
                .attr("opacity", 0.7);
                
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Draw feature vectors
    if (data.vectors && data.vectors.length > 0) {
        // Add arrow marker definition
        svg.append("defs").append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 8)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#ff6b6b");
            
        // Create a group for the vectors
        const vectorsGroup = svg.append("g")
            .attr("class", "feature-vectors");
            
        // Calculate the plot area dimensions
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        
        // Calculate the center point in screen coordinates
        const centerX = xScale(0);
        const centerY = yScale(0);
        
        // Calculate the maximum allowed vector length to stay within plot boundaries
        // This calculates the distance to the closest edge from the center
        const maxVectorLength = Math.min(
            centerX - margin.left,
            width - margin.right - centerX,
            centerY - margin.top,
            height - margin.bottom - centerY
        ) * 0.85; // Use 85% of the max to leave some margin
        
        // Add vectors
        data.vectors.forEach((item) => {
            const vector = item.vector;
            const name = item.name;
            
            if (vector.length >= 2) {  // Ensure we have at least 2 components
                // Calculate the raw vector in screen coordinates
                const rawX = vector[0];
                const rawY = vector[1];
                
                // Calculate the vector length
                const length = Math.sqrt(rawX * rawX + rawY * rawY);
                
                // Normalize the vector
                const normalizedX = rawX / length;
                const normalizedY = rawY / length;
                
                // Scale the vector to fit within the plot
                const scaledLength = Math.min(length * maxVectorLength, maxVectorLength);
                
                // Calculate the final vector endpoint
                const endX = centerX + normalizedX * scaledLength;
                const endY = centerY - normalizedY * scaledLength; // Subtract for y since SVG coordinates are flipped
                
                // Add vector line
                vectorsGroup.append("line")
                    .attr("x1", centerX)
                    .attr("y1", centerY)
                    .attr("x2", endX)
                    .attr("y2", endY)
                    .attr("stroke", "#ff6b6b")
                    .attr("stroke-width", 1.5)
                    .attr("marker-end", "url(#arrow)");
                    
                // Calculate label position - slightly beyond the arrow
                const labelOffset = 12;
                const labelX = centerX + normalizedX * (scaledLength + labelOffset);
                const labelY = centerY - normalizedY * (scaledLength + labelOffset);
                
                // Add feature name label
                vectorsGroup.append("text")
                    .attr("x", labelX)
                    .attr("y", labelY)
                    .attr("text-anchor", normalizedX > 0 ? "start" : "end")
                    .attr("dominant-baseline", normalizedY > 0 ? "hanging" : "auto")
                    .attr("fill", "#d62828")
                    .attr("font-size", "9px")
                    .attr("font-weight", "500")
                    .text(name);
            }
        });
        
        // Add legend for feature vectors
        const legend = svg.append("g")
            .attr("class", "vector-legend")
            .attr("transform", `translate(${width - 160}, ${height - 70})`);
            
        legend.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 20)
            .attr("y2", 0)
            .attr("stroke", "#ff6b6b")
            .attr("stroke-width", 1.5)
            .attr("marker-end", "url(#arrow)");
            
        legend.append("text")
            .attr("x", 25)
            .attr("y", 4)
            .attr("font-size", "10px")
            .text("Feature Influence");
    }
            
    // Add origin lines
    svg.append("line")
        .attr("class", "origin-line")
        .attr("x1", margin.left)
        .attr("y1", yScale(0))
        .attr("x2", width - margin.right)
        .attr("y2", yScale(0))
        .attr("stroke", "#999")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
            
    svg.append("line")
        .attr("class", "origin-line")
        .attr("x1", xScale(0))
        .attr("y1", margin.top)
        .attr("x2", xScale(0))
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#999")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
            
    // Add plot title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("PCA Projection (First 2 Components)");
    
    // Update clusters if we have a selected k
    if (currentState.colorByCluster) {
        updateBiplotClusters(currentState.optimalK);
    }
}

// Function to render top attributes table
function renderTopAttributes(attributes) {
    const container = d3.select("#attributesTable");
    container.html(""); // Clear previous content
    
    attributes.forEach((attr, i) => {
        container.append("div")
            .attr("class", "attribute-card")
            .html(`
                <div class="attribute-number">#${i + 1}</div>
                <div class="attribute-name">${attr}</div>
            `);
    });
}

// Function to render scatter plot matrix
function renderScatterMatrix(data) {
    // Get attribute names from data
    const attributes = Object.keys(data[0]);
    const n = attributes.length;
    
    // Define cell dimensions
    const cellSize = 150;
    const padding = 30;
    
    // Create or clear the container
    const container = d3.select("#scatterMatrix");
    container.html("");
    
    // Calculate total dimensions
    const totalWidth = n * cellSize;
    const totalHeight = n * cellSize;
    
    // Create the SVG
    const svg = container.append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight);
        
    // Create tooltip
    const tooltip = createTooltip();
    
    // Create scale for each attribute
    const scales = {};
    attributes.forEach(attr => {
        const extent = d3.extent(data, d => d[attr]);
        scales[attr] = d3.scaleLinear()
            .domain(extent)
            .range([padding, cellSize - padding]);
    });
    
    // Create a cell for each attribute pair
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const cell = svg.append("g")
                .attr("transform", `translate(${j * cellSize}, ${i * cellSize})`);
                
            // Add background
            cell.append("rect")
                .attr("width", cellSize)
                .attr("height", cellSize)
                .attr("fill", "white")
                .attr("stroke", "#ddd")
                .attr("stroke-width", 1);
                
            if (i === j) {
                // Diagonal cells show attribute names
                cell.append("text")
                    .attr("x", cellSize / 2)
                    .attr("y", cellSize / 2)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .attr("font-weight", "bold")
                    .attr("font-size", "12px")
                    .text(attributes[i]);
            } else {
                // Off-diagonal cells show scatterplots
                const xAttr = attributes[j];
                const yAttr = attributes[i];
                
                // Add dots
                cell.selectAll("circle")
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("class", "scatter-dot")
                    .attr("cx", d => scales[xAttr](d[xAttr]))
                    .attr("cy", d => cellSize - scales[yAttr](d[yAttr]))
                    .attr("r", 3)
                    .attr("fill", "#4361ee")
                    .attr("opacity", 0.6)
                    .attr("stroke", "#3a0ca3")
                    .attr("stroke-width", 0.5)
                    .on("mouseover", function(event, d) {
                        d3.select(this)
                            .transition()
                            .duration(100)
                            .attr("r", 5)
                            .attr("opacity", 1);
                            
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", 0.9);
                            
                        tooltip.html(`<strong>Point</strong><br>${xAttr}: ${d[xAttr].toFixed(2)}<br>${yAttr}: ${d[yAttr].toFixed(2)}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr("r", 3)
                            .attr("opacity", 0.6);
                            
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });
                    
                // Add axis lines
                const xScale = d3.scaleLinear()
                    .domain(d3.extent(data, d => d[xAttr]))
                    .range([padding, cellSize - padding]);
                    
                const yScale = d3.scaleLinear()
                    .domain(d3.extent(data, d => d[yAttr]))
                    .range([cellSize - padding, padding]);
                    
                // Add x-axis if in the bottom row
                if (i === n - 1) {
                    const xAxis = d3.axisBottom(xScale).ticks(3).tickSize(3);
                    cell.append("g")
                        .attr("transform", `translate(0, ${cellSize - padding})`)
                        .call(xAxis)
                        .attr("font-size", "8px");
                }
                
                // Add y-axis if in the leftmost column
                if (j === 0) {
                    const yAxis = d3.axisLeft(yScale).ticks(3).tickSize(3);
                    cell.append("g")
                        .attr("transform", `translate(${padding}, 0)`)
                        .call(yAxis)
                        .attr("font-size", "8px");
                }
            }
        }
    }
}

// Initialize visualizations
// First, render the biplot using intrinsic dimensionality
updateBiplot(currentState.intrinsicDim);

// Then, initialize scatter matrix
updateScatterMatrix(currentState.intrinsicDim);

// Finally, show top attributes
updateTopAttributesDisplay(currentState.intrinsicDim);
