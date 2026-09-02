import type { CheatTopic } from "./types";

export const unit3aTopics: CheatTopic[] = [
  {
    id: "unsupervised-learning-intro",
    title: "Unsupervised Learning Overview",
    unit: "III",
    category: "Unsupervised Learning",
    importance: "HIGH",
    definition: "Learning paradigm where the algorithm is given unlabeled input data X and must discover underlying patterns, groupings, or representations.",
    coreIdea: "No target labels Y! Uncover hidden structure, natural clusters, or latent dimensions.",
    visual: {
      type: "tree",
      data: {
        root: "UNSUPERVISED LEARNING",
        branches: [
          { name: "Clustering", sub: ["Partitioning (k-Means, k-Medoids)", "Hierarchical (Dendrogram)", "Density-Based (DBSCAN)"] },
          { name: "Dimensionality Reduction", sub: ["PCA", "t-SNE"] }
        ]
      }
    },
    keyPoints: [
      "No supervisor / no explicit target outputs Y.",
      "Primary Tasks: Clustering (grouping similar items) and Dimensionality Reduction (compressing features).",
      "Evaluation: Internal metrics like Silhouette Coefficient, Inertia (WSS), or Dunn Index."
    ],
    examPoints: [
      "Unsupervised = Unlabeled data (find natural structure/clusters).",
      "Main applications: Customer segmentation, anomaly detection, data compression."
    ],
    memoryTrigger: "No labels → Discover hidden patterns & clusters in data.",
    keywords: ["unsupervised", "unlabeled", "clustering", "patterns", "structure"]
  },
  {
    id: "supervised-vs-unsupervised",
    title: "Supervised vs Unsupervised",
    unit: "III",
    category: "Unsupervised Learning",
    importance: "HIGH",
    definition: "Fundamental comparison between labeled prediction models and unlabeled structure-discovery algorithms.",
    coreIdea: "Supervised learns mapping f(X)=Y; Unsupervised learns internal structure p(X).",
    differences: [
      { feature: "Data Type", valA: "Labeled (X + Target Y)", valB: "Unlabeled (Input X only)" },
      { feature: "Goal", valA: "Predict continuous Y or class Y", valB: "Discover hidden patterns / groups" },
      { feature: "Evaluation", valA: "Accuracy, Precision, MSE (vs Y)", valB: "Silhouette score, Inertia, Dunn index" },
      { feature: "Main Types", valA: "Regression & Classification", valB: "Clustering & Dimensionality Reduction" },
      { feature: "Algorithms", valA: "SLR, Logistic, kNN, DT, SVM, RF", valB: "k-Means, k-Medoids, DBSCAN, PCA" }
    ],
    examPoints: [
      "Supervised has target labels; Unsupervised has NO target labels.",
      "Supervised evaluates error against actual Y; Unsupervised evaluates cluster compactness/separation."
    ],
    memoryTrigger: "Supervised = Labeled (predict Y) | Unsupervised = Unlabeled (group X).",
    keywords: ["supervised vs unsupervised", "comparison", "labeled", "unlabeled"]
  },
  {
    id: "clustering-intro",
    title: "Clustering Overview",
    unit: "III",
    category: "Clustering",
    importance: "HIGH",
    definition: "Unsupervised partitioning of data points into groups (clusters) such that points in the same cluster are highly similar, and points in different clusters are distinct.",
    coreIdea: "Maximize intra-cluster similarity; Minimize inter-cluster similarity.",
    visual: {
      type: "tree",
      data: {
        root: "CLUSTERING METHODS",
        branches: [
          { name: "Partitioning", sub: ["k-Means (Centroid mean)", "k-Medoids / PAM (Actual point)"] },
          { name: "Hierarchical", sub: ["Agglomerative (Bottom-up)", "Divisive (Top-down)"] },
          { name: "Density-Based", sub: ["DBSCAN (Core, Border, Noise)"] }
        ]
      }
    },
    keyPoints: [
      "Partitioning: Divides data into K non-overlapping clusters.",
      "Hierarchical: Creates a nested tree of clusters (Dendrogram).",
      "Density-Based: Connects dense regions of data separated by low-density noise."
    ],
    examPoints: [
      "Intra-cluster distance should be MINIMIZED (high similarity inside cluster).",
      "Inter-cluster distance should be MAXIMIZED (high separation between clusters)."
    ],
    memoryTrigger: "Intra-cluster similarity HIGH | Inter-cluster similarity LOW.",
    keywords: ["clustering", "partitioning", "hierarchical", "density", "intra-cluster", "inter-cluster"]
  }
];
