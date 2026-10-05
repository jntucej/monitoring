# Decisive Replacement Stack and Hardware BOM

**Decision date:** 18 September 2026  
**Goal:** replace Vercel and Supabase now, without creating a new lock-in.

## The recommended replacement

Use this stack:

```text
Frontend:        Next.js, packaged as a Docker container
Frontend host:   Render (or a Linux VM if you operate servers)
Backend API:     Fastify or NestJS, separate Docker container on Render
Database:        Managed PostgreSQL (Neon, Render Postgres, AWS RDS, or DO Managed PostgreSQL)
Authentication:  Keycloak (self-hosted) or Auth0/Clerk (managed OIDC)
File storage:    Cloudflare R2 or AWS S3 (S3-compatible API)
Rate limit/jobs: Upstash Redis or Redis/Valkey container
Devices:         On-campus edge gateway; it sends HTTPS events to the backend API
```

This is the best practical replacement because Docker + standard PostgreSQL + OIDC + S3 are portable. Later you can move from Render to Fly.io, DigitalOcean, AWS, Azure, Hetzner, or your own server without redesigning the system.

**Do not replace Supabase with Firebase.** Your project is relational—users, gates, passes, attendance, movement logs, audit logs, roles, and reporting all suit PostgreSQL. Firebase/Firestore would require a data-model rewrite and makes a later move harder.

## Why this is better than the current stack

| Current platform | Replacement | Benefit |
|---|---|---|
| Vercel Next.js deployment | Dockerized Next.js on Render | Same source code can move to any container host. |
| Supabase server routes/database client | Separate Fastify/NestJS API | One backend controls authorization, audit logs, device ingestion, and business rules. |
| Supabase PostgreSQL | Managed PostgreSQL | Standard `pg_dump`/`pg_restore` migration path. |
| Supabase Auth | OIDC provider | Standard JWT/OIDC, usable by web, mobile, kiosks, and future services. |
| Supabase Storage | Cloudflare R2/AWS S3 | S3 API is portable; MinIO can replace it locally. |
| Vercel Cron | Queue worker + scheduler | Works on any host; no provider-specific cron route. |

## Alternatives that will actually work

### Alternative 1 — recommended: Render + managed PostgreSQL

Use Docker containers for the Next.js frontend and Fastify/NestJS backend. Use managed PostgreSQL and a managed Redis service.

- Best for: a small team that wants managed deployment with a low operational workload.
- Hardware: no web/database server to buy.
- Migration later: move the Docker images and PostgreSQL dump to another platform.
- Risk: Render remains a service provider, but it does not own your code, container format, database format, authentication standard, or object-store format.

### Alternative 2 — strongest portability: two Linux virtual machines + managed PostgreSQL

Run Docker on two Ubuntu LTS VMs: one for Next.js/frontend and one for the API/worker. Keep PostgreSQL managed at first.

- Best for: organizations with a system administrator.
- Host choices: DigitalOcean Droplets, AWS EC2, Azure VM, Hetzner Cloud, or a data-center VPS.
- Hardware: no campus web server is required if using cloud VMs.
- Risk: you own OS patching, TLS renewal, logging, incident response, and availability.

### Alternative 3 — private/college data center: self-hosted Docker + PostgreSQL

Run a high-availability virtualized cluster at the college or a colocated data center.

- Best for: written compliance requirement that data must remain on-premises.
- Hardware: application servers, database server, backup server, firewall, rack, online UPS, and operational support.
- Risk: highest up-front cost and highest responsibility. Do not choose it just to avoid SaaS bills.

## What must be built before the replacement goes live

1. Create a separate `backend-api` service using Fastify or NestJS.
2. Move every sensitive Supabase query and service-role action into the backend API.
3. Keep only typed REST/OpenAPI calls in frontend pages and components.
4. Replace Supabase Auth with OIDC JWT verification in the API.
5. Use PostgreSQL migrations in the backend repository; preserve the existing relational schema.
6. Move file upload/download logic behind S3-compatible signed URLs.
7. Use Redis/Valkey for rate limits, retries, queues, and short-lived caching.
8. Deploy frontend/API as Docker images; scan images in CI.
9. Build the edge gateway event API before moving any live biometric device.
10. Cut over through staging first; retain a read-only Supabase copy for rollback until the new system is verified.

