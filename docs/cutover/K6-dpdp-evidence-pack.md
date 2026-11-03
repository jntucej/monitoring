# DPDP evidence pack (K6)

If the Data Protection Board of India asks, you have seven days to produce this. For a gate system handling minors' data, this is not optional.

## The Board's questions, your answers, and where the evidence lives

| # | Question | Your answer | Evidence location |
|---|----------|-------------|-------------------|
| 1 | Defensible consent architecture — logged, granular, one-click withdrawal? | Gate scan requires consent at enrolment; withdrawal via `/student/profile/privacy`; consent rows in `consent_records` | `consent_records` table + `/api/me/consent` |
| 2 | Privacy notice in English + Eighth Schedule languages? | English + Telugu published; additional languages on request | [URL] + screenshot |
| 3 | Data inventory and processing map, current within 90 days? | `docs/DATA-INVENTORY.md`, last updated [DATE] | doc + git log |
| 4 | Retention and deletion enforced in code? | `retention_policies` table drives `cleanup_ephemeral.js`; audit is 5-year, movement logs 1-year | `retention_policies` + worker job |
| 5 | Data Principal rights portal — access, correction, erasure, grievance? | `/api/users/me/export`, `/student/profile/privacy`, support ticket channel | route list + UI |
| 6 | Breach notification playbook with named owners, templates, 24-hour path? | §K6.1 below | this document |
| 7 | Reasonable security safeguards — encryption, access logs, MFA, monitored? | RLS + FORCE (H1), audit immutability (H2), posture dashboard (I2), drills (J) | `/sysadmin/security/posture` |
| 8 | Every processor/vendor under written DPDP-compliant contract with audit rights? | [List: S3, MSG91, LLM provider] — contracts at [location] | contracts folder |
| 9 | Children's data — verifiable parental consent, zero behavioural targeting? | If any student is under 18: verifiable guardian consent required at enrolment; no profiling | enrolment flow + `guardian_links` |
| 10 | Cross-border transfer position, including negative list monitoring? | [Where data is hosted — if AWS ap-south-1, in-country; if LLM is external, that's a transfer] | hosting + vendor docs |
| 11 | If SDF — India-based DPO, periodic DPIA, independent audit? | [Assess whether the college meets the SDF threshold] | DPIA doc if applicable |
| 12 | Evidence pack shareable with the Board within 7 days? | This document + the 11 above | [folder] |

### Two things that will bite you specifically

- **Biometrics.** Thumbprint and face-match are personal data under DPDP. The consent must be free, specific, informed, unconditional, and unambiguous — "pre-ticked boxes are not consent". If the enrolment form has a pre-ticked box, that is a violation.
- **Minors.** First-year B.Tech admits can be 17. Under DPDP, children's data needs verifiable parental consent and zero behavioural targeting — "a checkbox is not verification". The gate monitor does not do behavioural targeting (good), but it does profile movement patterns (curfew scores, outing summaries). If a student is under 18, those derived fields need parental consent at enrolment, and the parent must be able to see them.

**Penalty exposure:** failure to deploy reasonable security safeguards is the highest penalty tier — ₹250 crore. Not that a college will be fined that, but the Board uses it as the ceiling. The posture dashboard (I2) and drills (J) are the "operational evidence" that "documentation is necessary but not sufficient" demands.

## K6.1 — Breach notification playbook (one page)

Under the DPDP Rules there is no materiality threshold — every personal data breach is reportable to the Board and to affected Data Principals.

| Hour | Action | Owner |
|------|--------|-------|
| 0 | Detect. Open incident record. Declare Sev-1. | On-call |
| 1 | Contain: revoke sessions (`revoke-all-sessions.sh`), disable automation (`automation_controls`), snapshot forensic backup | SRE |
| 4 | Scope: which users, which fields, which time window. Write it down. | SRE + DPO |
| 12 | Draft notification to Board (template below) and to affected principals | DPO |
| 24 | Notify the Board. Notify affected principals (email + SMS where phone is known). Notify the Principal. | DPO + Principal |
| 72 | Remediation plan with dates. Post-incident review opened. | SRE lead |
| 7d | Evidence pack assembled for the Board (§K6) | DPO |

### Notification template (affected principal)

> **Subject:** Important security notice about your JNTUCEJ account
>
> On [DATE], we identified a security incident affecting [describe: e.g. "your name, roll number and gate entry records"]. We contained it at [TIME] on [DATE]. The data involved was: [list]. We have notified the Data Protection Board of India.
>
> What we have done: [revoked sessions, rotated credentials, patched the cause].
>
> What you can do: [change your password, watch for phishing].
>
> Questions: [DPO name], [email], [phone].
