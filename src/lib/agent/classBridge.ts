export type DoubtTopic =
  | "academic"
  | "timetable"
  | "exam"
  | "hostel"
  | "curfew"
  | "campus"
  | "policy";

export interface AuthorityRoute {
  topic: DoubtTopic;
  target_role: string;
  escalation_chain: string[];
}

const TOPIC_ROUTES: Record<DoubtTopic, { target_role: string; escalation_chain: string[] }> = {
  academic: { target_role: "faculty", escalation_chain: ["faculty", "hod"] },
  timetable: { target_role: "faculty", escalation_chain: ["faculty", "hod"] },
  exam: { target_role: "exam_branch", escalation_chain: ["exam_branch", "oie"] },
  hostel: { target_role: "deputy_warden", escalation_chain: ["deputy_warden", "hostel_manager"] },
  curfew: { target_role: "deputy_warden", escalation_chain: ["deputy_warden", "hostel_manager"] },
  campus: { target_role: "admin", escalation_chain: ["admin", "vice_principal", "principal"] },
  policy: { target_role: "admin", escalation_chain: ["admin", "vice_principal", "principal"] },
};

export function resolveAuthorityRoute(topic: DoubtTopic): AuthorityRoute {
  const route = TOPIC_ROUTES[topic] ?? TOPIC_ROUTES.academic;
  return {
    topic,
    target_role: route.target_role,
    escalation_chain: route.escalation_chain,
  };
}

export function isPersonalStudentQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(my attendance|my marks|my fee|my fees|my pass|my gate pass|my room|my leave|my outpass|my fine)\b/.test(
    lower,
  );
}
