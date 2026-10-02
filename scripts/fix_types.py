#!/usr/bin/env python3
"""Update types.ts: align ExitReason configs and student type rules with SEMANTICS doc."""

import re

path = "src/lib/types.ts"
content = open(path).read()

# 1. Replace EXIT_REASON_CONFIGS (short codes -> long strings, reduce to 4)
old_configs = '''export const EXIT_REASON_CONFIGS: ExitReasonConfig[] = [
  { code: "REG", name: "Regular", description: "Regular exit/entry", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: false, parentNotification: "silent" },
  { code: "HO", name: "Home Out", description: "Going home for overnight/weekend", applicableTo: ["HM", "HF"], maxDurationHours: 48, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "DO", name: "Day Out", description: "Full day outing", applicableTo: ["HM", "HF"], maxDurationHours: 8, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "SO", name: "Short Outing", description: "1-3 hours near college", applicableTo: ["HM", "HF"], maxDurationHours: 3, requiresApproval: false, parentNotification: "push", autoApproveTimeRange: "09:00-18:00" },
  { code: "EVT", name: "College Event", description: "Official college event", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: true, approvalBy: "faculty", parentNotification: "push" },
  { code: "MED", name: "Medical Emergency", description: "Medical emergency", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: false, parentNotification: "urgent" },
  { code: "BUS", name: "Bus Departure", description: "Leaving by college bus", applicableTo: ["DM", "DF"], requiresApproval: false, parentNotification: "silent" },
];'''

new_configs = '''export const EXIT_REASON_CONFIGS: ExitReasonConfig[] = [
  { code: "Regular", name: "Regular", description: "Regular exit/entry", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: false, parentNotification: "silent" },
  { code: "Home Out", name: "Home Out", description: "Going home for overnight/weekend", applicableTo: ["HM", "HF"], maxDurationHours: 48, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "Day Out", name: "Day Out", description: "Full day outing", applicableTo: ["HM", "HF"], maxDurationHours: 8, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "Leave", name: "Leave", description: "Leave application (covers medical, events, and other special cases)", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: true, approvalBy: "faculty", parentNotification: "push" },
];'''

if old_configs in content:
    content = content.replace(old_configs, new_configs)
    print("EXIT_REASON_CONFIGS: updated")
else:
    print("EXIT_REASON_CONFIGS: NOT FOUND (may already be updated)")

# 2. Replace STUDENT_TYPE_RULES allowedExitReasons
content = re.sub(
    r'allowedExitReasons: \["REG", "HO", "DO", "SO", "EVT", "MED"\]',
    'allowedExitReasons: ["Regular", "Home Out", "Day Out", "Leave"]',
    content
)
content = re.sub(
    r'allowedExitReasons: \["REG", "EVT", "MED", "BUS"\]',
    'allowedExitReasons: ["Regular", "Leave"]',
    content
)
print("STUDENT_TYPE_RULES: updated")

open(path, "w").write(content)
print("Done — types.ts written successfully")
