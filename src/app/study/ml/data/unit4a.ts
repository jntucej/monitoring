import type { CheatTopic } from "./types";

export const unit4Topics: CheatTopic[] = [
  {
    id: "biological-vs-artificial-neuron",
    unit: "IV",
    title: "Biological vs Artificial Neuron",
    category: "Neural Networks",
    importance: "HIGH",
    definition:
      "Artificial Neural Networks (ANN) are computational models inspired by biological brain networks. Biological components map directly to artificial mathematical components.",
    coreIdea: "Biological brain mapping: Dendrites → Inputs, Soma → Processing Node, Synapses → Weights, Axon → Output.",
    differences: [
      { feature: "Biological Element", valA: "Dendrites (receive signals)", valB: "Soma (cell body processing)" },
      { feature: "Artificial Counterpart", valA: "Input Vector (x₁, x₂, …, xₙ)", valB: "Summation Node ∑ wᵢ xᵢ + b" },
      { feature: "Biological Signal", valA: "Synaptic Strength (learning)", valB: "Axon (fires electrical spike)" },
      { feature: "Artificial Counterpart", valA: "Weight Values (w₁, w₂, …, wₙ)", valB: "Activation Output y = g(z)" },
    ],
    examPoints: [
      "Draw the mapping table between Biological and Artificial Neurons — classic 5-marker.",
      "Explain how synaptic plasticity corresponds to weight adjustment during learning.",
    ],
    memoryTrigger: "Soma = Node, Dendrite = Input, Synapse = Weight, Axon = Output.",
    keywords: ["biological neuron", "soma", "dendrite", "axon", "synapse", "artificial neuron"],
    recallQuestions: [
      {
        prompt: "What artificial neural component corresponds to the biological synapse?",
        answer: "Connection Weights (w_i).",
      },
    ],
  },
  {
    id: "artificial-neuron-model",
    unit: "IV",
    title: "Artificial Neuron Mathematical Model",
    category: "Neural Networks",
    importance: "HIGH",
    definition:
      "The basic processing element of an ANN. It receives inputs x_i, computes weighted sum z = ∑ w_i x_i + b, and applies a non-linear activation function g(z) to produce output y.",
    coreIdea: "Net input z = wᵀx + b ⟹ Output y = g(z).",
    formula: {
      expression: "y = g( z ) = g( ∑_{i=1}^{n} w_i x_i + b )",
      symbols: { x_i: "input features", w_i: "connection weights", b: "bias threshold", "g(z)": "activation function" },
      examNote: "Bias b shifts the activation threshold away from the origin.",
    },
    steps: [
      "Multiply each input xᵢ by its corresponding weight wᵢ.",
      "Sum all weighted inputs and add bias b: z = ∑ wᵢ xᵢ + b.",
      "Pass net input z through activation function g(z).",
      "Emit output signal y.",
    ],
    keyPoints: [
      "Weights represent connection strength; positive = excitatory, negative = inhibitory.",
      "Bias acts as a weight connected to a constant input of +1.",
    ],
    examPoints: [
      "Draw the single artificial neuron block diagram — guaranteed 5-mark diagram.",
      "Explain the physical significance of bias in shifting decision boundaries.",
    ],
    memoryTrigger: "Multiply x by w, add b to get z, pass through g(z) for y.",
    keywords: ["net input", "bias", "weighted sum", "activation function"],
  },
  {
    id: "activation-functions",
    unit: "IV",
    title: "Activation Functions & Derivatives",
    category: "Neural Networks",
    importance: "HIGH",
    definition:
      "Activation functions introduce non-linearity into neural networks, enabling them to learn complex non-linear decision boundaries.",
    coreIdea: "Without non-linear activations, multi-layer neural networks collapse into simple linear regression.",
    formula: {
      expression: "σ(z) = 1 / (1 + e^{-z})   •   ReLU(z) = max(0, z)   •   tanh(z) = (e^z - e^{-z}) / (e^z + e^{-z})",
      symbols: { "σ'(z)": "σ(z)(1 − σ(z))", "ReLU'(z)": "1 if z > 0 else 0", "tanh'(z)": "1 − tanh²(z)" },
      examNote: "Sigmoid derivative σ'(z) reaches maximum of 0.25 at z=0, causing Vanishing Gradients in deep networks.",
    },
    keyPoints: [
      "Step Function: binary output {0,1}, non-differentiable at 0.",
      "Sigmoid: outputs (0,1), smooth & differentiable, suffers from vanishing gradient.",
      "Tanh: outputs (-1,1), zero-centered, better than Sigmoid for hidden layers.",
      "ReLU: outputs [0, ∞), fast computation, solves vanishing gradient for positive z.",
    ],
    examPoints: [
      "State the formula and derivative of Sigmoid, Tanh, and ReLU — 10-mark certainty.",
      "Explain the Vanishing Gradient problem caused by Sigmoid activations.",
    ],
    commonMistakes: [
      "Dying ReLU: if z < 0, gradient is 0 and neuron stops learning permanently.",
    ],
    memoryTrigger: "Sigmoid (0,1), Tanh (-1,1), ReLU max(0,z). Sigmoid derivative = σ(1-σ).",
    keywords: ["sigmoid", "relu", "tanh", "vanishing gradient", "activation derivative"],
    recallQuestions: [
      {
        prompt: "What is the derivative of the Sigmoid function σ(z)?",
        answer: "σ'(z) = σ(z) * (1 - σ(z))",
      },
    ],
  },
  {
    id: "ann-architectures",
    unit: "IV",
    title: "ANN Architectures: Feedforward vs Recurrent",
    category: "Neural Networks",
    importance: "MEDIUM",
    definition:
      "Neural networks are organized into Input Layer, Hidden Layers, and Output Layer. Architecture dictates how signals flow through connections.",
    coreIdea: "Feedforward = acyclic forward flow. Recurrent = cyclic feedback loops with memory.",
    differences: [
      { feature: "Single-Layer Perceptron", valA: "Input → Output (no hidden layer)", valB: "Only linear decision boundaries" },
      { feature: "Multi-Layer Perceptron (MLP)", valA: "Input → Hidden → Output", valB: "Universal function approximator" },
      { feature: "Feedforward ANN", valA: "Signal flows strictly forward", valB: "No memory of past inputs" },
      { feature: "Recurrent ANN (RNN)", valA: "Feedback loops allowed", valB: "Maintains internal state (memory)" },
    ],
    examPoints: [
      "Differentiate Single-Layer vs Multi-Layer Perceptrons.",
      "State the Universal Approximation Theorem for MLPs.",
    ],
    memoryTrigger: "MLP needs hidden layers for non-linear boundaries. Feedforward = forward only; RNN = loops.",
    keywords: ["feedforward", "recurrent", "hidden layer", "MLP", "single layer"],
  },
  {
    id: "perceptron",
    unit: "IV",
    title: "The Perceptron Model & XOR Limitation",
    category: "Neural Networks",
    importance: "HIGH",
    definition:
      "Invented by Frank Rosenblatt (1958), the Perceptron is the simplest feedforward neural network for binary classification using a step activation function.",
    coreIdea: "Perceptron creates a linear decision hyperplane w₁x₁ + w₂x₂ + b = 0. Fails on non-linearly separable XOR.",
    formula: {
      expression: "f(x) = 1 if (wᵀx + b ≥ 0) else 0",
      examNote: "Minsky & Papert (1969) proved single Perceptrons cannot learn XOR, triggering the first AI Winter.",
    },
    keyPoints: [
      "Linear Separability: Perceptron converges ONLY if classes can be separated by a straight line/hyperplane.",
      "AND, OR, NOT gates are linearly separable — solvable by single Perceptron.",
      "XOR gate is NOT linearly separable — requires Multi-Layer Perceptron (MLP).",
    ],
    examPoints: [
      "Prove why single Perceptron cannot solve the XOR problem — classic 8-mark proof.",
      "Draw the decision boundary line for AND and OR gates.",
    ],
    commonMistakes: [
      "Thinking adding more iterations solves XOR on a single perceptron — impossible due to non-linearity!",
    ],
    memoryTrigger: "AND/OR = line separable (yes). XOR = non-separable (fails). Need hidden layer for XOR.",
    keywords: ["perceptron", "linear separability", "XOR problem", "Minsky and Papert"],
  },
  {
    id: "perceptron-learning-rule",
    unit: "IV",
    title: "Perceptron Learning Rule & Convergence",
    category: "Neural Networks",
    importance: "HIGH",
    definition:
      "A supervised iterative learning algorithm that updates weights only when the predicted class ŷ differs from the true target y.",
    coreIdea: "Weight update: wᵢ ← wᵢ + α (y − ŷ) xᵢ  and  b ← b + α (y − ŷ).",
    formula: {
      expression: "Δw_i = α ( y - ŷ ) x_i",
      symbols: { α: "learning rate (0 < α ≤ 1)", y: "true target label", ŷ: "predicted output {0,1}" },
      examNote: "If prediction is correct (y = ŷ), error is 0 and weights do not change.",
    },
    steps: [
      "Initialize weights wᵢ and bias b to small random values or 0.",
      "For each training sample (x, y): compute net input z = ∑ wᵢ xᵢ + b.",
      "Compute prediction ŷ = Step(z).",
      "Calculate error e = (y − ŷ).",
      "Update weights: wᵢ ← wᵢ + α · e · xᵢ  and bias: b ← b + α · e.",
      "Repeat epochs until all samples are correctly classified.",
    ],    examPoints: [
      "State the Perceptron Weight Update equation.",
      "State the Perceptron Convergence Theorem: if data is linearly separable, training completes in finite steps.",
    ],
    memoryTrigger: "Error = (y - ŷ). Update = α × error × input. No error = no update.",
    keywords: ["perceptron learning rule", "weight update", "learning rate", "convergence theorem"],
  },
  {
    id: "perceptron-numerical",
    unit: "IV",
    title: "Perceptron Step-by-Step Worked Numerical",
    category: "Neural Networks",
    importance: "HIGH",
    definition:
      "Step-by-step numerical execution of the Perceptron learning algorithm for a single training step.",
    coreIdea: "Trace net input z = wᵀx + b → Step(z) activation → error e = (y − ŷ) → weight update Δw = α · e · x.",
    steps: [
      "1. Compute net sum z = w₁x₁ + w₂x₂ + b = (0.5)(1) + (-0.5)(0) + 0 = 0.5.",
      "2. Apply step function: ŷ = 1 since z = 0.5 ≥ 0.",
      "3. Compute error e = y − ŷ = 1 − 1 = 0.",
      "4. Weight update Δw = α · e · x = 0. Weights remain w = [0.5, -0.5], b = 0.",
    ],
    examPoints: [
      "Execute Perceptron update step for 2 epochs on AND gate — guaranteed 10-mark numerical.",
    ],
    memoryTrigger: "Net sum z → Step(z) → e=(y-ŷ) → Δw=α·e·x.",
    keywords: ["perceptron numerical", "worked example", "weight update step"],
  },
  {
    id: "ann-learning-process",
    unit: "IV",
    title: "ANN Learning Process & Loss Functions",
    category: "Neural Networks",
    importance: "MEDIUM",
    definition:
      "The iterative process of training an ANN: initialize weights, perform forward pass, compute loss function L(w), calculate gradients, and update weights via gradient descent.",
    coreIdea: "Loss Function L(w) measures prediction error. Gradient Descent updates w ← w − α ∇L.",
    formula: {
      expression: "MSE = (1/2) ∑ (y - ŷ)²   •   Cross-Entropy = − ∑ y log(ŷ)",
      symbols: { "L(w)": "Loss function", "∇L": "Gradient vector of partial derivatives" },
      examNote: "Mean Squared Error (MSE) is standard for regression; Cross-Entropy is standard for classification.",
    },
    steps: [
      "Initialize weights randomly to break symmetry.",
      "Forward pass: feed input X to compute activations and network output ŷ.",
      "Compute Loss L(w) comparing target y and output ŷ.",
      "Backward pass: compute gradient ∇L = ∂L/∂w using Chain Rule.",
      "Update weights: w ← w − α ∇L.",
      "Repeat for multiple epochs until loss converges below threshold.",
    ],
    examPoints: [
      "List the 6 stages of the ANN learning loop.",
      "Contrast Mean Squared Error (MSE) vs Cross-Entropy Loss.",
    ],
    memoryTrigger: "Initialize → Forward → Loss → Backprop → Update → Repeat.",
    keywords: ["loss function", "MSE", "gradient descent", "epoch", "learning loop"],
  },
  {
    id: "backpropagation",
    unit: "IV",
    title: "Backpropagation Algorithm",
    category: "Neural Networks",
    importance: "HIGH",
    definition:
      "The fundamental algorithm for training multilayer neural networks. It applies the calculus Chain Rule to propagate output error backwards layer-by-layer to compute partial derivatives for weight updates.",
    coreIdea: "Forward pass computes predictions; Backprop distributes error backward via Chain Rule to update weights.",
    formula: {
      expression: "Δw_{ji} = α · δ_j · a_i   where δ_k = y_k - a_k  (output)  and  δ_j = g'(in_j) ∑ w_{kj} δ_k  (hidden)",
      symbols: { "δ_j": "error gradient delta at unit j", "a_i": "activation input from layer below", α: "learning rate" },
      examNote: "Backpropagation makes training multi-layer networks computationally efficient: O(W) per sample where W is number of weights.",
    },
    steps: [
      "Forward Pass: compute input net sum in_j and output activation a_j for every neuron.",
      "Output Layer Error: compute delta δ_k = g'(in_k) · (y_k − a_k) for each output unit.",
      "Hidden Layer Error: propagate deltas backward: δ_j = g'(in_j) · ∑_k w_{kj} δ_k for each hidden unit.",
      "Weight Update: update each weight w_{ji} ← w_{ji} + α · δ_j · a_i.",
    ],
    examPoints: [
      "Derive the Backpropagation weight update rule using the Calculus Chain Rule — 10-mark theory certainty.",
      "Explain why Backpropagation requires differentiable activation functions.",
    ],
    commonMistakes: [
      "Forgetting to multiply by activation derivative g'(in) during delta computation!",
    ],
    memoryTrigger: "Forward activations → Output error δ_k → Backprop hidden error δ_j → Update w_{ji} = α · δ_j · a_i.",
    keywords: ["backpropagation", "chain rule", "delta error", "weight update", "gradient descent"],
  },
  {
    id: "backpropagation-numerical",
    unit: "IV",
    title: "Backpropagation Step-by-Step Worked Numerical",
    category: "Neural Networks",
    importance: "HIGH",
    definition:
      "Full numerical walkthrough of 1 forward pass and 1 backward pass weight update for a 2-layer neural network with Sigmoid activation.",
    coreIdea: "Trace forward activations → output error → output delta → hidden delta → updated weights.",
    steps: [
      "1. Forward Pass Hidden: net_h1 = w₁x₁ + w₂x₂ + b₁ = 0.3775 ⟹ a_h1 = σ(0.3775) = 0.5932.",
      "2. Forward Pass Output: net_o1 = w₅a_h1 + w₆a_h2 + b₂ = 1.1059 ⟹ a_o1 = σ(1.1059) = 0.7514. Total Error E = 0.2983.",
      "3. Backward Pass Output Error Delta: δ_o1 = a_o1(1 - a_o1)(y₁ - a_o1) = (0.7514)(1 - 0.7514)(0.01 - 0.7514) = -0.1385.",
      "4. Update Output Weight w₅: w₅(new) = w₅ + α · δ_o1 · a_h1 = 0.40 + (0.5)(-0.1385)(0.5932) = 0.3589.",
    ],
    examPoints: [
      "Execute Backpropagation forward and backward step for 1 output neuron — classic 10-mark numerical.",
    ],
    memoryTrigger: "Forward net sum & σ → Error (y - a) → δ_o1 = a(1-a)error → w₅_new = w₅ + α·δ·a_h.",
    keywords: ["backpropagation numerical", "worked example", "delta rule", "MLP numerical"],
  },
  {
    id: "softmax-cross-entropy",
    unit: "IV",
    title: "Softmax Activation & Cross-Entropy Loss",
    category: "Neural Networks",
    importance: "MEDIUM",
    definition:
      "Softmax converts raw output scores (logits) into a probability distribution summing to 1 across K classes. Cross-Entropy measures distance between true distribution y and predicted probabilities ŷ.",
    coreIdea: "Softmax(z_k) = e^{z_k} / ∑ e^{z_j}. Cross-Entropy Loss = − ∑ y_k log(ŷ_k).",
    formula: {
      expression: "Softmax(z_k) = e^{z_k} / ∑_{j=1}^{K} e^{z_j}",
      symbols: { "z_k": "unnormalized logit for class k", "Softmax(z_k)": "class probability ∈ (0,1)" },
      examNote: "Softmax derivative combined with Cross-Entropy Loss simplifies to (ŷ_k − y_k).",
    },
    examPoints: [
      "Explain why Softmax is preferred over Sigmoid for multi-class classification (K > 2).",
    ],
    memoryTrigger: "Softmax = exponentiate & normalize over classes. Cross-Entropy = -y log(ŷ).",
    keywords: ["softmax", "cross entropy", "multi-class", "logits"],
  },
  {
    id: "sgd-minibatch",
    unit: "IV",
    title: "SGD & Mini-Batch Gradient Descent",
    category: "Neural Networks",
    importance: "LOW",
    definition:
      "Variants of Gradient Descent based on training sample size used per weight update: Batch (all N samples), Stochastic (1 sample), or Mini-Batch (b samples).",
    differences: [
      { feature: "Batch Gradient Descent", valA: "Uses all N samples per step", valB: "Smooth gradient, slow for large data" },
      { feature: "Stochastic (SGD)", valA: "Uses 1 random sample per step", valB: "Fast, noisy gradient updates" },
      { feature: "Mini-Batch Gradient Descent", valA: "Uses batch size b (e.g. 32, 64)", valB: "Best balance of speed & GPU parallelism" },
    ],
    examPoints: [
      "Compare Batch vs Stochastic vs Mini-Batch Gradient Descent.",
    ],
    memoryTrigger: "Batch = all data; SGD = 1 item; Mini-Batch = sweet spot (32-256).",
    keywords: ["SGD", "mini-batch", "batch gradient descent", "learning rate"],
  },
];
