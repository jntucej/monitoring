import type { CheatTopic } from "./types";

export const unit3bTopics: CheatTopic[] = [
  {
    id: "kmeans",
    title: "k-Means Clustering",
    unit: "III",
    category: "Clustering",
    importance: "HIGH",
    definition: "Partitioning clustering algorithm that divides N observations into k clusters, with each point assigned to the nearest centroid (mean).",
    coreIdea: "Initialize K centroids → Assign points to closest centroid → Recalculate centroids as cluster mean → Repeat until convergence.",
    visual: {
      type: "pipeline",
      data: ["CHOOSE K", "INITIALIZE CENTROIDS (Random)", "ASSIGN POINTS (Euclidean Distance)", "RECALCULATE CENTROIDS (Mean)", "REPEAT UNTIL CONVERGENCE"]
    },
    formula: {
      expression: "Centroid Update: μₖ = (1 / |Cₖ|) ∑_{x ∈ Cₖ} x  |  Inertia (WSS) = ∑ₖ ∑_{x ∈ Cₖ} ||x - μₖ||²",
      symbols: { "μₖ": "Mean centroid of cluster k", "Cₖ": "Set of points in cluster k", "WSS": "Within-Cluster Sum of Squares" },
      use: "Partitioning data into K spherical clusters by minimizing WSS inertia.",
      examNote: "Elbow Method: Plot WSS vs K to find optimal K at the 'elbow' bend point."
    },
    keyPoints: [
      "Centroid: Artificial point representing the mean position of all points in cluster Cₖ.",
      "Sensitivity: Sensitive to initial centroid placement (k-means++ fixes this) and outliers.",
      "Shape limitation: Only finds spherical/convex clusters of similar size."
    ],
    examPoints: [
      "k-Means centroid = Mean of cluster points (can be an artificial non-data point).",
      "Optimal K determined via Elbow Method or Silhouette analysis.",
      "Sensitive to scale (use standardization) and outliers."
    ],
    memoryTrigger: "k-Means = Pick K → Assign nearest → Recompute mean centroids → Repeat.",
    keywords: ["kmeans", "centroids", "mean", "elbow method", "inertia", "partitioning"]
  },
  {
    id: "kmedoids",
    title: "k-Medoids Clustering (PAM)",
    unit: "III",
    category: "Clustering",
    importance: "HIGH",
    definition: "Partitioning clustering algorithm similar to k-Means, but where cluster centers are restricted to be ACTUAL data points (medoids).",
    coreIdea: "Center = Real data point (Medoid) minimizing total dissimilarity. Far more robust to noise and outliers than k-Means.",
    visual: {
      type: "comparison",
      data: [
        { feature: "Center Definition", valA: "Mean position (can be artificial)", valB: "Actual data point (Medoid)" },
        { feature: "Outlier Sensitivity", valA: "High (Mean pulled by outliers)", valB: "Low (Medoid robust to extreme values)" },
        { feature: "Algorithm", valA: "k-Means (Fast iterative update)", valB: "PAM (Partitioning Around Medoids - swap based)" },
        { feature: "Distance Metric", valA: "Euclidean distance primarily", valB: "Any custom dissimilarity metric" }
      ]
    },
    keyPoints: [
      "Medoid: The actual data point in a cluster whose average dissimilarity to all other points in the cluster is minimal.",
      "PAM Algorithm: Initializes K random real medoids, swaps non-medoid points if total dissimilarity cost decreases.",
      "Advantage: Extremely robust to outliers and noisy points."
    ],
    examPoints: [
      "CRITICAL DIFFERENCE: k-Means centroid is a calculated mean (artificial point); k-Medoids center is an ACTUAL data point.",
      "k-Medoids (PAM) is robust to noise and outliers."
    ],
    memoryTrigger: "k-Means = Mean (artificial) | k-Medoids = Medoid (actual data point).",
    keywords: ["kmedoids", "pam", "medoid", "actual data point", "robust to outliers"]
  }
];
