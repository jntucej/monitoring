import type { Topic } from "../types";

export const prepTopicsA: Record<string, Topic> = {
  "data-types": {
    id: "data-types",
    title: "Types of Data",
    unit: "I",
    category: "Model Preparation",
    importance: "high",
    definition: "The forms data can take: numerical, categorical, ordinal, time-series, text, image.",
    keyPoints: ["Structured — rows & columns (tabular)", "Unstructured — text, images, audio", "Numerical — continuous or discrete", "Categorical — nominal(no order) vs ordinal(order)", "Time-series — ordered by time"],
    visual: { type: "comparison", data: { rows: [["Structured", "tabular, easy"], ["Unstructured", "text/images, needs extraction"], ["Numerical", "continuous/discrete"], ["Categorical", "nominal vs ordinal"], ["Time-series", "ordered"] ] } },
    examPoints: ["Categorical: ordinal vs nominal", "Unstructured needs preprocessing before modelling"],
    memoryTrigger: "Know the data type before you model.",
  },
  preprocessing: {
    id: "preprocessing",
    title: "Data Pre-processing",
    unit: "I",
    category: "Model Preparation",
    importance: "high",
    definition: "Cleaning and transforming raw data into a usable form for ML models.",
    why: "Models are sensitive to scale, missing values,and encoding — clean data improves learning dramatically.",
    keyPoints: ["Handle missing values — drop or impute", "Handle outliers", "Encode categoricals — one-hot, label", "Scale features(normalise/standardise)", "Split into train/validation/test"],
    visual: { type: "flow", data: { steps: ["Raw data", "Clean missing & outliers", "Encode categoricals", "Scale features", "Train/test split"] } },
    examPoints: ["Feature scaling critical for kNN, SVM", "Preprocessing must fit on train split only — avoid leakage", "Categorical encoding: one-hot vs label"],
    memoryTrigger: "Clean, scale, encode, split.",
    relatedTopics: ["data-types", "model-selection", "feature-engineering"],
  },
};