# User-level customization & personalization — how it works

The app personalizes every user's experience without asking for it in the UI:
a **preference cascade** decides what value to show, **traits** add context-aware
overrides, and a small set of **explicit settings** are the only things a user
is ever asked to choose. This doc is the source of truth for that layer.

> Verified live: `GET/PATCH /api/preferences`, `GET /api/preferences/theme`,
> `GET /api/traits/context` all return 200; a `PATCH` write persists to
> `public.user_preference_overrides` and reads back correctly.

## The three layers

1. **Preference cascade** (`useEffectivePref` / `resolvePref`) — every visible
   value is resolved through a fixed 6-layer priority chain.
2. **Traits** (`useActiveTraits`, `/api/traits/context`) — context signals
   (exam week, night shift, chronic medical, monsoon, role-new vs veteran …)
   that can override *specific* preference keys.
3. **Explicit settings** — the only user-chosen values, stored in
   `public.personalization_prefs` (quiet hours, density, digest time, consent).
   These are ASKED, never inferred.

## 1. The preference cascade (the core mechanism)

Read anywhere in the app with:

```ts
const { value, source, rank, locked } = useEffectivePref("appearance.density");
```

The value comes from the **highest layer that has a value**:

```
policy   (rank "required" value, or system default when policy is silent)
   ↓
user     (the person's own stored override — /api/preferences)
   ↓
trait    (an active trait's scoped override for THIS key, highest-priority trait first)
   ↓
persona  (day_scholar vs hosteller default)
   ↓
role     (per-role default)
   ↓
system   (the registry default — bottom of the chain)
```

`resolvePref` returns which layer won (`source`), the key's safety `rank`,
and whether a "required" policy value is in effect (`locked`). When `locked`
is true the UI shows a 🔒 "Set by institute" indicator and the user's choice
is stored (for audit) but **not** applied.

### Rank — the safety rail
Every key has one of three ranks, declared in `src/lib/preferences/registry.ts`:

| Rank | Meaning |
|---|---|
| `required` | Policy value wins; the user's stored choice is kept for audit but never applied. UI shows the lock. A shell cannot promote a key to `required` — ranks live only in the registry. |
| `recommended` | User value wins, but a soft warning is shown when the user deviates from the recommended value. |
| `cosmetic` | Fully the user's choice. |

The rule encoded here: *"You can hide decoration. You cannot hide
compliance."* E.g. a `required` curfew-alert key can't be muted by a student
even if they try; a `cosmetic` theme can.

## 2. The preference registry (91 keys, 10 categories)

The registry is the single source of truth — a preference key that isn't in it
doesn't exist, and the API **rejects** unknown keys on `PATCH` (drift
guardrail). New preference = add a row here, not a file in a role.

| Category | # keys | Example keys (rank) |
|---|---|---|
| `appearance` | 7 | `appearance.theme` (cosmetic, graphite\|sakuga, female-gated), `appearance.density`, `appearance.fontSize`, `appearance.accent`, `appearance.motion` |
| `language_format` | 6 | `language.ui`, `language.sms`, `format.date`, `format.time`, `format.firstDayOfWeek`, `language.digest` |
| `navigation` | 11 | `nav.sidebarCollapsed`, `nav.landingTab`, `nav.mobileBottomBar`, `onboarding.tour.show`, `curfew.liftForStudy` (recommended) |
| `dashboard` | 17 | `dashboard.widgetOrder`, `dashboard.widgetVisibility`, `pass.defaultType`, `pass.template`, `dashboard.defaultPeriod` |
| `notifications` | 21 | `notifications.class_reminder` (recommended), `notifications.curfew_approaching` (recommended), `notifications.meal_cutoff` (recommended) |
| `quick_actions` | 2 | `quick_actions.selected`, `quick_actions.order` |
| `lists_filters` | 13 | `lists.pageSize`, `lists.defaultSort`, `lists.savedViews`, `lists.visibleColumns` |
| `privacy_share` | 6 | `privacy.parentVisibility`, `privacy.peerVisibility`, `privacy.facultyVisibility`, `emergency.contactOrder` (recommended) |
| `accessibility` | 5 | `a11y.reduceMotion`, `a11y.highContrast`, `a11y.largeText`, `a11y.keyboardShortcuts` |
| `personal_goals` | 3 | `goals.attendanceTarget`, `goals.mealsPerWeek`, `goals.sleepSchedule` (recommended) |

**Persona defaults** (the `persona` layer): day scholar vs hosteller get
different defaults for dashboard widget set, pass defaults, and curfew focus.
**Role defaults**: each of the ~26 roles has a role-level default set (e.g.
faculty default density, operator default list columns).

**Trait-scope guardrail**: a key may only be overridden by the traits listed
in its `scopedBy` array. E.g. `appearance.theme` is `scopedBy:["shift_night"]`
— no other trait may touch it. A conformance test enforces that a
`trait_overrides` row references only a key whose `scopedBy` includes that
trait. This is how "a medical trait accidentally silences curfew alerts" is
structurally impossible.

## 3. Traits (context-aware overrides)

`useActiveTraits()` + `GET /api/traits/context` derive the user's active
context signals *for this moment* (time, calendar, roster, weather, on-call).
Active traits (~30) include:

`exam_week`, `child_in_exam_week`, `semester_start`, `monsoon`, `on_call`,
`shift_morning/evening/night`, `faculty_senior`, `faculty_new`, `role_new`,
`role_veteran`, `tech_novice`, `sports_athlete`, `scholarship`,
`medical_acute`, `medical_chronic`, `parent_distant`, `parent_working`,
`parent_multiple_children`, `parent_language_hi`, `local`, `distant`,
`language_hi`, `language_regional`, `block_specific`, `oversight_analytics`,
`oversight_compliance`, `placement_active`.

A trait only influences a preference key when that key's `scopedBy` includes
the trait (see guardrail above). The trait layer sits **below** the user's own
explicit choice and **above** persona/role/system defaults.

## 4. Explicit settings (the only things a user is asked to choose)

Stored in `public.personalization_prefs` (one row per user, via
`src/lib/personalization/prefs.ts`). The "creepy line" is enforced at the API:
these are ASKED, never inferred from behavior.

| Field | Default | Meaning |
|---|---|---|
| `quiet_start` / `quiet_end` | `23:00` / `08:00` | No non-urgent notifications in this window. |
| `density` | `short` | How much detail the assistant/digest shows. |
| `digest_time` | `08:00` | When the daily digest is delivered. |
| `consent_given` / `consent_at` | `false` / `null` | Raw-review / data-consent flag (gates sensitive views). |

Set at onboarding or `/settings`; missing row → defaults; never throws.

## 5. Where customization is set (UI)

- **`/settings`** (all roles) — password, notification channel/event
  toggles (`/api/notifications/preferences`), and theme/appearance.
- **`/settings/notifications`** — per-channel, per-event-type notification
  prefs (map to the `notifications.*` keys).
- **Theme picker** (`ThemePicker`) — gender-gated: female students get
  `graphite` + `sakuga`; male/unknown get `graphite` only.
- **Dashboard** — `dashboard.widgetOrder` / `widgetVisibility` let a user
  reorder/hide widgets *within* their persona's allowed set (the persona
  still decides which widgets exist).
- **Admin-only**: `/admin/notification-settings` and the **policy layer**
  (sysadmin/admin set `required`-rank policy overrides that win over every
  user).

## 6. API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/api/preferences` | GET | Returns the user's stored overrides (`user` layer) as `{ prefs }`. |
| `/api/preferences` | PATCH | Body `{"prefs": { "<key>": <value>, ... }}`. Rejects unknown keys. For `required`-rank keys the value is stored but reported in `lockedByPolicy` (not applied). Merges into the user's JSONB row. Needs a same-origin request (Origin/Sec-Fetch-Site CSRF check). |
| `/api/preferences/theme` | GET, PATCH | Get/set `ui_theme` (graphite / sakuga). |
| `/api/notifications/preferences` | GET, PATCH | Per-channel / per-event notification toggles. |
| `/api/traits/context` | GET | Derives the live trait set for the user (time, exam week, roster, weather, on-call). |
| `/api/me/workspace` | GET | The "what does this person see right now" context (presence + capability + residential/entry status) — drives persona-aware rendering. |

## 7. Data flow (end-to-end)

1. On load, a shell calls `useEffectivePref(key)`. The hook lazily fetches
   `/api/preferences` (user layer), reads `usePersona()` + `useActiveTraits()`
   (via `/api/traits/context`), and the role from the auth store.
2. `resolvePref(key, {policy, user, traits, persona, role, system})` walks the
   chain and returns `{value, source, rank, locked, userValue}`.
3. UI renders `value`; shows the 🔒 when `locked`; shows a soft warning when
   `rank=recommended` and the user deviated.
4. When a user changes a setting, the UI `PATCH /api/preferences` (or
   `/api/preferences/theme` / `/api/notifications/preferences`). The server
   validates every key against the registry, merges into
   `user_preference_overrides` (JSONB), and returns which keys are
   `lockedByPolicy`.
5. Admins/sysadmin write the **policy** layer, which can pin a key to a
   `required` value that beats all users — the only way a user's choice is
   overridden (and it's visible via `locked`).

## 8. Security & invariants

- **Drift guardrail**: unknown preference keys are rejected by the API; only
  registry keys exist. A new UI cannot invent a key.
- **Compliance floor**: `required` keys (e.g. curfew/attendance/safety
  alerts) can't be muted by users; policy owns them and the lock is surfaced.
- **Trait isolation**: traits may only touch their `scopedBy` keys — no
  cross-domain leakage (a medical trait can't affect notification safety).
- **Per-user storage**: `user_preference_overrides` is keyed by `user_id`; a
  user only ever reads/writes their own row. RLS applies.
- **CSRF**: state-changing pref writes require a same-origin request (Origin
  / Sec-Fetch-Site), matching the app-wide CSRF posture.
- **No behavior inference**: the only things set are the 4 explicit prefs;
  the bot remembers schedule history, never inferred user behavior.

## 9. The one rule for "who am I" display (ties into role docs)

Customization shows the **human** identifier (roll / unique_id / email), never
the internal UUID — except `sysadmin`, the only role cleared to see internal
identifiers (`isSuperAdmin(role)`). This is set once in the profile chip and
reflected across all role docs.
