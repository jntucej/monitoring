import { Subject } from '@/types/cheatsheet';
export const acaData: Subject = {
  id: "aca",
  title: "Advanced Computer Architecture",
  units: [{
    id: "u1", title: "Unit 1", overview: "Overview",
    topics: [{
      id: "t1", title: "Topic 1",
      subtopics: [{
        id: "st1", title: "Subtopic 1",
        concepts: [{
          id: "c1", title: "Concept 1", priority: "🔥",
          definition: { text: "PRAM", keywords: ["pram"] }
        }]
      }]
    }]
  }]
};