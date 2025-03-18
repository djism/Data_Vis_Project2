import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import os

# Get the current file's directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Try multiple possible locations for the data file
possible_paths = [
    os.path.join(current_dir, "adult_census_sampled1.csv"),          # Same directory
    os.path.join(current_dir, "data", "adult_census_sampled1.csv"),  # In data subfolder
    os.path.join(current_dir, "..", "data", "adult_census_sampled1.csv")  # In parent's data folder
]

# Find the first path that exists
data_path = None
for path in possible_paths:
    if os.path.exists(path):
        data_path = path
        break

# If no path exists, use a mock dataset for demonstration
if data_path is None:
    print("WARNING: Data file not found. Creating mock data for demonstration.")
    # Create mock data with reasonable columns and values
    np.random.seed(42)
    n_samples = 1000
    n_features = 6
    
    # Create synthetic feature names similar to census data
    feature_names = ['age', 'education_num', 'capital_gain', 'capital_loss', 'hours_per_week', 'income']
    
    # Create mock data
    mock_data = {}
    for feature in feature_names:
        if feature == 'age':
            mock_data[feature] = np.random.randint(18, 90, n_samples)
        elif feature == 'education_num':
            mock_data[feature] = np.random.randint(1, 16, n_samples)
        elif feature == 'capital_gain':
            mock_data[feature] = np.random.exponential(1000, n_samples)
        elif feature == 'capital_loss':
            mock_data[feature] = np.random.exponential(500, n_samples)
        elif feature == 'hours_per_week':
            mock_data[feature] = np.random.normal(40, 10, n_samples)
        elif feature == 'income':
            mock_data[feature] = np.random.choice([0, 1], n_samples, p=[0.75, 0.25])
    
    df = pd.DataFrame(mock_data)
else:
    print(f"Loading data from: {data_path}")
    df = pd.read_csv(data_path)

# Select only numeric columns
df_numeric = df.select_dtypes(include=['float64', 'int64'])

# Fill NaN values with column means to avoid issues
df_numeric = df_numeric.fillna(df_numeric.mean())

# Standardize data
scaler = StandardScaler()
df_scaled = scaler.fit_transform(df_numeric)

# Compute PCA
pca = PCA()
pca.fit(df_scaled)
eigenvalues = pca.explained_variance_
eigenvectors = pca.components_
explained_variance_ratio = pca.explained_variance_ratio_.cumsum()

# Intrinsic dimensionality (90% variance)
intrinsic_dim = np.argmax(explained_variance_ratio >= 0.9) + 1
if intrinsic_dim == 0 or intrinsic_dim > len(eigenvalues):  # Safeguard for edge cases
    intrinsic_dim = min(4, len(eigenvalues))  # Default to 4 or max available dimensions

# Compute PCA projections for biplot
pca_projected = pca.transform(df_scaled)[:, :2]

# Function to get PCA components with flexible dimensionality
def get_pca_components(dim=2):
    """Get PCA components for the first 'dim' dimensions"""
    if dim < 2:
        dim = 2  # At least 2 dimensions needed for visualization
    if dim > len(eigenvectors):
        dim = len(eigenvectors)
        
    # Return projected data
    # Always return first 2 dimensions for visualization, but use 'dim' dimensions for the projection
    return pca.transform(df_scaled)[:, :2]

# Compute K-Means for k=1…10
max_k = min(11, len(df_numeric) // 10)  # Don't attempt more clusters than makes sense
k_values = range(1, max_k)
mse_scores = []
cluster_assignments = {}

for k in k_values:
    if k == 1:
        # For k=1, all points are in the same cluster and inertia is variance
        mse_scores.append(np.var(df_scaled).sum() * len(df_scaled))
        cluster_assignments[k] = [0] * len(df_scaled)
    else:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(df_scaled)
        mse_scores.append(kmeans.inertia_)
        cluster_assignments[k] = kmeans.labels_.tolist()

# Determine best k (Elbow Method)
if len(mse_scores) > 3:
    # Calculate second derivatives for better elbow detection
    derivatives = np.diff(np.diff(mse_scores))
    indices = np.arange(2, len(mse_scores))
    
    # Find the point with largest curvature
    optimal_k = indices[np.argmax(derivatives)] + 1
    
    # If optimal_k is at the boundary, choose a more reasonable value
    if optimal_k >= len(k_values) - 1:
        optimal_k = max(3, len(k_values) // 2)
else:
    # Default for very small datasets
    optimal_k = min(3, len(k_values))

# Function to get top PCA attributes based on dimensionality
def get_top_pca_attributes(dim=None):
    if dim is None:
        dim = intrinsic_dim
    
    # Ensure valid dimensionality
    dim = min(dim, len(eigenvectors))
    dim = max(dim, 1)
    
    # Use absolute values of loadings to find most important features
    squared_loadings = np.square(eigenvectors[:dim]).sum(axis=0)
    num_attributes = min(4, len(df_numeric.columns))
    top_indices = np.argsort(squared_loadings)[-num_attributes:][::-1]  # Sort in descending order
    return df_numeric.columns[top_indices].tolist()

# Get initial top attributes
top_attributes = get_top_pca_attributes()

# Function to get scatter data for different dimensionality
def get_scatter_data_for_dim(dim=None):
    attributes = get_top_pca_attributes(dim)
    # Limit to a reasonable number of samples for the scatterplot matrix
    sample_size = min(500, len(df_numeric))
    sample_indices = np.random.choice(len(df_numeric), sample_size, replace=False)
    return df_numeric.iloc[sample_indices][attributes].to_dict(orient="records")

# Generate initial scatter data
sample_size = min(500, len(df_numeric))
scatter_data = df_numeric[top_attributes].sample(sample_size).to_dict(orient="records")
