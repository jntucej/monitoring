import type { CheatTopic } from "./types";

export const unit3cTopics: CheatTopic[] = [
  {
    id: "hierarchical-clustering",
    title: "Hierarchical Clustering",
    unit: "III",
    category: "Clustering",
    importance: "HIGH",
    definition: "Clustering technique that constructs a nested tree of clusters called a Dendrogram without requiring prior specification of cluster count K.",
    coreIdea: "Agglomerative (Bottom-up: merge closest pairs) vs Divisive (Top-down: split recursively).",
    visual: {
      type: "dendrogram",
      data: ["Leaf Data Points (A, B, C, D)", "Merge Closest (A+B), (C+D)", "Merge Root Cluster", "Cut Dendrogram Horizontally at desired threshold"]
    },
    keyPoints: [
      "Agglomerative: Starts with N individual single-point clusters → iteratively merges closest pair until 1 root cluster remains.",
      "Divisive: Starts with 1 all-inclusive cluster → recursively splits until N single-point clusters remain.",
      "Linkage Criteria: Single Linkage (Min distance), Complete Linkage (Max distance), Average Linkage (Mean distance), Ward's Linkage (Min variance).",
      "Dendrogram: Tree diagram representing cluster hierarchy. Cut line determines K."
    ],
    examPoints: [
      "Agglomerative = Bottom-Up | Divisive = Top-Down.",
      "Dendrogram is a tree diagram visualising hierarchical cluster merges.",
      "No need to specify K beforehand — cut dendrogram at chosen height."
    ],
    memoryTrigger: "Agglomerative (Bottom-Up) | Divisive (Top-Down) | Cut Dendrogram for K.",
    keywords: ["hierarchical", "dendrogram", "agglomerative", "divisive", "linkage", "bottom up"]
  },
  {
    id: "dbscan",
    title: "DBSCAN",
    unit: "III",
    category: "Clustering",
    importance: "HIGH",
    definition: "Density-Based Spatial Clustering of Applications with Noise. Groups closely packed points into clusters based on density and identifies noise points.",
    coreIdea: "Clusters are dense regions of points separated by low-density areas. Handles arbitrary shapes and detects noise.",
    visual: {
      type: "dbscan",
      data: ["Core Point (●: ≥ MinPts within ε)", "Border Point (○: Within ε of Core, but < MinPts)", "Noise Point (×: Neither Core nor Border)"]
    },
    formula: {
      expression: "ε-Neighbourhood: N_ε(p) = { q ∈ D | dist(p, q) ≤ ε }",
      symbols: { "ε": "Epsilon (Neighbourhood radius)", "MinPts": "Minimum points to form dense core node" },
      use: "Density-based cluster discovery for arbitrary non-spherical shapes.",
      examNote: "DBSCAN automatically discovers the number of clusters and labels noise points (outliers)."
    },
    keyPoints: [
      "Core Point (●): Has at least MinPts within its ε-neighbourhood radius.",
      "Border Point (○): Lies within ε-radius of a Core Point, but has fewer than MinPts itself.",
      "Noise Point (×): Neither a Core Point nor a Border Point (Outlier).",
      "Density-Reachable: Path of Core Points connecting a point to a cluster."
    ],
    examPoints: [
      "DBSCAN requires 2 parameters: ε (epsilon radius) and MinPts (minimum points).",
      "Discovers arbitrary shapes (e.g. concentric circles) unlike k-Means.",
      "Explicitly identifies and labels Noise / Outlier points."
    ],
    memoryTrigger: "DBSCAN = Core (●), Border (○), Noise (×) | Parameters: ε & MinPts.",
    keywords: ["dbscan", "density", "epsilon", "minpts", "core point", "border point", "noise", "outliers"]
  }
];
