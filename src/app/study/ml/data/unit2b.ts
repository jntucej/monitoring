import type { CheatTopic } from "./types";

export const unit2bTopics: CheatTopic[] = [
  {
    id: "polynomial-regression",
    title: "Polynomial Regression",
    unit: "II",
    category: "Regression",
    importance: "HIGH",
    definition: "Form of regression modelling non-linear relationships by creating polynomial powers of input features (X, X², X³...).",
    coreIdea: "Non-linear in features (curved line), but still linear in parameters bᵢ.",
    visual: {
      type: "flow",
      data: ["Feature X", "Power Expansion (X, X², X³)", "Multiple Linear Regression Model", "Curved Fit Prediction"]
    },
    formula: {
      expression: "ŷ = b₀ + b₁x + b₂x² + b₃x³ + ... + bₙxⁿ",
      use: "Fits curved non-linear patterns in data.",
      examNote: "High degree n leads to severe overfitting!"
    },
    keyPoints: [
      "Transforms original feature x into polynomial space [1, x, x², x³...].",
      "Model remains linear with respect to coefficients bᵢ.",
      "Degree Selection: Degree 1 = Linear; Degree 2 = Quadratic; High degree = Overfitting."
    ],
    examPoints: [
      "Polynomial Regression is a linear model because it is linear in parameters bᵢ.",
      "High polynomial degree causes high variance and overfitting."
    ],
    memoryTrigger: "Expand features to powers (x, x²) → Fit curved line.",
    keywords: ["polynomial", "degree", "non-linear", "powers", "overfitting"]
  },
  {
    id: "logistic-regression",
    title: "Logistic Regression",
    unit: "II",
    category: "Regression",
    importance: "HIGH",
    definition: "Classification model that predicts the probability of a binary categorical target using the Sigmoid activation function.",
    coreIdea: "Linear combination z = WᵀX + b → Sigmoid σ(z) → Probability P ∈ [0, 1] → Threshold (0.5) → Binary Class.",
    visual: {
      type: "sigmoid",
      data: ["Linear Score z = WᵀX + b", "Sigmoid σ(z) = 1 / (1 + e⁻ᶻ)", "Probability P ∈ [0, 1]", "Threshold 0.5", "Class Label (0 or 1)"]
    },
    formula: {
      expression: "σ(z) = 1 / (1 + e⁻ᶻ)  |  z = b₀ + b₁x₁ + ... + bₙxₙ  |  Loss: Binary Cross-Entropy",
      symbols: { "z": "Log-odds / Linear score", "σ(z)": "Probability output", "e": "Euler's number" },
      use: "Binary classification (e.g. Spam/Not Spam, Fraud/Legit).",
      examNote: "Sigmoid maps (-∞, +∞) to probability range (0, 1)."
    },
    keyPoints: [
      "Log-Odds (Logit): log( p / (1 - p) ) = WᵀX + b.",
      "Decision Boundary: Hyperplane where z = 0 and σ(z) = 0.5.",
      "Optimization: Maximum Likelihood Estimation via Gradient Descent (no closed-form solution)."
    ],
    examPoints: [
      "Logistic Regression is a CLASSIFICATION algorithm, despite its name.",
      "Sigmoid function: σ(z) = 1 / (1 + e⁻ᶻ).",
      "Loss function: Binary Cross-Entropy (Log Loss), NOT Mean Squared Error."
    ],
    memoryTrigger: "Linear score → Sigmoid → Probability → Class boundary at 0.5.",
    keywords: ["logistic regression", "sigmoid", "logit", "log odds", "binary cross entropy", "classification"]
  },
  {
    id: "mle",
    title: "Maximum Likelihood Estimation (MLE)",
    unit: "II",
    category: "Regression",
    importance: "HIGH",
    definition: "A statistical method for estimating parameters of a probability distribution by maximizing the Likelihood function.",
    coreIdea: "Choose parameter values θ that make the observed training data most likely to have occurred.",
    visual: {
      type: "pipeline",
      data: ["OBSERVED DATA", "CHOOSE MODEL PARAMETERS (θ)", "CALCULATE LIKELIHOOD L(θ)", "LOG-LIKELIHOOD ln L(θ)", "MAXIMIZE VIA DERIVATIVE", "OPTIMAL PARAMETERS (θ*)"]
    },
    formula: {
      expression: "L(θ) = ∏ P(xᵢ | θ)  |  Log-Likelihood: ℓ(θ) = ∑ log P(xᵢ | θ)",
      symbols: { "θ": "Model parameters to estimate", "L(θ)": "Likelihood function", "ℓ(θ)": "Log-likelihood" },
      use: "Derives parameter estimation for Logistic Regression and Probability distributions.",
      examNote: "We maximize Log-Likelihood ℓ(θ) because sum of logs is easier to differentiate than product of probabilities."
    },
    keyPoints: [
      "Likelihood L(θ|X) = Probability of observing dataset X given parameters θ.",
      "Log-Likelihood transforms multiplication of probabilities into addition.",
      "Under Gaussian noise assumption, MLE yields identical results to Ordinary Least Squares (OLS)!"
    ],
    examPoints: [
      "MLE selects parameters that maximize the probability of observing the given data.",
      "Log-likelihood simplifies differentiation by turning products into sums."
    ],
    memoryTrigger: "MLE = Find parameters θ that maximize probability of observed data.",
    keywords: ["mle", "maximum likelihood", "log likelihood", "parameters", "probability"]
  },
  {
    id: "classification-intro",
    title: "Classification Overview",
    unit: "II",
    category: "Classification",
    importance: "HIGH",
    definition: "Supervised learning task where the objective is to predict a discrete categorical class label for a given input.",
    coreIdea: "Learn decision boundary separating instances into discrete classes.",
    visual: {
      type: "flow",
      data: ["Training Data (X, Y)", "Learn Decision Boundary / Model", "New Input (X_new)", "Predict Class Label"]
    },
    keyPoints: [
      "Binary Classification: 2 classes (e.g. Yes/No, Spam/Ham).",
      "Multiclass Classification: >2 mutually exclusive classes (e.g. Red/Green/Blue).",
      "Learning Steps: Data Prep → Model Training → Decision Boundary Construction → Class Prediction."
    ],
    examPoints: [
      "Classification predicts discrete labels, whereas Regression predicts continuous values.",
      "Main algorithms: Naïve Bayes, kNN, Decision Trees, SVM, Random Forest."
    ],
    memoryTrigger: "Input X → Classifier → Discrete Class Label Y.",
    keywords: ["classification", "binary", "multiclass", "decision boundary", "classes"]
  }
];
