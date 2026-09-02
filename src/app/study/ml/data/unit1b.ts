import type { CheatTopic } from "./types";

export const unit1bTopics: CheatTopic[] = [
  {
    id: "ml-activities",
    title: "Machine Learning Activities",
    unit: "I",
    category: "Introduction",
    importance: "MEDIUM",
    definition: "The end-to-end lifecycle activities required to build, deploy, and maintain an ML system.",
    coreIdea: "Continuous pipeline from data ingestion to model deployment and monitoring.",
    visual: {
      type: "pipeline",
      data: ["DATA", "PREPROCESS", "FEATURES", "TRAIN", "MODEL", "EVALUATE", "PREDICT"]
    },
    keyPoints: [
      "Data Collection & Understanding.",
      "Data Cleaning & Feature Engineering.",
      "Model Selection, Training & Validation.",
      "Deployment & Real-time Monitoring."
    ],
    examPoints: [
      "List the sequential pipeline steps in order.",
      "Highlight evaluation on held-out test data."
    ],
    memoryTrigger: "Data → Preprocess → Feature → Train → Model → Evaluate → Predict.",
    keywords: ["activities", "pipeline", "lifecycle", "stages"]
  },
  {
    id: "applications",
    title: "ML Applications",
    unit: "I",
    category: "Introduction",
    importance: "MEDIUM",
    definition: "Real-world domain implementations of machine learning models.",
    coreIdea: "ML powers automation across vision, language, medical, and financial domains.",
    keyPoints: [
      "Healthcare: Disease diagnosis from MRI/X-ray scans.",
      "Finance: Credit scoring, algorithmic trading, fraud detection.",
      "E-Commerce: Product recommendation engines, churn prediction.",
      "NLP & Speech: Virtual assistants, language translation, spam filtering.",
      "Vision: Face recognition, autonomous self-driving vehicles."
    ],
    examPoints: [
      "Map domain to ML type (e.g. Spam = Supervised Classification, Customer Segmentation = Unsupervised Clustering)."
    ],
    memoryTrigger: "Healthcare, Finance, Vision, NLP, Robotics, Recommendations.",
    keywords: ["healthcare", "finance", "recommendation", "spam", "fraud", "vision"]
  },
  {
    id: "data-types",
    title: "Types of Data",
    unit: "I",
    category: "Model Preparation",
    importance: "HIGH",
    definition: "Categorization of data attributes that determines appropriate preprocessing and modeling choices.",
    coreIdea: "Numerical (Quantitative) vs Categorical (Qualitative) vs Unstructured.",
    visual: {
      type: "tree",
      data: {
        root: "DATA TYPES",
        branches: [
          { name: "Numerical", sub: ["Discrete (Counts: 1, 2, 3)", "Continuous (Measurements: 5.4, 7.2)"] },
          { name: "Categorical", sub: ["Nominal (No Order: Red, Blue)", "Ordinal (Ordered: Low, Med, High)"] },
          { name: "Unstructured", sub: ["Text", "Image", "Audio", "Time-series"] }
        ]
      }
    },
    keyPoints: [
      "Discrete: Finite or countable values (e.g., number of students).",
      "Continuous: Infinite possible values within a range (e.g., height, temperature).",
      "Nominal: Discrete categories with no natural ranking (e.g., Gender, Color).",
      "Ordinal: Categorical values with a meaningful order/ranking (e.g., Ratings: 1 to 5 stars)."
    ],
    examPoints: [
      "Nominal has NO order; Ordinal HAS order.",
      "Discrete = counts; Continuous = measurements."
    ],
    memoryTrigger: "Numerical = numbers; Categorical = labels (Nominal = no order, Ordinal = ordered).",
    keywords: ["discrete", "continuous", "nominal", "ordinal", "numerical", "categorical"]
  },
  {
    id: "data-structure",
    title: "Exploring Structure of Data",
    unit: "I",
    category: "Model Preparation",
    importance: "MEDIUM",
    definition: "Exploratory Data Analysis (EDA) to understand feature distributions, correlations, and anomalies.",
    coreIdea: "Understand data statistics, dimensions, missingness, and cardinality before modeling.",
    keyPoints: [
      "Summary Statistics: Mean, Median, Mode, Variance, Standard Deviation.",
      "Data Shape: Matrix dimensions (N samples × D features).",
      "Correlation Matrix: Measures linear relationships between feature pairs.",
      "Visualization: Histograms, scatter plots, box plots."
    ],
    examPoints: [
      "EDA identifies missing values, outliers, and feature skewness.",
      "Correlation check prevents multicollinearity."
    ],
    memoryTrigger: "Inspect shape, statistics, distributions, and correlations first.",
    keywords: ["eda", "summary statistics", "correlation", "shape", "dimensions"]
  },
  {
    id: "preprocessing",
    title: "Data Pre-processing",
    unit: "I",
    category: "Model Preparation",
    importance: "HIGH",
    definition: "The pipeline of techniques used to clean raw data and transform it into a model-ready format.",
    coreIdea: "Clean → Impute → Remove Outliers → Encode → Scale → Split.",
    visual: {
      type: "pipeline",
      data: ["RAW DATA", "Clean", "Handle Missing Values", "Remove/Handle Outliers", "Encode Categorical Data", "Scale / Normalize", "Train-Test Split", "READY DATA"]
    },
    keyPoints: [
      "Missing Values: Imputation (mean/median/mode) or dropping rows.",
      "Outliers: Z-score method (>3σ) or IQR method (1.5 × IQR).",
      "Categorical Encoding: One-Hot Encoding (nominal) or Label Encoding (ordinal).",
      "Feature Scaling: Normalization (Min-Max [0,1]) or Standardization (Z-score mean=0, std=1)."
    ],
    examPoints: [
      "Standardization: z = (x - μ) / σ (Mean=0, Std=1).",
      "Min-Max Normalization: x' = (x - min) / (max - min).",
      "One-Hot Encoding avoids implicit ordinal bias in nominal features."
    ],
    memoryTrigger: "Clean → Impute → Encode → Scale → Split.",
    keywords: ["imputation", "outliers", "one-hot", "label encoding", "normalization", "standardization"]
  }
];
