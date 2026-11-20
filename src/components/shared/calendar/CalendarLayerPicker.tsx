/**
 * shared/calendar/CalendarLayerPicker.tsx — the "layers" of a student's
 * unified calendar: which categories to show (classes, passes, meals,
 * curfew, events, exams, holidays). This is the "unified view" of the
 * calendar loop. It just emits the selected category codes; the calendar
 * itself (UnifiedCampusCalendar) already keys off followedCategories.
 */

"use client";

import { Calendar, Clock, Utensils, ShieldCheck, Trophy, GraduationCap, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarLayer {
  code: string;
  label: string;
  icon: string;
  /** Default on. */
  defaultOn?: boolean;
}

export const STUDENT_CALENDAR_LAYERS: CalendarLayer[] = [
  { code: "class", label: "Classes", icon: "GraduationCap", defaultOn: true },
  { code: "event", label: "Events", icon: "Trophy", defaultOn: true },
  { code: "pass", label: "Passes", icon: "ShieldCheck", defaultOn: true },
  { code: "meal", label: "Meals", icon: "Utensils", defaultOn: true },
  { code: "curfew", label: "Curfew", icon: "Clock", defaultOn: true },
  { code: "exam", label: "Exams", icon: "Calendar", defaultOn: true },
  { code: "holiday", label: "Holidays", icon: "Home", defaultOn: false },
];

const LAYER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Trophy,
  ShieldCheck,
  Utensils,
  Clock,
  Calendar,
  Home,
};

export interface CalendarLayerPickerProps {
  /** The currently-visible category codes. */
  selected: string[];
  /** Called with the next selection when a layer is toggled. */
  onToggle: (code: string) => void;
  /** Class name. */
  className?: string;
}

export function CalendarLayerPicker({ selected, onToggle, className }: CalendarLayerPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {STUDENT_CALENDAR_LAYERS.map((layer) => {
        const Icon = LAYER_ICONS[layer.icon] ?? Calendar;
        const on = selected.includes(layer.code);
        return (
          <button
            key={layer.code}
            type="button"
            onClick={() => onToggle(layer.code)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              on
                ? "border-action-primary/40 bg-action-primary/10 text-action-primary"
                : "border-border text-text-muted hover:bg-bg-elevated",
            )}
          >
            <Icon className="h-3 w-3" />
            {layer.label}
          </button>
        );
      })}
    </div>
  );
}

export default CalendarLayerPicker;
