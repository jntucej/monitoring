import type { CheatTopic } from "./types";

export const unit5Topics: CheatTopic[] = [
  {
    id: "deep-learning-intro",
    unit: "V",
    title: "Introduction to Deep Learning",
    category: "Advanced Machine Learning",
    importance: "HIGH",
    definition:
      "A subset of Machine Learning based on Deep Neural Networks (many hidden layers) that automatically learn hierarchical representations from raw data without manual feature engineering.",
    coreIdea: "Traditional ML = Manual Feature Engineering + Model. Deep Learning = End-to-End Hierarchical Feature Learning.",
    differences: [
      { feature: "Feature Extraction", valA: "Traditional ML requires hand-crafted features", valB: "Deep Learning learns features automatically from raw pixels/audio" },
      { feature: "Data Dependency", valA: "Traditional ML plateaus with big data", valB: "Deep Learning performance scales continuously with massive data" },
      { feature: "Hardware Requirement", valA: "Runs efficiently on standard CPUs", valB: "Requires GPUs/TPUs for massive parallel matrix multiplications" },
    ],
    examPoints: [
      "Distinguish Machine Learning vs Deep Learning across 3 axes — classic 5-marker.",
      "Explain why Deep Learning requires GPUs and massive labeled datasets.",
    ],
    memoryTrigger: "ML = manual features + shallow; DL = automated hierarchical features + deep.",
    keywords: ["deep learning", "hierarchical features", "representation learning", "GPU"],
    recallQuestions: [
      {
        prompt: "What is the key advantage of Deep Learning over traditional Machine Learning?",
        answer: "Automated end-to-end feature extraction from raw data without manual feature engineering.",
      },
    ],
  },
  {
    id: "reinforcement-learning-intro",
    unit: "V",
    title: "Reinforcement Learning Foundations",
    category: "Advanced Machine Learning",
    importance: "HIGH",
    definition:
      "An autonomous agent learns to make optimal decisions in an environment by performing actions, observing state transitions, and receiving scalar rewards or penalties.",
    coreIdea: "Agent interacts with Environment via Trial & Error to maximize cumulative return R = ∑ γᵗ rₜ.",
    formula: {
      expression: "Return R_t = ∑_{k=0}^{\infty} γ^k r_{t+k+1}",
      symbols: { "γ": "discount factor ∈ [0, 1]", "r_t": "immediate reward at step t" },
      examNote: "Discount factor γ < 1 ensures infinite horizon returns stay finite and favors immediate rewards.",
    },
    steps: [
      "Agent observes current State sₜ from Environment.",
      "Agent chooses Action aₜ using Policy π(a|s).",
      "Environment transitions to Next State sₜ₊₁.",
      "Environment emits Scalar Reward rₜ₊₁.",
      "Agent updates Policy or Value Function to maximize long-term Return.",
    ],
    keyPoints: [
      "Supervised = Teacher provides correct output; Reinforcement = Environment provides reward feedback.",
      "Exploration vs Exploitation Dilemma: try new actions (exploration) vs choose best known action (exploitation).",
      "Markov Decision Process (MDP): defined by tuple (S, A, P, R, γ).",
    ],
    examPoints: [
      "State the 5 components of a Markov Decision Process (MDP).",
      "Explain the Exploration vs Exploitation Dilemma.",
    ],
    memoryTrigger: "Agent + Environment + Action + State + Reward. Trial & error to maximize return.",
    keywords: ["reinforcement learning", "agent", "environment", "reward", "policy", "MDP", "exploration"],
  },
  {
    id: "case-study-image-recognition",
    unit: "V",
    title: "Case Study: Image Recognition Pipeline",
    category: "Applications of ML",
    importance: "HIGH",
    definition:
      "Automated visual classification using Convolutional Neural Networks (CNNs) to recognize objects, faces, or handwritten digits (MNIST / ImageNet).",
    coreIdea: "Raw Image Pixels → Convolutional Filters → Pooling → Fully Connected → Softmax Class Probabilities.",
    steps: [
      "Image Preprocessing: resize image, normalize pixel intensities to [0, 1], apply data augmentation.",
      "Convolutional Layers: apply learnable 2D filters to detect edges, textures, and shapes.",
      "Pooling Layers: downsample spatial dimensions (Max Pooling) for translation invariance.",
      "Fully Connected Layer: flatten feature maps into dense feature vector.",
      "Softmax Output: compute probabilities across target object categories.",
    ],
    examPoints: [
      "Draw the end-to-end Image Recognition pipeline block diagram — classic 10-mark case study.",
      "Explain why Convolutional layers are superior to flat dense layers for 2D image data.",
    ],
    memoryTrigger: "Preprocess → Convolve (edges) → Pool (downsample) → Dense → Softmax.",
    keywords: ["image recognition", "CNN", "convolution", "max pooling", "MNIST", "case study"],
  },
  {
    id: "case-study-speech-recognition",
    unit: "V",
    title: "Case Study: Speech Recognition Pipeline",
    category: "Applications of ML",
    importance: "HIGH",
    definition:
      "Converting continuous human speech audio waveforms into written text transcripts using acoustic modeling and sequence learning.",
    coreIdea: "Audio Waveform → Framing & Windowing → MFCC Features → Acoustic Model → Language Model → Text.",
    steps: [
      "Audio Sampling & Framing: slice continuous audio into short 25ms overlapping frames.",
      "Feature Extraction: compute Mel-Frequency Cepstral Coefficients (MFCCs) per frame.",
      "Acoustic Modeling: predict phoneme probabilities for audio frames (HMM / Recurrent ANN).",
      "Language Modeling: apply N-gram or Transformer probabilities to pick grammatically valid words.",
      "Decoding: Beam Search finds the word sequence with highest joint probability.",
    ],
    examPoints: [
      "Draw the Speech Recognition pipeline diagram from audio wave to text output.",
      "Explain the role of MFCC feature extraction.",
    ],
    memoryTrigger: "Waveform → MFCC features → Acoustic Model (phonemes) → Language Model (text).",
    keywords: ["speech recognition", "MFCC", "acoustic model", "phoneme", "language model"],
  },
  {
    id: "case-study-spam-filtering",
    unit: "V",
    title: "Case Study: Email Spam Filtering Pipeline",
    category: "Applications of ML",
    importance: "HIGH",
    definition:
      "Binary text classification system that filters incoming emails into Spam or Ham (legitimate) based on text content and metadata features.",
    coreIdea: "Raw Email Text → Tokenization & Stop-word Removal → TF-IDF Vectorization → Naïve Bayes / SVM → Spam/Ham Label.",
    steps: [
      "Text Cleaning: remove HTML tags, punctuation, numbers, and lowercasing.",
      "Tokenization & Stemming: split body into words and reduce to word roots (Porter Stemmer).",
      "Feature Extraction: compute TF-IDF (Term Frequency-Inverse Document Frequency) matrix.",
      "Model Training: train Naïve Bayes or Support Vector Machine classifier on labeled emails.",
      "Classification & Action: output P(Spam | Email); route to Spam folder if P > threshold.",
    ],
    examPoints: [
      "Explain TF-IDF feature representation for email spam filtering.",
      "Why is Naïve Bayes particularly effective for text spam classification?",
    ],
    memoryTrigger: "Clean text → Tokenize → TF-IDF vectors → Naïve Bayes / SVM → Spam / Ham.",
    keywords: ["spam filtering", "text classification", "TF-IDF", "naive bayes", "bag of words"],
  },
  {
    id: "case-study-fraud-detection",
    unit: "V",
    title: "Case Study: Online Credit Card Fraud Detection",
    category: "Applications of ML",
    importance: "HIGH",
    definition:
      "Real-time transaction classification to identify fraudulent financial transactions amidst extreme class imbalance (e.g. 99.9% legitimate, 0.1% fraud).",
    coreIdea: "Transaction Features → Imbalanced Resampling (SMOTE) → Anomaly / Isolation Forest → Alert / Block Transaction.",
    steps: [
      "Feature Engineering: amount, merchant location, time delta, card velocity, IP geolocation.",
      "Handling Class Imbalance: apply SMOTE (Synthetic Minority Over-sampling Technique) or Random Undersampling.",
      "Model Training: train Random Forest, XGBoost, or Isolation Forest anomaly detector.",
      "Real-Time Evaluation: evaluate transaction latency within < 100ms.",
      "Precision-Recall Tuning: optimize Precision-Recall curve to minimize False Positives (blocking valid users).",
    ],
    examPoints: [
      "Explain how Class Imbalance (SMOTE) is handled in credit card fraud detection.",
      "Why is Accuracy a misleading metric for fraud detection (Accuracy Paradox)?",
    ],
    memoryTrigger: "Imbalanced data → SMOTE resampling → Isolation Forest / XGBoost → Real-time block.",
    keywords: ["fraud detection", "class imbalance", "SMOTE", "isolation forest", "precision recall"],
  },
  {
    id: "q-learning",
    unit: "V",
    title: "Q-Learning Algorithm (Model-Free RL)",
    category: "Advanced Machine Learning",
    importance: "MEDIUM",
    definition:
      "A model-free off-policy Temporal Difference reinforcement learning algorithm that learns the quality of actions Q(s, a) without requiring an explicit environment transition model.",
    coreIdea: "Q(s, a) ← Q(s, a) + α [ r + γ max_a' Q(s', a') − Q(s, a) ].",
    formula: {
      expression: "Q(s, a) ← Q(s, a) + α [ r + γ \\max_{a'} Q(s', a') - Q(s, a) ]",
      symbols: { "Q(s,a)": "expected cumulative return taking action a in state s", α: "learning rate", γ: "discount factor" },
      examNote: "TD Error = r + γ max_{a'} Q(s', a') − Q(s, a).",
    },
    steps: [
      "Initialize Q-Table Q(s, a) to zeros for all state-action pairs.",
      "Observe current state s.",
      "Select action a using ε-greedy strategy (explore random with prob ε, else pick max Q).",
      "Execute action a, receive reward r and observe next state s'.",
      "Update Q-table: Q(s,a) ← Q(s,a) + α [ r + γ max_{a'} Q(s',a') − Q(s,a) ].",
      "Set s ← s'; repeat until terminal state.",
    ],
    examPoints: [
      "Write down the Q-Learning Bellman Update Equation — classic theory question.",
      "Explain ε-greedy action selection.",
    ],
    memoryTrigger: "Q(s,a) update = Q + α [ reward + γ max Q_next - Q ]. ε-greedy for exploration.",
    keywords: ["Q-learning", "bellman equation", "temporal difference", "Q-table", "epsilon greedy"],
  },
];

