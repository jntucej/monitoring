"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { getTopic } from "../../../_ml";
import { TopicView } from "../../../_ml/TopicView";

export default function MlTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const topic = getTopic(id);
  if (!topic) return notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <TopicView topic={topic} />
    </div>
  );
}