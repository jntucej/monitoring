import type { CheatTopic } from "./types";

export const unit2aTopics: CheatTopic[] = [
  {
    id: "supervised-learning-intro",
    title: "Supervised Learning Overview",
    unit: "II",
    category: "Supervised Learning",
    importance: "HIGH",
    definition: "Learning paradigm where the algorithm is provided with input features X and corresponding ground-truth target labels Y.",
    coreIdea: "Learn mapping function ŷ = f(X) that minimizes prediction error on target Y.",
    visual: {
      type: "tree",
      data: {
        root: "SUPERVISED LEARNING",
        branches: [
          { name: "Regression", sub: ["Continuous Targets", "SLR, MLR, Polynomial"] },
          { name: "Classification", sub: ["Discrete Class Labels", "Logistic, Naïve Bayes, kNN, DT, SVM, RF"] }
        ]
      }
    },
    keyPoints: [
      "Regression: Target Y is a continuous numerical value (e.g. Price, Temperature).",
      "Classification: Target Y is a categorical class label (e.g. Spam/Ham, Malignant/Benign)."
    ],
    examPoints: [
      "Regression predicts continuous quantities; Classification predicts discrete class labels."
    ],
    memoryTrigger: "Labeled Data → Mapping Y = f(X) → Regression or Classification.",
    keywords: ["supervised", "labeled", "target", "mapping", "continuous", "discrete"]
  },
  {
    id: "regression-intro",
    title: "Regression Overview",
    unit: "II",
    category: "Regression",
    importance: "HIGH",
    definition: "Supervised learning models used to predict continuous quantitative dependent variables based on independent feature inputs.",
    coreIdea: "Fit a mathematical curve / line that minimizes the sum of squared prediction errors.",
    keyPoints: [
      "Simple Linear Regression: 1 Independent Feature (X).",
      "Multiple Linear Regression: >1 Independent Features (X₁, X₂... Xₙ).",
      "Polynomial Regression: Non-linear features (X, X²...) with linear parameters.",
      "Logistic Regression: Produces probability outputs for classification tasks."
    ],
    examPoints: [
      "Linear & Polynomial Regression predict continuous numbers.",
      "Note: Logistic Regression is primarily a Classification algorithm despite the name 'Regression'."
    ],
    memoryTrigger: "Regression = Continuous output prediction.",
    keywords: ["regression", "continuous", "fitting", "linear", "logistic"]
  },
  {
    id: "simple-linear-regression",
    title: "Simple Linear Regression",
    unit: "II",
    category: "Regression",
    importance: "HIGH",
    definition: "Modelling the linear relationship between a single independent variable X and a continuous target variable Y.",
    coreIdea: "Fit best-fit straight line ŷ = b₀ + b₁x minimizing Ordinary Least Squares (OLS) residual error.",
    visual: {
      type: "graph",
      data: {
        equation: "ŷ = b₀ + b₁x",
        label: "b₀ = Y-intercept | b₁ = Slope (Weight)"
      }
    },
    formula: {
      expression: "ŷ = b₀ + b₁x  |  b₁ = Σ(x - x̄)(y - ȳ) / Σ(x - x̄)²  |  b₀ = ȳ - b₁x̄",
      symbols: { "b₀": "Y-intercept", "b₁": "Slope coefficient", "x": "Input feature", "ŷ": "Predicted target" },
      use: "Finds optimal straight line that minimizes Sum of Squared Errors (SSE = ∑(y - ŷ)²).",
      examNote: "b₁ represents the change in Y for a 1-unit change in X."
    },
    keyPoints: [
      "Assumption: Linear relationship between X and Y.",
      "Residual / Error: eᵢ = yᵢ - ŷᵢ (Distance between actual data point and line).",
      "Cost Function: MSE = (1/N) ∑ (yᵢ - (b₀ + b₁xᵢ))²."
    ],
    examPoints: [
      "b₀ is the intercept (value when x=0); b₁ is the slope.",
      "Ordinary Least Squares (OLS) closed-form solution computes b₀ and b₁ directly."
    ],
    memoryTrigger: "ŷ = b₀ + b₁x → Minimize sum of squared residuals.",
    keywords: ["simple linear regression", "ols", "intercept", "slope", "residuals", "least squares"]
  },
  {
    id: "multiple-linear-regression",
    title: "Multiple Linear Regression",
    unit: "II",
    category: "Regression",
    importance: "HIGH",
    definition: "Extends linear regression to model relationships between multiple independent features (X₁, X₂... Xₙ) and target Y.",
    coreIdea: "Hypothesis is a high-dimensional hyperplane ŷ = b₀ + b₁x₁ + b₂x₂ + ... + bₙxₙ.",
    visual: {
      type: "pipeline",
      data: ["X₁", "X₂", "X₃", "Xₙ"]
    },
    formula: {
      expression: "ŷ = b₀ + b₁x₁ + b₂x₂ + ... + bₙxₙ  |  Matrix form: Y = XW + ε",
      symbols: { "b₀": "Intercept", "bᵢ": "Partial regression coefficients", "xᵢ": "Feature inputs" },
      use: "Fits a hyperplane to multi-feature continuous prediction tasks.",
      examNote: "Closed form solution: W = (XᵀX)⁻¹ XᵀY."
    },
    keyPoints: [
      "Partial Coefficients (bᵢ): Impact of feature xᵢ holding all other features constant.",
      "Multicollinearity: High correlation between independent features inflates variance of coefficients.",
      "Evaluated using Adjusted R² (penalizes adding uninformative features)."
    ],
    examPoints: [
      "Simple = 1 input feature; Multiple = N input features.",
      "Multicollinearity is a major issue — check VIF or use Lasso/Ridge."
    ],
    memoryTrigger: "Multiple features → Hyperplane ŷ = b₀ + ∑ bᵢxᵢ.",
    keywords: ["multiple linear regression", "hyperplane", "multicollinearity", "adjusted r2"]
  }
];
