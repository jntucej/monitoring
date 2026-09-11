import type { StudyUnit } from "../../types";

export const UNITS_CONFIG: Record<"I" | "II" | "III" | "IV" | "V", StudyUnit> = {
  I: {
    id: "ml-unit-1",
    unitNumber: "I",
    title: "Unit I — Foundations & Feature Engineering",
    subtitle: "Introduction, Data Types, Pre-processing & PCA",
    description: "Machine Learning concepts, E-T-P framework, Data Preprocessing pipeline, Feature Selection & Principal Component Analysis.",
    categories: [
      {
        name: "🎯 Core Syllabus Topics",
        topicIds: ["introduction", "human-learning", "what-is-ml", "ml-types", "ml-activities", "applications"]
      },
      {
        name: "🎯 Model Preparation & Pre-processing",
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
        name: "🎯 Feature Engineering & PCA",
        topicIds: ["feature-engineering", "feature-transformation", "feature-subset-selection", "pca"]
      }
    ]
  },
  II: {
    id: "ml-unit-2",
    unitNumber: "II",
    title: "Unit II — Supervised Learning",
    subtitle: "Regression, Classification & MLE",
    description: "Linear, Polynomial & Logistic Regression, MLE parameter estimation, Naïve Bayes, kNN, Decision Trees, SVM & Random Forest.",
    categories: [
      {
        name: "🎯 Core Regression",
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
        name: "🎯 Core Classification",
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
    id: "ml-unit-3",
    unitNumber: "III",
    title: "Unit III — Unsupervised Learning",
    subtitle: "Clustering & Density-Based Methods",
    description: "Partitioning (k-Means, k-Medoids), Hierarchical Clustering (Dendrograms), and Density-Based Spatial Clustering (DBSCAN).",
    categories: [
      {
        name: "🎯 Core Unsupervised Foundations",
        topicIds: ["unsupervised-learning-intro", "supervised-vs-unsupervised", "clustering-intro"]
      },
      {
        name: "🎯 Core Clustering Algorithms",
        topicIds: ["kmeans", "kmedoids", "hierarchical-clustering", "dbscan"]
      }
    ]
  },
  IV: {
    id: "ml-unit-4",
    unitNumber: "IV",
    title: "Unit IV — Artificial Neural Networks",
    subtitle: "Biological vs Artificial Neuron, Perceptron, Backpropagation",
    description: "Biological vs Artificial Neurons, Activation Functions & Derivatives, Perceptron Learning Rule, ANN Architectures, Backpropagation equations & worked numericals.",
    categories: [
      {
        name: "🎯 Core Neuron & Perceptron Topics",
        topicIds: [
          "biological-vs-artificial-neuron",
          "artificial-neuron-model",
          "activation-functions",
          "ann-architectures",
          "perceptron",
          "perceptron-learning-rule",
          "perceptron-numerical"
        ]
      },
      {
        name: "🎯 Core Backpropagation Topics",
        topicIds: [
          "ann-learning-process",
          "backpropagation",
          "backpropagation-numerical"
        ]
      },
      {
        name: "📚 Supporting Topics",
        topicIds: [
          "softmax-cross-entropy",
          "sgd-minibatch"
        ]
      }
    ]
  },
  V: {
    id: "ml-unit-5",
    unitNumber: "V",
    title: "Unit V — Advanced ML & Applications",
    subtitle: "Deep Learning, Reinforcement Learning & Case Studies",
    description: "Deep Learning foundations, Reinforcement Learning (Agent, Environment, MDP, Rewards), and 4 Industry Case Studies (Image, Speech, Spam, Fraud).",
    categories: [
      {
        name: "🎯 Core Advanced ML Topics",
        topicIds: [
          "deep-learning-intro",
          "reinforcement-learning-intro"
        ]
      },
      {
        name: "🎯 Core Case Studies",
        topicIds: [
          "case-study-image-recognition",
          "case-study-speech-recognition",
          "case-study-spam-filtering",
          "case-study-fraud-detection"
        ]
      },
      {
        name: "📚 Supporting Topics",
        topicIds: [
          "q-learning"
        ]
      }
    ]
  }
};

