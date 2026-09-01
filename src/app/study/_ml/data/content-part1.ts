import type { Unit, Topic } from "../types";

export const units: Record<string, Unit> = {
  I: {
    id: "I",
    title: "Introduction & Feature Engineering",
    description: "Foundations of ML, the learning paradigm, model-prep workflow,and feature engineering.",
    structure: [
      { category: "Introduction", topics: ["introduction", "human-learning", "what-is-ml", "ml-types"] },
      { category: "Model Preparation", topics: ["data-types", "preprocessing", "model-selection", "model-training", "model-evaluation"] },
      { category: "Feature Engineering", topics: ["feature-engineering", "feature-transformation", "pca"] },
    ],
  },
  II: {
    id: "II",
    title: "Supervised Learning",
    description: "Regression, classification,and their core algorithms.",
    structure: [
      { category: "Regression", topics: ["simple-linear", "multiple-linear", "polynomial", "logistic-regression"] },
      { category: "Classification", topics: ["naive-bayes", "knn", "decision-tree", "svm", "random-forest"] },
    ],
  },
  III: {
    id: "III",
    title: "Unsupervised Learning",
    description: "Find hidden structure in unlabelled datavia clustering.",
    structure: [
      { category: "Foundations", topics: ["unsupervised-intro", "svs-us"] },
      { category: "Clustering", topics: ["kmeans", "kmedoids", "hierarchical", "dbscan"] },
    ],
  },
};

export const topicMap: Record<string, Topic> = {
  // ================= UNIT I =================
  introduction: {
    id: "introduction",
    title: "Introduction to Machine Learning",
    unit: "I",
    category: "Introduction",
    importance: "high",
    definition: "ML is a branch of AI where systems learn from data to improve performance without being explicitly programmed.",
    coreIdea: "Feed data, algorithm derives rules, model generalises to unseen input.",
    keyPoints: ["Learn from experience", "Improve with more data", "Generalise to unseen examples"],
    steps: ["Collect data", "Prepare data", "Choose model", "Train", "Evaluate", "Deploy"],
    visual: { type: "pipeline", data: { stages: ["Raw Data", "Pre-processing", "Feature Engineering", "Train/Test Split", "Model Training", "Model Evaluation", "Final Model"] } },
    examPoints: ["ML = learning from data without explicit programming", "Generalisation is the core goal"],
    memoryTrigger: "Data in, patterns out — ML writes its own rules from examples.",
    relatedTopics: ["ml-types", "data-types", "model-selection"],
  },
  "human-learning": {
    id: "human-learning",
    title: "Types of Human Learning",
    unit: "I",
    category: "Introduction",
    importance: "medium",
    definition: "Human ways of learning that inspire the ML taxonomy: rote, instruction, deduction, analogy, induction.",
    keyPoints: ["Rote — memorising", "By instruction — rules", "By deduction — reasoning", "By analogy — comparing", "By induction — generalise from examples (drives ML)"],
    examPoints: ["Induction from examples is the basis of ML"],
    memoryTrigger: "Induction — learning from examples — is what ML copies.",
  },
  "what-is-ml": {
    id: "what-is-ml",
    title: "What is Machine Learning?",
    unit: "I",
    category: "Introduction",
    importance: "high",
    definition: "A field studying algorithms that improve automatically through experience( data).",
    keyPoints: ["Arthur Samuel — checkers, earliest definition", "Tom Mitchell — performance P improves with experience E measured by T", "Model = representation + algorithm + optimisation"],
    visual: { type: "layers", data: { layers: ["Data (experience)", "Learning algorithm", "Model", "Predict on new data"] } },
    examPoints: ["Tom Mitchell: P measured by T improves with E", "Model vs algorithm: algorithm learns, model is the result"],
    memoryTrigger: "Experience in, performance up — the machine learns.",
  },
  "ml-types": {
    id: "ml-types",
    title: "Types of Machine Learning",
    unit: "I",
    category: "Introduction",
    importance: "high",
    definition:"The four learning paradigms classified by data and the feedback the learner receives.",
    keyPoints:["Supervised — labelled, input to output","Unsupervised — unlabelled, find structure","Semi-supervised — few labels + lots unlabelled","Reinforcement — rewards via trial-and-error"],
    visual:{type:"tree",data:{root:"Machine Learning",children:[["Supervised","Unsupervised"],["Semi-supervised","Reinforcement"]]}} ,
    advantages:["Four paradigms cover most real problems","Right paradigm simplifies modelling"],
    limitations:["Supervised needs expensive labels","Unsupervised output hard to validate","Reinforcement needs a clear reward"],
    applications:["Supervised — spam, fraud, classification","Unsupervised — clustering, segmentation","Reinforcement — robotics, games"],
    examPoints:["Supervised: labelled data to classification or regression","Unsupervised: unlabelled data to clustering","Reinforcement learns via rewards only"],
    memoryTrigger:"Labels? Supervised. No labels? Unsupervised. Rewards? Reinforcement.",
    relatedTopics:["introduction","unsupervised-intro","svs-us"],
  },
};