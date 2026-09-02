import type { CheatTopic } from "./types";

export const unit2dTopics: CheatTopic[] = [
  {
    id: "svm",
    title: "Support Vector Machines (SVM)",
    unit: "II",
    category: "Classification",
    importance: "HIGH",
    definition: "Max-margin classifier that finds an optimal decision hyperplane maximizing the margin distance to nearest support vector data points.",
    coreIdea: "Class A ● | Margin | Class B ▲ -> Optimal Hyperplane maximizes margin width (2 / ||w||).",
    visual: {
      type: "svm",
      data: ["Class A (●)", "Margin (Distance = 2 / ||w||)", "Optimal Hyperplane (WᵀX + b = 0)", "Support Vectors (Critical boundary points)", "Class B (▲)"]
    },
    formula: {
      expression: "Hyperplane: WᵀX + b = 0  |  Margin Width: 2 / ||w||  |  Kernel Trick: K(x, z) = Φ(x)ᵀ Φ(z)",
      symbols: { "W": "Weight vector orthogonal to hyperplane", "b": "Bias", "K(x,z)": "Kernel function" },
      use: "Finds optimal separating boundary in original or higher-dimensional space.",
      examNote: "Support vectors are data points lying directly on the margin boundaries."
    },
    keyPoints: [
      "Optimal Hyperplane: Maximizes margin width = 2 / ||w||.",
      "Support Vectors: Data points closest to hyperplane that define the margin.",
      "Hard Margin: Strictly separable data. Soft Margin: Allows slack variables (C parameter) for noisy data.",
      "Kernel Trick: Implicitly maps non-linear data to higher dimensions without computing explicit coordinates (RBF, Polynomial, Linear kernels)."
    ],
    examPoints: [
      "SVM objective: Maximize Margin Width = 2 / ||w||.",
      "Support Vectors anchor the decision boundary (removing other points changes nothing!).",
      "Kernel trick enables non-linear classification efficiently."
    ],
    memoryTrigger: "SVM = Maximize Margin + Support Vectors + Kernel Trick.",
    keywords: ["svm", "hyperplane", "margin", "support vectors", "kernel trick", "rbf"]
  },
  {
    id: "random-forest",
    title: "Random Forest",
    unit: "II",
    category: "Classification",
    importance: "HIGH",
    definition: "An ensemble learning method that constructs a forest of uncorrelated decision trees using Bagging and random feature selection.",
    coreIdea: "Data → Bootstrap Aggregation (Bagging) → N Decision Trees → Majority Vote → Robust Final Prediction.",
    visual: {
      type: "rf",
      data: ["Original Dataset", "Bootstrap Subsets", "Tree 1 (Feature subset)", "Tree 2 (Feature subset)", "Tree 3 (Feature subset)", "Majority Vote", "Final Class Prediction"]
    },
    keyPoints: [
      "Ensemble Paradigm: Combines multiple weak decision tree models into a robust strong predictor.",
      "Bagging (Bootstrap Aggregation): Samples data with replacement for each tree.",
      "Random Feature Selection: Selects a random subset of √D features at each node split to de-correlate trees.",
      "Final Prediction: Majority voting (classification) or mean average (regression)."
    ],
    examPoints: [
      "Random Forest combines Bagging (data bootstrap) + Random Feature Subset Selection.",
      "Dramatically reduces Variance compared to individual Decision Trees.",
      "Out-of-Bag (OOB) error estimates generalization without separate validation set."
    ],
    memoryTrigger: "Random Forest = Bagging + Random Feature Subsets + Majority Voting.",
    keywords: ["random forest", "ensemble", "bagging", "bootstrap", "majority vote", "variance reduction"]
  }
];
