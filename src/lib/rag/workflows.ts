
import { ROLE_PROFILES } from "./roles";

export type WorkflowKey = "hostel" | "exam" | "memo" | "staff_leave";

interface WorkflowDef {
  key: WorkflowKey;
  labelEn: string;
  labelTe: string;
  chain: { stage: string; role: string }[];
}

export const WORKFLOWS: WorkflowDef[] = [
  {
    key: "hostel",
    labelEn: "Hostel pass",
    labelTe: "హాస్టల్ పాస్",
    chain: [
      { stage: "student_request",     role: "student" },
      { stage: "warden_approval",     role: "principal" },
      { stage: "completed",           role: "system" },
    ],
  },
];

export function describeChain(wf: WorkflowDef, lang: "en" | "te"): string {
  const names = wf.chain.map((s) => {
    const p = ROLE_PROFILES[s.role];
    if (!p) return s.role;
    return lang === "te" ? p.displayNameTe : p.displayName;
  });
  return names.join(" → ");
}
