import { Subject } from '@/types/cheatsheet';
import { ALL_AUTOMATA_TOPICS, AUTOMATA_UNITS } from '@/app/study/automata/data';

export const atcdData: Subject = {
  id: "atcd",
  title: "IT501PC: Automata Theory and Compiler Design",
  units: Object.values(AUTOMATA_UNITS).map(u => ({
    id: u.id,
    title: u.title,
    overview: u.description,
    topics: ALL_AUTOMATA_TOPICS.filter(t => t.unit === u.id).map(t => ({
      id: t.id,
      title: t.title,
      subtopics: [{
        id: `${t.id}-sub`,
        title: t.category,
        concepts: [{
          id: `${t.id}-concept`,
          title: t.title,
          priority: t.importance === 'HIGH' ? '🔥' : t.importance === 'MEDIUM' ? '🟠' : '🟡',
          definition: { text: t.definition, keywords: t.keywords || [] },
          coreIdea: t.coreIdea,
          formula: t.formula ? {
            expression: t.formula.expression,
            variables: t.formula.symbols || {},
            whenToUse: t.formula.use || 'General application'
          } : undefined,
          algorithm: t.steps ? {
            name: t.title,
            purpose: t.memoryTrigger,
            input: 'Formal definition/State',
            output: 'Resulting machine/Minimized state',
            coreIdea: t.coreIdea || '',
            steps: t.steps,
            pseudocode: '',
            timeComplexity: 'O(n)',
            spaceComplexity: 'O(n)',
            whenToUse: 'Exam problems'
          } : undefined,
          rawTopic: t
        } as any]
      }]
    }))
  }))
};
