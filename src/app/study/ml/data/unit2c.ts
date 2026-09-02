import type { CheatTopic } from "./types";

export const unit2cTopics: CheatTopic[] = [
  {
    id: "naive-bayes",
    title: "Naïve Bayes Classifier",
    unit: "II",
    category: "Classification",
    importance: "HIGH",
    definition: "Probabilistic classifier based on Bayes' Theorem with the naive assumption of conditional independence between features.",
    coreIdea: "P(Y|X) ∝ P(Y) × ∏ P(xᵢ|Y). Predict class with highest posterior probability.",
    visual: {
      type: "flow",
      data: ["Input Features (x₁, x₂...)", "Calculate Class Priors P(Y)", "Calculate Feature Likelihoods P(xᵢ|Y)", "Bayes Theorem", "Posterior Probability P(Y|X)", "Highest Probability Class"]
    },
    formula: {
      expression: "P(Y | X) = [ P(X | Y) · P(Y) ] / P(X)  |  P(Y|x₁..xₙ) ∝ P(Y) · ∏ P(xᵢ|Y)",
      symbols: { "P(Y|X)": "Posterior probability", "P(X|Y)": "Likelihood", "P(Y)": "Prior probability", "P(X)": "Evidence" },
      use: "Fast text classification, spam filtering, sentiment analysis.",
      examNote: "Naïve Assumption: All features xᵢ are conditionally independent given class Y."
    },
    keyPoints: [
      "Naïve Assumption simplifies computation drastically: P(x₁,x₂|Y) = P(x₁|Y) · P(x₂|Y).",
      "Zero-Frequency Problem: If a feature value never appears with a class in training data, P(xᵢ|Y) = 0.",
      "Solution to Zero Frequency: Laplace Smoothing (add +1 to numerator, +K to denominator)."
    ],
    examPoints: [
      "Bayes Theorem: Posterior = (Likelihood × Prior) / Evidence.",
      "Why Naïve? Assumes features are conditionally independent given class Y.",
      "Laplace Smoothing fixes zero probability issue."
    ],
    memoryTrigger: "Bayes Theorem + Conditional Independence + Laplace Smoothing.",
    keywords: ["naive bayes", "bayes theorem", "prior", "posterior", "likelihood", "laplace smoothing"]
  },
  {
    id: "knn",
    title: "k-Nearest Neighbour (kNN)",
    unit: "II",
    category: "Classification",
    importance: "HIGH",
    definition: "Non-parametric lazy learning algorithm that classifies a query instance based on the majority class vote among its k closest neighbours.",
    coreIdea: "Query Point ★ → Calculate Distance to all points → Find K nearest neighbours → Majority Vote → Assign Class.",
    visual: {
      type: "flow",
      data: ["New Input Point ★", "Compute Distances (Euclidean / Manhattan)", "Sort & Select K Nearest Points", "Majority Vote (Classification) / Average (Regression)", "Assigned Class Label"]
    },
    formula: {
      expression: "Euclidean Distance: d(p, q) = √[ ∑ (pᵢ - qᵢ)² ]  |  Manhattan: d(p, q) = ∑ |pᵢ - qᵢ|",
      use: "Distance calculation between query point and training data points.",
      examNote: "kNN is a LAZY learner (no explicit training step; stores all data in memory)."
    },
    keyPoints: [
      "Lazy Learning: Zero training time, but high prediction/search latency O(N).",
      "Choice of k: Small k (e.g. k=1) → Sensitive to noise/overfitting. Large k → Smoother boundary/underfitting.",
      "Distance metrics: Euclidean (L2 norm), Manhattan (L1 norm), Minkowski.",
      "Requires Feature Scaling! Without scaling, features with large ranges dominate distance."
    ],
    examPoints: [
      "kNN is a Lazy & Non-parametric learner.",
      "Small k = High variance (Overfitting); Large k = High bias (Underfitting).",
      "Feature scaling is MANDATORY before running kNN."
    ],
    memoryTrigger: "kNN = Lazy learner + Distance metric + K nearest majority vote.",
    keywords: ["knn", "k nearest neighbours", "euclidean", "manhattan", "lazy learner", "majority vote"]
  },
  {
    id: "decision-tree",
    title: "Decision Tree",
    unit: "II",
    category: "Classification",
    importance: "HIGH",
    definition: "Tree-structured classifier that recursively splits data on feature thresholds to maximize node purity.",
    coreIdea: "Root Node → Feature Test → Branches → Child Nodes → Leaf Node (Prediction).",
    visual: {
      type: "decision-tree",
      data: {
        root: "Age < 30?",
        left: { root: "Income High?", left: "Class A", right: "Class B" },
        right: "Class B"
      }
    },
    formula: {
      expression: "Entropy: H(S) = - ∑ pᵢ log₂ (pᵢ)  |  Gini Impurity: Gini(S) = 1 - ∑ pᵢ²  |  Info Gain = H(S) - H(S|A)",
      symbols: { "pᵢ": "Probability of class i in node", "H(S)": "Entropy (Measure of impurity)" },
      use: "Select best feature split at each decision node.",
      examNote: "Information Gain selects feature that maximizes entropy reduction."
    },
    keyPoints: [
      "Root Node: Top decision node representing full dataset.",
      "Internal Nodes: Decision tests on specific features.",
      "Leaf Nodes: Terminal nodes containing class predictions (no further splits).",
      "Splitting Criteria: Entropy & Information Gain (ID3, C4.5) or Gini Impurity (CART).",
      "Overfitting Mitigation: Pre-pruning (max depth, min samples) or Post-pruning."
    ],
    examPoints: [
      "Entropy H(S) = 0 for pure node; H(S) = 1 for equal 50/50 split.",
      "Gini Impurity = 1 - ∑ pᵢ² (CART algorithm).",
      "Trees are white-box interpretable but prone to severe overfitting."
    ],
    memoryTrigger: "Entropy = Impurity | Info Gain = Best split | Leaf = Class label.",
    keywords: ["decision tree", "entropy", "gini impurity", "information gain", "root", "leaf", "pruning"]
  }
];
