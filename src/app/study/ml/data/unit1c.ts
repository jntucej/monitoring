import type { CheatTopic } from "./types";

export const unit1cTopics: CheatTopic[] = [
  {
    id: "model-selection-training",
    title: "Model Selection + Training",
    unit: "I",
    category: "Model Preparation",
    importance: "HIGH",
    definition: "Choosing an appropriate model family based on problem type and finding optimal parameters via training.",
    coreIdea: "Train on training set → Tune on validation set → Test on held-out test set.",
    visual: {
      type: "flow",
      data: ["Data", "Train/Val/Test Split", "Select Algorithm", "Train (Parameters)", "Validate (Hyperparameters)", "Final Test Model"]
    },
    keyPoints: [
      "Training set: Used by algorithm to learn parameters (e.g., weights w, bias b).",
      "Validation set: Used to select model architecture and tune hyperparameters.",
      "Test set: Evaluates final generalization performance (never used during training)."
    ],
    examPoints: [
      "Parameters = learned automatically during training (e.g., weights in regression).",
      "Hyperparameters = set manually before training (e.g., k in kNN, learning rate η)."
    ],
    memoryTrigger: "Train set → parameters | Val set → hyperparameters | Test set → final evaluation.",
    keywords: ["parameters", "hyperparameters", "train set", "val set", "test set"]
  },
  {
    id: "model-representation-interpretability",
    title: "Model Representation & Interpretability",
    unit: "I",
    category: "Model Preparation",
    importance: "MEDIUM",
    definition: "How a learned hypothesis is stored and the degree to which a human can understand its decisions.",
    coreIdea: "Trade-off: Simple models are highly interpretable; complex models offer higher accuracy but acts as black boxes.",
    keyPoints: [
      "Linear Model → Coefficients (w₁, w₂). High interpretability.",
      "Decision Tree → IF-THEN decision paths. High interpretability.",
      "kNN → Store training samples. Medium interpretability.",
      "SVM / Neural Nets → Complex decision hyperplanes / weights. Low interpretability (Black box)."
    ],
    examPoints: [
      "Higher model complexity usually decreases interpretability.",
      "Linear models and Decision Trees are white-box models."
    ],
    memoryTrigger: "Linear/Trees = White-box (interpretable); Deep Ensembling = Black-box.",
    keywords: ["representation", "interpretability", "white box", "black box", "coefficients"]
  },
  {
    id: "model-evaluation",
    title: "Model Evaluation",
    unit: "I",
    category: "Model Preparation",
    importance: "HIGH",
    definition: "Quantitative metrics used to measure model predictive accuracy on unseen test data.",
    coreIdea: "Regression uses distance metrics (MSE/R²); Classification uses confusion matrix metrics (Accuracy/Precision/Recall/F1).",
    visual: {
      type: "comparison",
      data: [
        { feature: "Regression", valA: "MSE, RMSE, MAE, R² score", valB: "Continuous targets" },
        { feature: "Classification", valA: "Accuracy, Precision, Recall, F1", valB: "Discrete class labels" }
      ]
    },
    formula: {
      expression: "Precision = TP / (TP + FP)  |  Recall = TP / (TP + FN)  |  F1 = 2 × (P × R) / (P + R)",
      use: "Classification evaluation when classes are imbalanced.",
      examNote: "Accuracy = (TP + TN) / Total. Do NOT use accuracy for imbalanced datasets!"
    },
    keyPoints: [
      "MSE = (1/n) ∑ (yᵢ - ŷᵢ)² (Penalizes large errors heavily).",
      "Precision: Of all positive predictions, how many were correct?",
      "Recall (Sensitivity): Of all actual positives, how many did we catch?",
      "F1-Score: Harmonic mean of Precision and Recall."
    ],
    examPoints: [
      "Recall matters in medical diagnosis (avoid False Negatives).",
      "Precision matters in spam detection (avoid False Positives).",
      "R² measures proportion of variance explained by model (0 to 1)."
    ],
    memoryTrigger: "Precision = Exactness | Recall = Completeness | F1 = Harmonic Mean.",
    keywords: ["precision", "recall", "f1 score", "mse", "rmse", "confusion matrix", "r2"]
  },
  {
    id: "performance-enhancement",
    title: "Performance Enhancement",
    unit: "I",
    category: "Model Preparation",
    importance: "MEDIUM",
    definition: "Strategies to reduce error, prevent overfitting/underfitting, and boost model generalization.",
    coreIdea: "Enhance data quality, engineer features, tune hyperparameters, or ensemble multiple models.",
    keyPoints: [
      "More/Better Data: Collect more samples or augment existing data.",
      "Feature Engineering: Extract domain features, drop irrelevant features.",
      "Hyperparameter Tuning: Grid Search or Random Search CV.",
      "Regularization: L1 (Lasso - sparsity) & L2 (Ridge - weight shrinking).",
      "Ensemble Methods: Bagging (Random Forest) & Boosting (XGBoost)."
    ],
    examPoints: [
      "Overfitting = Low Train Error, High Test Error (High Variance). Fix: Regularization/Pruning.",
      "Underfitting = High Train Error, High Test Error (High Bias). Fix: Increase model capacity."
    ],
    memoryTrigger: "Overfitting? Add regularization/data. Underfitting? Increase model complexity.",
    keywords: ["overfitting", "underfitting", "regularization", "tuning", "ensembling"]
  }
];