## Exact project hardware you need

### Hardware that is required even when frontend/backend are cloud hosted

| Component | Recommended working specification | Why it is used | Reference price in India |
|---|---|---|---:|
| Edge gateway | Intel N100/N150 mini-PC, 16 GB RAM, 512 GB NVMe, **two Intel Ethernet ports**, Ubuntu LTS | Permanently polls/pushes biometric events, holds encrypted offline queue, retries cloud uploads, and reports device health. | ₹30,000–₹50,000 |
| Biometric terminal | Documented vendor API/SDK, Ethernet, local event buffer, UPS-compatible PSU | Identifies users and emits attendance/movement events. Confirm H0201 protocol before buying more units. | ₹12,000–₹35,000 per gate |
| Operator tablet/kiosk | 10–12 inch Android/Windows, 8 GB RAM, 128 GB storage, Wi-Fi 6 | Runs operator dashboard, approvals, and manual entry. | ₹18,000–₹45,000 per gate |
| QR scanner | **Zebra DS2208** or **Honeywell Voyager 1470g-class**, wired USB 2D HID | Fast, no-battery scan input for QR passes. | ₹5,600–₹9,500 |
| Managed PoE switch | 8-port Gigabit managed PoE+ switch, VLAN, 53 W+ power budget | Connects device VLAN and powers compatible cameras/access points. | ₹6,600–₹15,000 |
| UPS (gate rack) | APC BR1500G-IN, 1500 VA / 865 W, or equivalent | Keeps gateway, switch, router and kiosk powered through a short outage. | ₹17,449 reference listing; budget ₹17,000–₹22,000 |
| Locked cabinet + PDU + surge protection | Ventilated steel enclosure | Physical protection for networking/gateway equipment. | ₹5,000–₹15,000 |
| Cat6, conduits, install | Site-survey based | Reliable wired connectivity and safe installation. | ₹10,000–₹40,000 per gate area |

**Actual expected hardware cost for one complete gate:** **₹1.0–₹2.2 lakh**, excluding camera/NVR and recurring internet/SaaS charges. The range exists because terminal choice, kiosk type, cable distance, and electrical work vary by campus.

### Shared hardware for all gates

| Component | Recommended working specification | Why it is used | Planning price |
|---|---|---|---:|
| Firewall/router | Business firewall with VLAN, VPN, dual-WAN failover, IPS | Isolates gate IoT devices and provides safe remote maintenance. | ₹30,000–₹1,20,000 |
| Core PoE switch | 24-port managed Gigabit PoE+, SFP uplinks, VLAN, adequate PoE budget | Connects multiple gates/cameras. | ₹25,000–₹80,000 |
| Internet failover | Fiber primary + 4G/5G backup router/SIM | Prevents lost sync during ISP outage. | ₹8,000–₹25,000 + monthly plan |
| Online UPS for central rack | 2–3 kVA online pure sine-wave UPS | Supports firewall, core switch, NVR/NAS, and optional on-prem servers. | ₹45,000–₹1,50,000 |
| NAS for local backup | 4-bay NAS + 4 NAS-grade disks, encrypted backups | Holds secondary backups only; it is not the primary production database. | ₹90,000–₹2,25,000 |
| 12U–24U lockable rack | Patch panels, cable management, grounding | Keeps central equipment secure and serviceable. | ₹20,000–₹55,000 |

## Hardware required only if you self-host frontend and backend

You **do not need these servers** for Render/Fly.io/DigitalOcean/AWS managed hosting. Buy them only for Alternative 3 or a private-data-center requirement.

| Server | Minimum production specification | What it runs | Planning price |
|---|---|---|---:|
| Application server A | 8–16 physical cores, 64 GB ECC RAM, 2×1 TB enterprise NVMe mirror, dual 10 GbE | Next.js frontend, Fastify/NestJS API, background workers | ₹1.5–₹3.0 lakh |
| Application server B | Same as server A | Failover/high availability | ₹1.5–₹3.0 lakh |
| PostgreSQL database server | 16+ cores, 128 GB ECC RAM, 2×1.92 TB enterprise NVMe mirror, hardware RAID/HBA, dual 10 GbE | Primary PostgreSQL database | ₹3.0–₹6.5 lakh |
| Backup server/NAS | 4–8 bays, encrypted storage, separate physical location | Daily backups and recovery testing | ₹1.0–₹3.0 lakh |

