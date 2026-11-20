/**
 * Primitives barrel — import everything from here in any dashboard page:
 *
 *   import { PeriodPicker, usePeriod, DeltaBadge, MiniSparkline,
 *            ReviewCard, ReviewEditor, useReviews, DurationBar,
 *            ScheduleStrip, RaiseIssueButton, useDispute,
 *            EditableField, useEditable, useExport } from "@/components/shared/primitives";
 */

// 1. Period selector
export { PeriodPicker } from "./PeriodPicker";
export type { PeriodPickerProps } from "./PeriodPicker";

// 2. Review / rating
export { ReviewCard, Stars } from "./ReviewCard";
export type { ReviewCardProps, ReviewData } from "./ReviewCard";
export { ReviewEditor } from "./ReviewEditor";
export type { ReviewEditorProps } from "./ReviewEditor";

// 3. Comparison delta
export { DeltaBadge } from "./DeltaBadge";
export type { DeltaBadgeProps } from "./DeltaBadge";

// 4. Time tracking
export { DurationBar, formatDuration } from "./DurationBar";
export type { DurationBarProps } from "./DurationBar";

// 5. Schedule panel
export { ScheduleStrip } from "./ScheduleStrip";
export type { ScheduleStripProps, ScheduleItem } from "./ScheduleStrip";

// 6. Dispute / raise issue
export { RaiseIssueButton } from "./RaiseIssueButton";
export type { RaiseIssueButtonProps } from "./RaiseIssueButton";

// 7. Edit-with-audit
export { EditableField } from "./EditableField";
export type { EditableFieldProps } from "./EditableField";

// Types
export { PERIOD_OPTIONS, getPeriod, inPeriod, formatPeriodRange } from "@/lib/period";
export type { Period, PeriodKey } from "@/lib/period";
