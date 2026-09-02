import type { CheatTopic } from "./types";

export const unit1dTopics: CheatTopic[] = [
  {
    id: "feature-engineering",
    title: "Feature Engineering",
    unit: "I",
    category: "Feature Engineering",
    importance: "HIGH",
    definition: "The process of creating, transforming, or selecting useful input features to maximize ML algorithm performance.",
    coreIdea: "Transforms raw data domain attributes into features that better expose signals to models.",
    visual: {
      type: "flow",
      data: ["RAW FEATURES", "Feature Engineering", "Transformation", "Subset Selection", "PCA (Reduction)"]
    },
    keyPoints: [
      "Feature Transformation: Modifying existing representations (scaling, log transform, encoding).",
      "Feature Selection: Subsetting the most informative original features.",
      "Feature Extraction: Constructing new low-dimensional features (e.g. PCA)."
    ],
    examPoints: [
      "Definition: Creating, transforming or selecting features to improve model performance.",
      "Good feature engineering often beats complex model architectures."
    ],
    memoryTrigger: "Feature Engineering = Transform + Select + Extract signal.",
    keywords: ["feature engineering", "raw features", "transformation", "selection", "extraction"]
  },
  {
    id: "feature-transformation",
    title: "Feature Transformation",
    unit: "I",
    category: "Feature Engineering",
    importance: "HIGH",
    definition: "Mathematical functions applied to features to normalize distributions or change representation.",
    coreIdea: "Scaling (Min-Max / Z-score) + Encoding (One-Hot / Label) + Non-linear transforms (Log / Power).",
    formula: {
      expression: "Standardization: z = (x - μ) / σ  |  Min-Max: x' = (x - min) / (max - min)",
      use: "Rescale feature ranges before training distance-sensitive algorithms.",
      examNote: "Z-score handles outliers better than Min-Max."
    },
    keyPoints: [
      "Min-Max Normalization: Rescales values to range [0, 1]. Sensitive to outliers.",
      "Z-score Standardization: Rescales to mean=0, std=1. Robust to outliers.",
      "Log Transformation: Squeezes right-skewed data distributions into normal-like curves.",
      "One-Hot Encoding: Converts K categories into K binary indicator columns."
    ],
    examPoints: [
      "Why scale? Distance-based algorithms (kNN, SVM, Gradient Descent) fail if features have wildly different scales."
    ],
    memoryTrigger: "Min-Max = [0,1] range | Z-score = Mean 0, Std 1 | Log = Fix skewness.",
    keywords: ["scaling", "z-score", "min-max", "log transform", "standardization"]
  },
  {
    id: "feature-subset-selection",
    title: "Feature Subset Selection",
    unit: "I",
    category: "Feature Engineering",
    importance: "HIGH",
    definition: "Selecting a subset of relevant features for use in model construction by removing redundant or noisy attributes.",
    coreIdea: "Reduces overfitting, improves accuracy, speeds up training, and enhances interpretability.",
    visual: {
      type: "flow",
      data: ["Full Feature Set (F1..F6)", "Relevance Evaluation", "Filter / Wrapper / Embedded", "Selected Subset (F1, F3, F6)"]
    },
    keyPoints: [
      "Filter Methods: Fast, independent of ML model (e.g. Pearson correlation, Chi-Square, Information Gain).",
      "Wrapper Methods: Evaluates feature subsets using an ML model as evaluator (e.g. Forward Selection, Backward Elimination).",
      "Embedded Methods: Feature selection built directly into model training (e.g. L1 Lasso Regularization, Decision Tree importance)."
    ],
    examPoints: [
      "Filter = Fast, Model-agnostic.",
      "Wrapper = Computationally expensive, Model-specific, Higher accuracy.",
      "Embedded = Performs selection during training (Lasso L1)."
    ],
    memoryTrigger: "Filter = Stat test | Wrapper = Train model iteratively | Embedded = Built-in (Lasso).",
    keywords: ["filter", "wrapper", "embedded", "subset selection", "forward selection", "lasso"]
  },
  {
    id: "pca",
    title: "Principal Component Analysis (PCA)",
    unit: "I",
    category: "Feature Engineering",
    importance: "HIGH",
    definition: "An unsupervised linear dimensionality reduction technique that projects data onto orthogonal axes of maximum variance.",
    coreIdea: "High-dimensional data → Covariance Matrix → Eigenvectors/Eigenvalues → Top K Principal Components.",
    visual: {
      type: "pipeline",
      data: ["HIGH-DIMENSION DATA", "CENTER DATA (Standardize)", "COVARIANCE MATRIX", "EIGEN-DECOMPOSITION", "RANK COMPONENTS (Eigenvalues)", "SELECT TOP K COMPONENTS", "LOW-DIMENSION REPRESENTATION"]
    },
    formula: {
      expression: "Covariance Matrix Σ = (1/n) XᵀX  |  Eigen equation: Σv = λv",
      symbols: { "v": "Eigenvector (Principal Direction)", "λ": "Eigenvalue (Variance magnitude)" },
      use: "Projects N features down to K features (K < N) while preserving maximum variance.",
      examNote: "Always standardize data before PCA! PCA is sensitive to variance scaling."
    },
    keyPoints: [
      "Unsupervised method (ignores class labels).",
      "PC1: Direction of maximum variance in the data.",
      "PC2: Direction of second highest variance, strictly orthogonal (90°) to PC1.",
      "Eigenvalues (λ) represent the amount of variance captured by each PC."
    ],
    examPoints: [
      "PCA reduces dimensionality, removes correlation, and mitigates Curse of Dimensionality.",
      "Disadvantage: New features (components) are linear combinations and lack direct interpretability."
    ],
    memoryTrigger: "PCA = Standardize → Covariance → Eigenvectors → Max Variance Projection.",
    keywords: ["pca", "eigenvalues", "eigenvectors", "covariance", "dimensionality reduction", "variance"]
  }
];
