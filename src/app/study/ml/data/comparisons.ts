import type { ComparisonCardData } from "./types";

export const MASTER_COMPARISONS: ComparisonCardData[] = [
  {
    title: "Supervised vs Unsupervised",
    typeA: "Supervised Learning",
    typeB: "Unsupervised Learning",
    rows: [
      { feature: "Target Label Y", valA: "Present (Labeled Data)", valB: "Absent (Unlabeled Data)" },
      { feature: "Primary Objective", valA: "Predict output Y = f(X)", valB: "Discover hidden patterns & structure" },
      { feature: "Evaluation Metric", valA: "MSE, Accuracy, Precision, Recall", valB: "Inertia, Silhouette score, Dunn index" },
      { feature: "Algorithms", valA: "Linear Reg, Logistic, DT, SVM, RF", valB: "k-Means, k-Medoids, Hierarchical, DBSCAN, PCA" }
    ],
    examNote: "Supervised requires labeled data; Unsupervised discovers inherent data structure."
  },
  {
    title: "Simple vs Multiple Linear Regression",
    typeA: "Simple Linear Regression",
    typeB: "Multiple Linear Regression",
    rows: [
      { feature: "Input Features (X)", valA: "Exactly 1 feature (x₁)", valB: "Multiple features (x₁, x₂... xₙ)" },
      { feature: "Geometric Model", valA: "2D Straight Line (ŷ = b₀ + b₁x)", valB: "N-dimensional Hyperplane (ŷ = b₀ + ∑ bᵢxᵢ)" },
      { feature: "Risk Factors", valA: "Underfitting if data is non-linear", valB: "Multicollinearity between features" }
    ]
  },
  {
    title: "Linear vs Polynomial Regression",
    typeA: "Linear Regression",
    typeB: "Polynomial Regression",
    rows: [
      { feature: "Feature Powers", valA: "Degree 1 (x)", valB: "Higher Degrees (x, x², x³...)" },
      { feature: "Fitted Curve", valA: "Straight line / Flat plane", valB: "Curved non-linear surface" },
      { feature: "Parameter Linearity", valA: "Linear in parameters bᵢ", valB: "Linear in parameters bᵢ (expanded features)" },
      { feature: "Overfitting Risk", valA: "Low", valB: "High for large polynomial degree n" }
    ]
  },
  {
    title: "Linear Regression vs Logistic Regression",
    typeA: "Linear Regression",
    typeB: "Logistic Regression",
    rows: [
      { feature: "Task Type", valA: "Regression (Continuous Output)", valB: "Classification (Discrete Class Label)" },
      { feature: "Output Range", valA: "Unbounded continuous (-∞ to +∞)", valB: "Bounded probability (0 to 1)" },
      { feature: "Activation Function", valA: "Identity f(z) = z", valB: "Sigmoid σ(z) = 1 / (1 + e⁻ᶻ)" },
      { feature: "Loss Function", valA: "Mean Squared Error (MSE)", valB: "Binary Cross-Entropy (Log Loss)" }
    ],
    examNote: "Logistic Regression is used for Classification despite having 'Regression' in its name."
  },
  {
    title: "k-Means vs k-Medoids",
    typeA: "k-Means",
    typeB: "k-Medoids (PAM)",
    rows: [
      { feature: "Center Point", valA: "Centroid = Mean (artificial point)", valB: "Medoid = Actual data point" },
      { feature: "Outlier Sensitivity", valA: "Highly sensitive to outliers", valB: "Robust to outliers and noise" },
      { feature: "Complexity", valA: "Fast O(N·K·I)", valB: "Slower O(K·(N-K)²)" }
    ],
    examNote: "k-Means center is an artificial mean; k-Medoids center is a real data point."
  },
  {
    title: "Partitioning vs Hierarchical Clustering",
    typeA: "Partitioning (k-Means)",
    typeB: "Hierarchical Clustering",
    rows: [
      { feature: "Cluster Structure", valA: "K flat non-overlapping groups", valB: "Nested tree structure (Dendrogram)" },
      { feature: "Cluster Count K", valA: "Must specify K before training", valB: "No need to specify K upfront (cut tree)" },
      { feature: "Approach", valA: "Iterative centroid assignment", valB: "Agglomerative (Bottom-up) or Divisive (Top-down)" }
    ]
  },
  {
    title: "k-Means vs DBSCAN",
    typeA: "k-Means",
    typeB: "DBSCAN",
    rows: [
      { feature: "Cluster Shapes", valA: "Spherical / Convex clusters only", valB: "Arbitrary complex shapes (concentric, etc.)" },
      { feature: "Noise / Outliers", valA: "Forces all points into a cluster", valB: "Explicitly identifies and labels Noise (×)" },
      { feature: "Required Parameters", valA: "Number of clusters K", valB: "Epsilon radius (ε) & MinPts" }
    ],
    examNote: "DBSCAN detects noise and arbitrary non-spherical shapes."
  },
  {
    title: "Decision Tree vs Random Forest",
    typeA: "Decision Tree",
    typeB: "Random Forest",
    rows: [
      { feature: "Architecture", valA: "Single decision tree", valB: "Ensemble of N decision trees" },
      { feature: "Overfitting", valA: "High risk (High Variance)", valB: "Low risk (Bagging + Random Features)" },
      { feature: "Interpretability", valA: "White-box (Easy IF-THEN rules)", valB: "Black-box (Majority voting)" }
    ]
  },
  {
    title: "kNN vs SVM",
    typeA: "k-Nearest Neighbour (kNN)",
    typeB: "Support Vector Machine (SVM)",
    rows: [
      { feature: "Learner Type", valA: "Lazy learner (No explicit training)", valB: "Eager learner (Finds optimal hyperplane)" },
      { feature: "Memory Usage", valA: "Stores entire dataset in memory", valB: "Stores only Support Vectors" },
      { feature: "Boundary", valA: "Local majority voting", valB: "Global max-margin hyperplane + Kernel" }
    ]
  }
];