**Minimum credible private production platform:** ₹7–₹16 lakh for servers, plus network, online UPS, rack, cooling, installation, backup software, and yearly support. For a real high-availability database, add a second database server and replication design.

## DeepSeek hardware — only if AI must be local

The gate system itself does not require DeepSeek. Buy AI hardware only after the access-control platform is working.

| AI choice | Required components | Capable model class | Planning price |
|---|---|---|---:|
| Hosted model API | No GPU hardware | Provider-hosted models | ₹0 hardware |
| Local small assistant | 16 GB VRAM GPU, 64 GB RAM, 2 TB NVMe, 1500 VA UPS | 7B–14B quantized models | ₹1.75–₹3.5 lakh |
| Local recommended assistant | 24 GB VRAM GPU, 64–128 GB RAM, 2 TB NVMe, 10 GbE, suitable PSU/cooling | 14B–32B quantized models | ₹3–₹6.5 lakh |
| Full 671B DeepSeek class | Multi-GPU datacenter design | R1/V3-class full model | ₹50 lakh+; do not buy for initial campus use |

GPU pricing is currently exceptionally unstable: public India listings for an RTX 5090 32 GB span roughly ₹2.69 lakh–₹6.20 lakh. Do not use one web price as a purchase budget; obtain three authorized-dealer quotations with warranty.

## The network and data flow after replacement

```text
Student/operator browser
  → Next.js frontend (Render or VM)
  → Backend API (Fastify/NestJS)
  → PostgreSQL / Redis / S3 storage / OIDC provider

Biometric terminal
  → campus IoT VLAN
  → edge gateway (offline encrypted queue)
  → authenticated backend device-ingestion API
  → PostgreSQL movement/audit records
```

- Browser clients never receive database credentials.
- Biometric terminals never accept incoming connections from the public internet.
- The edge gateway sends outbound HTTPS only.
- The API verifies device identity, signature/token, timestamp, and idempotency key before recording a scan.
- Device raw logs, movement records, audit logs, and backups have separate retention policies.

## What I would buy and deploy for this project

For a practical first replacement:

1. **Render** for two Docker services: `frontend` and `backend-api`.
2. **Managed PostgreSQL** on Neon or Render PostgreSQL; export/restore tested with `pg_dump`.
3. **Keycloak** (if your college can run it) or **Auth0/Clerk** (if you prefer managed OIDC).
4. **Cloudflare R2** for documents/uploads.
5. **Upstash Redis** for rate limits and queues.
6. One **Intel N100/N150 16 GB / 512 GB dual-LAN gateway** per physically separated gate zone—not necessarily one per gate if the same LAN is reliable.
7. One **APC BR1500G-IN** (or business-grade equivalent) per gate cabinet.
8. One managed VLAN-capable PoE switch per cabinet/zone.
9. No AI/GPU server until an approved feature requires local AI.

## Price sources used for reference

- [TP-Link TL-SG2210P specification](https://www.tp-link.com/in/service-provider/smart-switch/tl-sg2210p/)
- [Recent India listing: TL-SG2210P at ₹6,603](https://www.moglix.com/tp-link-tl-sg2210p-8-port-gigabit-smart-poe-switch-with-2-combo-sfp-slots/mp/msnvk13qx4o891)
- [APC BR1500G-IN, 1500 VA/865 W, ₹17,449 listing](https://www.moglix.com/apc-black-865w-ups-inverter-br1500g-in/mp/msn2vl3l8maq11)
- [2D scanner India ranges and Zebra/Honeywell class pricing](https://techdepot.in/blogs/news/best-2d-barcode-scanner-for-shop-billing-india-2026-guide)
- [Honeywell 1472G price reference](https://www.nehruplacemarket.com/barcode-scanner-price.html)
- [RTX 5090 32 GB India price tracker](https://getpc.co.in/parts/gpu/rtx-5090-32gb)

