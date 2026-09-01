import type { CS } from "./CheatData";

export const cheat2: CS[] = [
  { title: "Decision Tree", def: "Splits data on feature thresholds; leaves hold predictions.", examPoints: ["Greedy splits by information gain/impurity","Prone to overfitting — prune"], remember: "Hierarchy of yes/no questions." },
  { title: "SVM", def: "Widest margin hyperplane separating classes; kernels for nonlinear.", examPoints: ["Max-margin","Only SVs matter","Kernel = implicit nonlinear map"], pros: ["Works in high dimensions"], remember: "Wide margin, SVs anchor it." },
  { title: "Random Forest", def: "Many trees; final = vote/average. ", steps: ["Bootstrap sample","Train each tree","Bag+feature sample","Aggregate votes"], examPoints: ["Reduces variance","Harder to overfit than single tree"], remember: "Many trees, one vote." },
  { title: "Naïve Bayes", def: "Bayes with naive feature independence.", formula: "P(A|B) = P(B|A)·P(A)/P(B)", steps: ["Priors","Likelihoods","Multiply","Argmax"], pros: ["Fast","Great for text"], cons: ["Independence assumption"], examPoints: ["Smooth zero-frequency"], remember: "Assume all features independent." },
  { title: "PCA", def: "Uncorrelated axes(PCs) keeping max variance;dim reduction.", steps: ["Standardise","Covariance","Eigen","Rank by var","Keep top-k","Project"], examPoints: ["Unsupervised","Standardise first","PC1=most variance"], remember: "Project onto variance-maximising axes." },
];