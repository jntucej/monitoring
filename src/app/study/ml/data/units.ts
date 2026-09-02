import type { UnitSpec } from "./types";

export const UNITS_CONFIG: Record<"I" | "II" | "III", UnitSpec> = {
  I: {
    id: "I",
    title: "Unit I — Foundations & Feature Engineering",
    subtitle: "Introduction, Data Types, Pre-processing & PCA",
    description: "Machine Learning concepts, E-T-P framework, Data Preprocessing pipeline, Feature Selection & Principal Component Analysis.",
    categories: [
      {
        name: "Introduction",
        topicIds: ["introduction", "human-learning", "what-is-ml", "ml-types", "ml-activities", "applications"]
      },
      {
        name: "Model Preparation",
        topicIds: [
          "data-types",
          "data-structure",
          "preprocessing",
          "model-selection-training",
          "model-representation-interpretability",
          "model-evaluation",
          "performance-enhancement"
        ]
      },
      {
        name: "Feature Engineering",
        topicIds: ["feature-engineering", "feature-transformation", "feature-subset-selection", "pca"]
      }
    ]
  },
  II: {
    id: "II",
    title: "Unit II — Supervised Learning",
    subtitle: "Regression, Classification & MLE",
    description: "Linear, Polynomial & Logistic Regression, MLE parameter estimation, Naïve Bayes, kNN, Decision Trees, SVM & Random Forest.",
    categories: [
      {
        name: "Supervised & Regression",
        topicIds: [
          "supervised-learning-intro",
          "regression-intro",
          "simple-linear-regression",
          "multiple-linear-regression",
          "polynomial-regression",
          "logistic-regression",
          "mle"
        ]
      },
      {
        name: "Classification",
        topicIds: [
          "classification-intro",
          "naive-bayes",
          "knn",
          "decision-tree",
          "svm",
          "random-forest"
        ]
      }
    ]
  },
  III: {
    id: "III",
    title: "Unit III — Unsupervised Learning",
    subtitle: "Clustering & Density-Based Methods",
    description: "Partitioning (k-Means, k-Medoids), Hierarchical Clustering (Dendrograms), and Density-Based Spatial Clustering (DBSCAN).",
    categories: [
      {
        name: "Unsupervised Foundations",
        topicIds: ["unsupervised-learning-intro", "supervised-vs-unsupervised", "clustering-intro"]
      },
      {
        name: "Clustering Algorithms",
        topicIds: ["kmeans", "kmedoids", "hierarchical-clustering", "dbscan"]
      }
    ]
  }
};
