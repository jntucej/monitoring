export type ExamPriority = '🔥' | '🟠' | '🟡';

export interface Definition {
  text: string;
  keywords: string[];
}

export interface Formula {
  expression: string;
  variables: Record<string, string>;
  whenToUse: string;
  relatedFormulas?: string[];
  unit?: string;
}

export interface ComparisonTableData {
  entities: string[];
  features: Record<string, string[]>;
  dontConfuse?: string;
}

export interface Algorithm {
  name: string;
  purpose: string;
  input: string;
  output: string;
  coreIdea: string;
  steps: string[];
  pseudocode: string;
  timeComplexity: string;
  spaceComplexity: string;
  whenToUse: string;
  commonMistake?: string;
}

export interface ExamQuestions {
  twoMark: string[];
  fiveMark: string[];
  tenMark: string[];
  examAnswerStructure?: string[];
}

export interface Concept {
  id: string;
  title: string;
  priority?: ExamPriority;
  definition?: Definition;
  coreIdea?: string;
  howItWorks?: string[];
  keyPoints?: string[];
  formula?: Formula;
  diagram?: string;
  example?: string;
  advantages?: string[];
  limitations?: string[];
  commonMistakes?: string[];
  memoryHook?: string;
  comparison?: ComparisonTableData;
  algorithm?: Algorithm;
  examQuestions?: ExamQuestions;
  isPrerequisite?: boolean;
  isOptional?: boolean;
}

export interface Subtopic {
  id: string;
  title: string;
  concepts: Concept[];
}

export interface Topic {
  id: string;
  title: string;
  subtopics: Subtopic[];
}

export interface Unit {
  id: string;
  title: string;
  overview: string;
  topics: Topic[];
}

export interface Subject {
  id: string;
  title: string;
  units: Unit[];
}
