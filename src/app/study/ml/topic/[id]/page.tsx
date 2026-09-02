"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { TOPIC_MAP } from "../../data";
import { MlCheatCard } from "../../components/MlCheatCard";

export default function MlTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const topic = TOPIC_MAP[id];
  if (!topic) return notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <MlCheatCard topic={topic} />
    </div>
  );
}