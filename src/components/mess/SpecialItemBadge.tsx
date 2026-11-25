"use client";

export function SpecialItemBadge({ subline }: { subline?: string | null }) {
  if (!subline) return null;
  return (
    <div className="mt-4 rounded-full bg-black/25 px-5 py-2 text-lg font-semibold text-white">
      {subline}
    </div>
  );
}
