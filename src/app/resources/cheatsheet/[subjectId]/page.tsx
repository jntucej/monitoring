import React from 'react';
import { notFound } from 'next/navigation';
import { CheatSheetApp } from '@/components/cheatsheet/CheatSheetApp';
import { atcdData } from '@/data/cheatsheet/atcd';
import { dccnData } from '@/data/cheatsheet/dccn';
import { acaData } from '@/data/cheatsheet/aca';
import { aiData } from '@/data/cheatsheet/ai';

export const metadata = {
  title: 'Master Cheat Sheet',
  description: 'Reactive master exam cheat sheet for rapid revision.',
};

const getSubjectData = (id: string) => {
  switch (id) {
    case 'atcd': return atcdData;
    case 'dccn': return dccnData;
    case 'aca': return acaData;
    case 'ai': return aiData;
    default: return null;
  }
};

export default function SubjectCheatSheetPage({ params }: { params: { subjectId: string } }) {
  const subjectData = getSubjectData(params.subjectId);
  
  if (!subjectData) {
    notFound();
  }

  return <CheatSheetApp subject={subjectData} />;
}
