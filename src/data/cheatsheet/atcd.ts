import { Subject } from '@/types/cheatsheet';

export const atcdData: Subject = {
  id: "atcd",
  title: "Automata Theory & Compiler Design",
  units: [
    {
      id: "u1",
      title: "Unit 1: Finite Automata & Regular Expressions",
      overview: "DFA, NFA, Regular Expressions, and Equivalence",
      topics: [
        {
          id: "t1",
          title: "Deterministic Finite Automata",
          subtopics: [
            {
              id: "st1",
              title: "DFA Basics",
              concepts: [
                {
                  id: "c1",
                  title: "DFA Formal Definition",
                  priority: "🔥",
                  definition: {
                    text: "A 5-tuple (Q, Sigma, delta, q0, F) recognizing regular languages deterministically.",
                    keywords: ["dfa", "deterministic", "automata"]
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export default atcdData;
