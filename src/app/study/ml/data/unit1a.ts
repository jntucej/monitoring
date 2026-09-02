import type { CheatTopic } from "./types";

export const unit1aTopics: CheatTopic[] = [
  {
    id: "introduction",
    title: "Introduction to Machine Learning",
    unit: "I",
    category: "Introduction",
    importance: "HIGH",
    definition: "Systems learn patterns from data to make predictions or decisions without being explicitly programmed for every case.",
    coreIdea: "Data in, patterns out. ML writes its own rules from training examples.",
    steps: ["Collect Data", "Pre-process", "Extract Features", "Train Model", "Evaluate", "Predict"],
    visual: {
      type: "pipeline",
      data: ["RAW DATA", "DATA UNDERSTANDING", "PRE-PROCESSING", "FEATURE ENGINEERING", "TRAIN / TEST SPLIT", "MODEL SELECTION", "MODEL TRAINING", "MODEL EVALUATION", "ENHANCEMENT", "FINAL MODEL"]
    },
    keyPoints: [
      "Tom Mitchell definition: Performance P on task T improves with experience E.",
      "Generalization to unseen test data is the primary objective.",
      "Garbage in = Garbage out (Data quality dictates model performance)."
    ],
    examPoints: [
      "Definition: Learning from data without explicit programming.",
      "Goal: Generalize accurately to unseen data.",
      "Iterative workflow: Prepare → Train → Evaluate → Tune."
    ],
    memoryTrigger: "Data in, rules out — ML learns mapping automatically.",
    keywords: ["generalization", "tom mitchell", "learning from experience", "workflow"]
  },
  {
    id: "human-learning",
    title: "Types of Human Learning",
    unit: "I",
    category: "Introduction",
    importance: "MEDIUM",
    definition: "Ways humans acquire knowledge (rote, instruction, observation, experience, discovery) that inspire machine learning paradigms.",
    coreIdea: "Inductive reasoning (generalizing from specific examples) is the exact mechanism used by Machine Learning.",
    keyPoints: [
      "Rote learning: Memorising facts without understanding.",
      "Instruction learning: Following explicit step-by-step rules.",
      "Observation/Discovery: Finding patterns without a teacher.",
      "Inductive learning: Generalising broad rules from specific instances."
    ],
    examPoints: [
      "Induction from examples forms the core of ML algorithms.",
      "Human learning taxonomy inspires Supervised, Unsupervised & Reinforcement ML."
    ],
    memoryTrigger: "Induction = specific examples to general rules.",
    keywords: ["rote", "induction", "deduction", "human learning"]
  },
  {
    id: "what-is-ml",
    title: "What is Machine Learning?",
    unit: "I",
    category: "Introduction",
    importance: "HIGH",
    definition: "The study of computer algorithms that improve automatically through experience.",
    coreIdea: "A program E learns task T measured by P if performance P on T improves with E.",
    visual: {
      type: "flow",
      data: ["Input Data (E)", "Learning Algorithm", "Model (Hypothesis)", "Prediction (T)", "Evaluate Performance (P)"]
    },
    keyPoints: [
      "Arthur Samuel (1959): Field of study that gives computers the ability to learn without explicit programming.",
      "Tom Mitchell (1997): E (Experience), T (Task), P (Performance Measure).",
      "Components: Representation + Evaluation + Optimization."
    ],
    examPoints: [
      "State Mitchell's E, T, P framework clearly in 2-mark & 5-mark answers.",
      "Differentiate between Algorithm (learning procedure) and Model (learned artifact)."
    ],
    memoryTrigger: "E = Experience, T = Task, P = Performance metric.",
    keywords: ["mitchell", "samuel", "experience", "task", "performance"]
  },
  {
    id: "ml-types",
    title: "Types of Machine Learning",
    unit: "I",
    category: "Introduction",
    importance: "HIGH",
    definition: "Classification of ML algorithms based on the type of feedback/data available during training.",
    coreIdea: "Supervised = Labeled | Unsupervised = Unlabeled | Semi-Supervised = Hybrid | Reinforcement = Rewards.",
    visual: {
      type: "tree",
      data: {
        root: "MACHINE LEARNING",
        branches: [
          { name: "Supervised", sub: ["Regression (Continuous)", "Classification (Discrete)"] },
          { name: "Unsupervised", sub: ["Clustering (Groups)", "Dimensionality Reduction (PCA)"] },
          { name: "Semi-Supervised", sub: ["Few Labeled + Many Unlabeled"] },
          { name: "Reinforcement", sub: ["Agent → State → Action → Reward"] }
        ]
      }
    },
    keyPoints: [
      "Supervised: Input (X) + Target (Y). Learns mapping function Y = f(X).",
      "Unsupervised: Input (X) only. Discovers hidden structures or clusters.",
      "Semi-Supervised: Combines small labeled dataset with large unlabeled set.",
      "Reinforcement: Trial-and-error agent learning via environmental rewards/penalties."
    ],
    examPoints: [
      "Supervised → Labeled data (Regression/Classification).",
      "Unsupervised → Unlabeled data (Clustering/Dimensionality Reduction).",
      "Semi-Supervised → Mixture of labeled + unlabeled.",
      "Reinforcement → State, Action, Reward feedback loop."
    ],
    memoryTrigger: "Labeled? Supervised. Unlabeled? Unsupervised. Rewards? Reinforcement.",
    keywords: ["supervised", "unsupervised", "semi-supervised", "reinforcement", "labeled", "reward"]
  }
];
