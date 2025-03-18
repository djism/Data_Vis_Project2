from flask import Flask, jsonify, send_from_directory, request
import os
import sys
import traceback

# Try importing the PCA/K-means module
try:
    from pca_kmeans import (
        eigenvalues, intrinsic_dim, mse_scores, optimal_k, cluster_assignments, 
        get_top_pca_attributes, pca_projected, scatter_data, get_pca_components,
        eigenvectors, df_numeric, get_scatter_data_for_dim
    )
    import numpy as np
    print("Successfully imported PCA/K-means module")
except Exception as e:
    print(f"Error importing PCA/K-means module: {e}")
    traceback.print_exc()
    # Create placeholder data for demonstration
    eigenvalues = np.array([5.0, 3.0, 2.0, 1.0, 0.5, 0.3])
    intrinsic_dim = 3
    mse_scores = [500, 300, 200, 150, 120, 100, 90, 85, 80, 78]
    optimal_k = 3
    cluster_assignments = {k: [i % k for i in range(100)] for k in range(1, 11)}
    scatter_data = [{"attr1": i, "attr2": i*2, "attr3": i*3, "attr4": i*4} for i in range(100)]
    
    def get_top_pca_attributes(dim=None):
        return ["attr1", "attr2", "attr3", "attr4"]
    
    def get_pca_components(dim=2):
        return np.random.rand(100, 2)
    
    def get_scatter_data_for_dim(dim=None):
        return scatter_data
    
    pca_projected = np.random.rand(100, 2)
    eigenvectors = np.random.rand(6, 6)
    df_numeric = None

# Initialize Flask app
app = Flask(__name__, static_folder='.')

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/pca', methods=['GET'])
def get_pca_data():
    explained_variance = np.cumsum(eigenvalues / np.sum(eigenvalues)).tolist() if len(eigenvalues) > 0 else [1.0]
    return jsonify({
        'eigenvalues': eigenvalues.tolist(), 
        'intrinsic_dim': int(intrinsic_dim),
        'explained_variance': explained_variance
    })

@app.route('/biplot', methods=['GET'])
def get_biplot_data():
    dim = request.args.get('dim', default=2, type=int)
    # Get principal components based on dimensionality
    pca_data = get_pca_components(dim)
    
    # Include feature vectors for biplot
    vectors = []
    if df_numeric is not None:
        for i, feature in enumerate(df_numeric.columns):
            if i < eigenvectors.shape[1]:
                vectors.append({
                    'name': feature,
                    'vector': eigenvectors[:2, i].tolist() if eigenvectors.shape[0] >= 2 else [0, 0]
                })
    
    return jsonify({
        'pca_projected': pca_data.tolist(),
        'vectors': vectors
    })

@app.route('/kmeans', methods=['GET'])
def get_kmeans_data():
    return jsonify({
        'mse_scores': mse_scores, 
        'optimal_k': int(optimal_k)
    })

@app.route('/clusters/<int:k>', methods=['GET'])
def get_clusters(k):
    if k not in cluster_assignments:
        return jsonify({'error': 'Invalid k value'}), 400
    return jsonify({'clusters': cluster_assignments[k]})

@app.route('/top_pca_attributes', methods=['GET'])
def get_top_pca_attributes_api():
    dim = request.args.get('dim', default=intrinsic_dim, type=int)
    return jsonify({'top_attributes': get_top_pca_attributes(dim)})

@app.route('/scatter_matrix', methods=['GET'])
def get_scatter_matrix():
    dim = request.args.get('dim', default=intrinsic_dim, type=int)
    # Get scatter data based on specified dimensionality
    matrix_data = get_scatter_data_for_dim(dim)
    return jsonify({'scatter_data': matrix_data})

if __name__ == '__main__':
    # Print current working directory for debugging
    print(f"Current working directory: {os.getcwd()}")
    
    # Print Python version
    print(f"Python version: {sys.version}")
    
    # Run the Flask app
    print("Starting Flask server...")
    app.run(debug=True)