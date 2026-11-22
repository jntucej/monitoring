# Entity Inspection System — the standardized "inspect" experience

> Every important UI object has a **predictable** inspection hierarchy.
> Users never hunt for information: element → quick overview → context →
> history/relationships → actions → full detail.

## The hierarchy

```
ELEMENT (KPI card, table row, alert card, decision row)
   ↓ hover / focus          HoverPreview (tooltip layer — quick facts)
   ↓ click                  EntityInspector (side drawer — context + history + actions)
   ↓ "full detail" footer   Detail page (deepest layer: full record + history)
```

## Components (src/components/shared/)

| Component | Role |
|---|---|
| `EntityInspector.tsx` | The right-side drawer (bottom sheet on mobile). Data-agnostic: takes an `EntityInspection` model, not entity props. Includes `KVPairs`, `Timeline`, `ActionRow`, `InspectorButton` helpers. |
| `HoverPreview.tsx` | Hover/focus → compact preview card (the tooltip layer). Includes `MetricPreview` for KPI tiles. |
| `useEntityInspector.tsx` | The state hook: `inspect(model)` / `closeInspection()` — the single entry point every page composes. |

## The `EntityInspection` model (the contract)

```ts
interface EntityInspection {
  kind: string;              // "student" | "gate" | "alert" | "decision" | …
  title: string;             // display name
  subtitle?: string | null;  // identifier (roll, code, decision no)
  status?: ReactNode;        // state badge (ACTIVE / open / severity)
  sections: [                // overview → context → history → actions
    { title, content, collapsible? },
    …
  ];
  detailHref?: string;       // the deepest layer (full detail page)
  detailLabel?: string;
}
```

**Rules (enforced by `tests/unit/entity-inspection.test.ts`):**
1. The first section is always the quick-overview layer.
2. Long sections (history / timeline / relationships) must be `collapsible`.
3. Every model exposes either an **Actions** section **or** a `detailHref`.

## Wired pages (this pass)

| Page | Entity | Layers wired |
|---|---|---|
| `/admin/students` | Student | hover KPIs · click row → drawer (overview, hostel, actions) → full profile |
| `/admin/gates` | Gate | click row → drawer (overview, mode, actions) → telemetry page |
| `/admin/alerts` | Alert | click row → drawer (what, evidence/timeline, authority, resolve) |
| `/admin/passes` | Gate pass | hover KPIs · click row → drawer (overview, validity, actions) |
| `/admin/exceptions` | Scan exception | hover counts · click row → drawer (context, timeline, actions) |
| `/principal/attention` | Attention item | click card → drawer (what, suggested, timeline, act) |
| `/principal/decisions` | Decision | click row → drawer (provenance, reason, timeline, audit) |
| `/principal/escalations` | Escalation | click card → drawer (why, target, timeline, act) |
| `/principal` (home) | KPI tiles | hover previews + click → navigate to the deepest layer |

## Role-appropriate depth

The same drawer, different section sets per role — the Principal gets
**Actions** (resolve, delegate, audit) while an Operator gets read-only
**Context** only. The `sections` array is built by the page; the panel
renders whatever it's given. A role gate (`canAct` / role context) can
filter the Actions section per viewer without changing the model shape.

## What's next (backlog)

- **Cases** (`/principal` + the `case` entity from the institutional
  program): the same model, `kind: "case"`, with sections
  overview → risk → authority → decisions → actions.
- **Hostel / shift / incident entities**: same pattern, new section sets.
- **Per-role section filtering**: pass `canAct(actor, op)` results into
  the Actions section so each role sees only the actions it can take.
- **Keyboard navigation**: left/right arrows cycle open inspections;
  `i` opens the inspector for the focused row (screen-reader-friendly).
