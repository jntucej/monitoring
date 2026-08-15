
# ═══════════════════════════════════════════════════════════════════════════════
# JNTUH-UCoEJ — COMPLETE SYSTEM ARCHITECTURE & MASTER PROMPT
# College: JNTUH University College of Engineering, Nachupally (Kondagattu)
# Location: Kodimyal Mandal, Jagtial Dist, Telangana — 505 501
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 0 — DESIGN SYSTEM BIBLE (Apply to ALL modules)
# ═══════════════════════════════════════════════════════════════════════════════

## 0.1 Typography Scale ( clamp() based, responsive )
- Display:    clamp(3rem, 6vw, 4rem)   / 1.05  / Weight 700
- H1:         clamp(2.25rem, 5vw, 3rem) / 1.1   / Weight 700
- H2:         clamp(1.5rem, 3vw, 2.25rem) / 1.15 / Weight 600
- H3:         clamp(1.125rem, 2vw, 1.5rem) / 1.2 / Weight 600
- Body:       1rem (16px) / 1.6 / Weight 400
- Small:      0.875rem (14px) / 1.5 / Weight 400
- Caption:    0.75rem (12px) / 1.4 / Weight 500
- Font Family: Inter or Geist (1 font ONLY)

## 0.2 Spacing Scale (4px base)
- 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
- NO random values like 17px, 23px, 13px

## 0.3 Color Palette (Maximum 5 colors per module)
### Public Website (Prestige Mode)
- Background:    #FAFAFA (light) / #0A0A0A (dark)
- Primary Text:  #171717 (light) / #FFFFFF (dark)
- Secondary:     #737373 (light) / #A1A1AA (dark)
- Border:        #E5E5E5 (light) / #27272A (dark)
- Accent:        #7C3AED (violet) — for CTAs, active states

### Admin / Security Dashboard (Authority Mode)
- Background:    #0F172A (slate-900)
- Surface:       #1E293B (slate-800)
- Primary Text:  #F8FAFC (slate-50)
- Secondary:     #94A3B8 (slate-400)
- Border:        #334155 (slate-700)
- Accent:        #10B981 (emerald-500) — success / present
- Alert:         #EF4444 (red-500) — absent / critical
- Warning:       #F59E0B (amber-500) — late / pending
- Info:          #3B82F6 (blue-500) — notification / in-progress

## 0.4 Layout Grid
- Container: width: min(1200px, calc(100% - 40px)); margin-inline: auto;
- Mobile: calc(100% - 24px)
- Grid: 12-column for desktop, 4-column for mobile
- Section padding: 96px vertical desktop, 64px mobile

## 0.5 Component Consistency
### Button Specs
- Height: 44px (mobile 48px for touch)
- Radius: 10px
- Horizontal padding: 20px
- Font: 14px / Weight 600
- Transition: all 180ms ease
- Hover: translateY(-2px) + subtle shadow

### Card Specs
- Radius: 16px
- Padding: 24px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Hover shadow: 0 8px 30px rgba(0,0,0,0.12)
- Border: 1px solid border-color

### Input Specs
- Height: 48px
- Radius: 10px
- Padding: 12px 16px
- Border: 1px solid border-color
- Focus: 2px accent ring

## 0.6 Motion Strategy
- Page entrance: opacity 0→1, translateY(20px→0), 400ms ease-out
- Cards hover: translateY(-4px), shadow transition, 200ms
- Buttons: translateY(-2px) on hover, 180ms
- Navigation scroll: background opacity + backdrop-blur(12px)
- Images hover: scale(1.03), 300ms
- NO bouncing, NO excessive parallax, NO giant cursor effects

## 0.7 Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px – 1024px
- Desktop: > 1024px
- Use container queries where possible


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — MODULE 1: PUBLIC COLLEGE WEBSITE (jntuhcej.ac.in Remake)
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 Content to Pull from Existing Site
- College Name: JNTUH University College of Engineering, Nachupally (Kondagattu)
- Address: Kodimyal Mandal, Jagtial Dist, Telangana — 505 501, India
- Contact: cej@jntuh.ac.in, 63025 03548
- Principal: Dr. G. Narsimha (Professor & Principal)
- HODs: Dr. K. Srinivas (Vice Principal), Dr. K. Shahu Chatrapati, Dr. Ch. Sridhar Reddy, Sri. C. Radha Charan
- Established: 2007
- Accreditation: NAAC A+ Grade
- Logo: JNTUH official logo + NAAC A+ badge

## 1.2 Page Structure & Navigation
### Top Bar (Announcement Strip)
- Height: 36px
- Background: Accent color
- Marquee text: Latest announcements, events, admissions
- Close button on right

### Navbar
- Height: 72px desktop, 64px mobile
- Left: College Logo + Short Name
- Center: Navigation links
  - Home | About | Academics | Departments | Admissions | Placements | Research | Campus Life | Contact
- Right: Search icon + Login button (for portal access)
- Mobile: Hamburger menu with slide-in drawer
- Scroll behavior: Glassmorphism backdrop-blur after 50px scroll

### Hero Section
- Full viewport height (100vh) or min(700px, 100vh)
- Left: Headline + Subheadline + CTA buttons
  - "Shaping Engineers, Building Futures"
  - "NAAC A+ Accredited | Autonomous | Est. 2007"
  - [Explore Programs] [Campus Tour]
- Right: Hero image / video loop of campus
- Background: Subtle gradient overlay on image
- Entrance animation: Staggered text reveal

### Stats Bar (Below Hero)
- 4-column grid
- Icons + Numbers + Labels
  - "2007" Established
  - "5" B.Tech Programs
  - "5" M.Tech Programs
  - "A+" NAAC Grade

### About Section
- 2-column layout (text left, image right)
- Principal's message or Vision & Mission
- "Gateway to Excellence" tagline

### Departments Section
- 5 cards in a row (desktop), 1 column (mobile)
- Cards for:
  1. Computer Science & Engineering (CSE)
  2. Information Technology (IT)
  3. Electronics & Communication Engineering (ECE)
  4. Electrical & Electronics Engineering (EEE)
  5. Mechanical Engineering (ME)
- Each card: Icon + Dept Name + Intake + "Explore →" link
- Hover: Card lifts + dept color accent border

### Academics Section
- Tabbed interface: UG Programs | PG Programs
- Table with: Course | Specialization | Duration | Intake
- B.Tech: CSE(60), IT(60), ECE(60), EEE(60), ME(60)
- M.Tech: CSE(18), IT(18), DSCE(18), EPS(18), Engg Design(18)

### Events / News Section
- Horizontal scroll cards or grid
- Event image + Date + Title + "Read More"
- Featured event: HACK INNOVA 2K26, Egnis'26, etc.

### Campus Gallery
- Masonry grid of campus photos
- Lightbox on click
- Categories: Infrastructure, Events, Sports, Labs

### Footer
- 4-column layout
  - Col 1: Logo + Address + Contact
  - Col 2: Quick Links
  - Col 3: Departments
  - Col 4: Newsletter + Social Icons
- Bottom bar: Copyright + Privacy + Terms

## 1.3 Pages to Build
1. Home (all sections above)
2. About Us (History, Vision, Mission, Principal's Desk)
3. Academics (Courses, Syllabus, Academic Calendar)
4. Departments (Individual dept pages with faculty, labs, achievements)
5. Admissions (Process, Eligibility, Fee Structure, Important Dates)
6. Placements (Stats, Recruiters, Testimonials)
7. Research (Projects, Publications, Collaborations)
8. Campus Life (Hostel, Sports, Clubs, Events)
9. Contact (Map, Form, Directory)
10. Login Portal (redirects to respective dashboard based on role)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — MODULE 2: GATE SECURITY & QR MONITORING SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 Core Concept
Every student has a QR code printed on their ID card. Security scans the QR at entry/exit gates. System logs timestamp, direction (IN/OUT), and triggers notifications to parents for OUT events (Home Out / Day Out / Leave).

## 2.2 User Roles & Access
| Role | Access Level | Devices |
|------|-------------|---------|
| Admin | Full CRUD, analytics, config | Desktop |
| Security Guard | Scan QR, view student profile, manual entry | Tablet/Mobile |
| Parent | View child's gate logs, receive notifications | Mobile App |
| Student | View own logs, request gate pass | Mobile App |

## 2.3 Data Model (Conceptual)
- Student: ID, Name, Roll No, Dept, Year, Section, Parent Phone, Parent Email, QR Code UUID, Photo
- GateLog: ID, StudentID, Timestamp, Direction (IN/OUT), GateLocation, SecurityGuardID, DeviceID, Reason (HomeOut/DayOut/Leave/Regular), Status (Auto/Manual)
- GatePass: ID, StudentID, RequestDate, FromTime, ToTime, Reason, ApprovedBy, Status (Pending/Approved/Rejected)
- Notification: ID, Type, Recipient, Message, Timestamp, ReadStatus

## 2.4 Interface Screens

### A. Security Guard Dashboard (Tablet-Optimized)
**Layout:**
- Top bar: Current time, Gate name, Security guard name
- Main area split:
  - LEFT (60%): Camera/QR Scanner viewfinder (full-bleed)
  - RIGHT (40%): Live scan results panel

**Scan Flow:**
1. Security opens app → Camera activates
2. Scans student QR → Beep sound + vibration
3. Right panel shows:
   - Student photo (circular, 80px)
   - Name + Roll No + Dept/Year
   - Last scan status ("Last OUT: Today 8:30 AM")
   - Direction toggle: [IN] [OUT]
   - If OUT: Reason dropdown (Home Out / Day Out / Leave / Regular)
   - [Confirm] button (large, full-width, 56px height)
4. On confirm:
   - Success animation (green checkmark, 1s)
   - Auto-reset to scanner after 2s
   - If OUT with reason → Trigger parent notification

**Recent Scans List (below scanner):**
- Table: Time | Name | Roll No | Direction | Reason
- Color coding: Green row = IN, Red row = OUT
- Search/filter by roll number

**Manual Entry Mode:**
- For damaged QR / forgotten ID
- Search by Roll Number → Select student → Mark IN/OUT
- Requires security guard PIN confirmation

### B. Admin — Gate Monitoring Dashboard
**Layout:** Dark mode authority dashboard

**Top KPI Cards (4-column):**
- Total Students IN Campus (live count)
- Total Students OUT Campus (live count)
- Today's Gate Scans (number)
- Pending Gate Pass Requests (number)
- Each card: Icon + Number + Trend indicator + Sparkline mini-chart

**Main Content — Two Panels:**

**Panel 1: Live Campus Strength (Left 65%)**
- Real-time number: "1,247 Students Currently IN"
- Large animated counter
- Breakdown by Department (horizontal bar chart)
- Breakdown by Year (donut chart)
- Timeline graph: Campus strength over today (hourly)

**Panel 2: Recent Activity Feed (Right 35%)**
- Scrollable list of latest scans
- Each item: Avatar + Name + "OUT — Home Out — 10:45 AM" + Gate name
- Color dot: Green (IN), Red (OUT), Yellow (Pending pass)
- Click → Full student gate history modal

**Panel 3: Gate Pass Management (Full width below)**
- Table: Student | Reason | From | To | Requested | Status | Actions
- Actions: [Approve] [Reject] [View Details]
- Filters: By dept, by date, by status

**Panel 4: Alerts & Anomalies (Bottom)**
- "Student X has not returned from Day Out (expected by 6 PM)"
- "Unusual OUT pattern detected for Roll No Y"
- "Gate 2 scanner offline"

### C. Parent Mobile App — Gate Notifications
**Notification Types:**
- "Your ward [Name] has LEFT campus at 4:30 PM. Reason: Home Out. Expected return: Tomorrow 8 AM."
- "Your ward [Name] has ENTERED campus at 8:15 AM."
- "Gate Pass Request: [Name] requests Day Out on [Date]. Approve?"

**Parent Dashboard:**
- Child profile card (photo, name, dept, year)
- Today's status: Large badge — "IN CAMPUS" (green) / "OUT" (red)
- Recent Activity: Timeline view (vertical line with dots)
- Gate Pass Requests: List with approve/reject buttons
- Weekly summary: Bar chart of IN/OUT times

### D. Student Mobile App — Gate Features
- Digital ID Card with QR (fullscreen, brightness auto-max)
- Gate Pass Request Form:
  - Reason dropdown
  - From Date/Time picker
  - To Date/Time picker
  - Submit → Goes to Admin + Parent for approval
- My Gate History: Calendar view with IN/OUT markers


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — MODULE 3: ATTENDANCE MANAGEMENT SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 Workflow (CR → Faculty → Approval)
1. CR opens app → Selects Subject + Date + Period
2. CR marks attendance for each student (Present/Absent/Late)
3. CR submits → Data forwarded to assigned Faculty
4. Faculty receives notification → Reviews attendance sheet
5. Faculty approves / edits / rejects with comments
6. Approved data stored → Visible to Admin, Students, Parents

## 3.2 User Roles & Access
| Role | Permissions |
|------|------------|
| Admin | View all attendance, analytics, configure subjects/faculty mapping |
| Faculty | Review & approve CR-submitted attendance for assigned subjects only |
| CR (Class Rep) | Mark attendance for own class/section/subjects only |
| Student | View own attendance only |
| Parent | View ward's attendance only |

## 3.3 Data Model (Conceptual)
- Subject: ID, Name, Code, Dept, Year, Semester, FacultyID
- Class: ID, Dept, Year, Section, CR_StudentID
- AttendanceSession: ID, SubjectID, ClassID, Date, Period, CR_ID, FacultyID, Status (Draft/Submitted/Approved/Rejected), SubmittedAt, ApprovedAt
- AttendanceRecord: ID, SessionID, StudentID, Status (Present/Absent/Late), Remarks
- AttendanceSummary: ID, StudentID, SubjectID, TotalClasses, PresentCount, AbsentCount, LateCount, Percentage

## 3.4 Interface Screens

### A. CR — Mark Attendance Interface
**Layout:** Mobile-first, clean table

**Step 1: Select Session**
- Dropdown: Subject (auto-filtered by CR's class)
- Date picker (default: today)
- Period selector: [1] [2] [3] [4] [5] [6] [7] [8]
- [Start Marking] button

**Step 2: Attendance Sheet**
- Header: Subject name + Date + Period + Total students
- List view (NOT table for mobile):
  - Each row: Student photo (40px circle) | Name | Roll No | [P] [A] [L] toggle
  - P = Present (green), A = Absent (red), L = Late (yellow)
  - Bulk actions: "Mark All Present" | "Mark All Absent"
- Search bar to find student quickly
- Counter at bottom: "Present: 42 | Absent: 3 | Late: 2"
- [Submit to Faculty] button (disabled until all marked)

**Confirmation Modal:**
- "You are about to submit attendance for [Subject] on [Date]"
- Summary preview
- [Confirm Submit] / [Go Back]

### B. Faculty — Review & Approve Interface
**Layout:** Desktop dashboard + mobile responsive

**Incoming Queue (Top Section):**
- Cards showing pending attendance sheets
- Each card: Subject | Date | Period | CR Name | Submitted time | "Review Now" button
- Badge: "Pending Approval" in amber

**Review Screen:**
- Split view:
  - Left: Attendance sheet (same as CR view but editable)
  - Right: Class statistics + Student history
- Faculty can:
  - Toggle any student's status
  - Add remarks per student
  - Add overall session remarks
- Action bar at bottom:
  - [Approve & Save] (green, primary)
  - [Reject & Send Back] (red, with reason input)
  - [Save as Draft] (ghost button)

**Faculty Analytics (Dashboard Tab):**
- My Classes overview
- Attendance percentage by subject (bar chart)
- Low attendance alerts: "5 students below 75% in [Subject]"
- Monthly trend line chart

### C. Student — My Attendance View
**Layout:** Mobile app screen

**Summary Card (Top):**
- Circular progress ring: "85% Overall Attendance"
- Color: Green (≥75%), Yellow (65-75%), Red (<65%)
- "You are safe" / "Attendance shortage alert" message

**Subject-wise Breakdown:**
- Accordion list:
  - Subject name + Code | Present/Total | Percentage bar
  - Expand → Monthly calendar with color-coded days
  - Green dot = Present, Red = Absent, Yellow = Late

**Attendance Shortage Alert:**
- Banner at top if any subject < 75%
- "You need to attend next 5 classes to reach 75% in [Subject]"

### D. Parent — Ward Attendance View
- Similar to student view but read-only
- Weekly email report option
- Push notification: "Your ward was marked ABSENT in [Subject] today"

### E. Admin — Attendance Monitoring Dashboard
**Layout:** Authority dark dashboard

**KPI Cards:**
- Overall College Attendance Today (%)
- Classes Conducted Today
- Pending Faculty Approvals
- Attendance Shortage Alerts (count)

**Department-wise Heatmap:**
- Grid: Departments × Periods
- Color intensity = attendance %
- Red cells = low attendance departments

**Student-wise Alert Table:**
- Filter: Below 75% | Below 65% | Critical (<50%)
- Columns: Name | Roll No | Dept | Subject | % | Classes Needed
- Action: Send warning SMS / Email

**Faculty Performance:**
- Which faculty approves fastest
- Which classes have most disputes
- CR submission timeliness


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — MODULE 4: ADMIN COMMAND CENTER (Principal / Authority View)
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 Concept
A unified "God View" dashboard where the Principal / Admin can monitor EVERY movement in the college in real-time. This combines data from Gate Security + Attendance + any future modules.

## 4.2 Layout: Single-Page Authority Dashboard
**Theme:** Dark mode (slate-900 base), data-dense but clean
**Navigation:** Left sidebar (collapsible), sticky top bar

### Sidebar Menu
- Dashboard (Overview)
- Live Campus
- Gate Security
- Attendance
- Students
- Faculty
- Analytics
- Alerts
- Settings

### Main Dashboard Sections

#### A. Executive Summary (Top Row — 4 Cards)
1. **Campus Occupancy**
   - "1,247 / 1,500 Students IN"
   - Progress bar + Live pulse dot (green)
   - Click → Gate monitoring detail

2. **Today's Attendance**
   - "87% Average"
   - Trend vs yesterday
   - Click → Attendance detail

3. **Active Alerts**
   - "3 Critical"
   - List preview: "Gate 2 offline", "5 students absent", "1 overdue return"
   - Red pulse badge

4. **Pending Actions**
   - "12 Gate Passes to Review"
   - "4 Attendance Sheets Pending"
   - Quick action buttons

#### B. Live Activity Map (Center)
- Visual representation of campus
- Gate 1, Gate 2, Main Building, Hostels, Canteen
- Live counters at each location
- Animated dots showing movement
- Click any location → Detailed log

#### C. Real-Time Feed (Right Panel — Scrollable)
- Timestamped events:
  - "10:45 AM — Roll 21CSE045 OUT (Home Out) — Gate 1"
  - "10:46 AM — Period 3 attendance approved by Dr. Sharma"
  - "10:47 AM — Roll 21ECE032 marked ABSENT (Period 3)"
- Color-coded by category: Blue (gate), Green (attendance), Red (alert)

#### D. Department Performance (Bottom Left)
- Table: Dept | Students IN | Attendance % | Gate Activity | Status
- Sortable columns
- Status: "Normal" (green) / "Attention" (yellow) / "Critical" (red)

#### E. Attendance vs Gate Correlation (Bottom Right)
- Scatter plot or dual-axis chart
- X-axis: Time of day
- Y-axis: Count
- Series 1: Students IN campus (from gate)
- Series 2: Students marked Present (from attendance)
- Divergence = students who entered but skipped class

### Alert Center (Dedicated Page)
**Severity Levels:**
- Critical (red): Student overdue from leave, security breach, system down
- Warning (yellow): Low attendance, repeated absences, gate pass pending > 2hrs
- Info (blue): Regular notifications, daily summaries

**Alert Cards:**
- Icon + Title + Description + Timestamp + [Take Action]
- Bulk select: [Mark Resolved] [Escalate] [Snooze]

### Reports Center
**Generate Reports:**
- Daily College Status Report (PDF)
- Monthly Attendance Summary (Excel)
- Gate Activity Log (Date range)
- Student Movement Report (individual)
- Faculty Performance Report

**Schedule Reports:**
- Auto-email daily at 6 PM to Principal
- Auto-email weekly summary to HODs


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — ROLE-BASED ACCESS MATRIX
# ═══════════════════════════════════════════════════════════════════════════════

| Feature | Admin | Security | Faculty | CR | Student | Parent |
|---------|-------|----------|---------|----|---------|--------|
| **Public Website** | View | View | View | View | View | View |
| **Gate Scan (QR)** | Configure | Execute | — | — | Display QR | — |
| **View Gate Logs (All)** | Yes | Shift-only | No | No | Self only | Child only |
| **Approve Gate Pass** | Yes | No | No | No | Request only | Approve child |
| **Mark Attendance** | Configure | — | Approve | Mark (own class) | Self view | Child view |
| **View Attendance (All)** | Yes | No | Assigned only | Own class | Self only | Child only |
| **Admin Dashboard** | Full | No | No | No | No | No |
| **Notifications** | All | Shift alerts | CR submissions | Faculty actions | Self alerts | Child alerts |
| **Reports** | All | Shift logs | Assigned | Own class | Self | Child |
| **User Management** | Full | No | No | No | Self profile | Self profile |


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — TECH STACK RECOMMENDATION (For Your Reference)
# ═══════════════════════════════════════════════════════════════════════════════

## Frontend
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (for consistent component base)
- Framer Motion (animations)
- React Query (server state)
- Zustand (client state)

## Backend
- Node.js + Express OR Next.js API Routes
- PostgreSQL (primary database)
- Redis (sessions, real-time counts, caching)
- WebSockets (Socket.io) for real-time updates
- Firebase Cloud Messaging (push notifications)

## QR & Scanning
- qrcode.js (generate)
- html5-qrcode (scan in browser)
- react-zxing (mobile scan)

## Hosting
- Vercel (frontend)
- AWS / DigitalOcean (backend + DB)
- Cloudflare (CDN + security)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — MASTER PROMPT FOR YOUR IDE
# ═══════════════════════════════════════════════════════════════════════════════
# COPY AND PASTE THIS ENTIRE SECTION INTO YOUR AI CODING ASSISTANT
# ═══════════════════════════════════════════════════════════════════════════════

You are an elite frontend architect building a premium, polished college management system for JNTUH University College of Engineering, Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501.

COLLEGE REFERENCE: Visit https://jntuhcej.ac.in/ and extract all content, images, navigation structure, department details (CSE, IT, ECE, EEE, ME), course offerings (B.Tech 5 branches, M.Tech 5 specializations), principal info (Dr. G. Narsimha), contact details (cej@jntuh.ac.in, 63025 03548), NAAC A+ accreditation, and all visual assets. Use this as the sole source of truth for content.

DESIGN SYSTEM RULES (STRICT — NO EXCEPTIONS):
1. Typography: Use Inter font ONLY. Scale: Display clamp(3rem,6vw,4rem)/1.05/700, H1 clamp(2.25rem,5vw,3rem)/1.1/700, H2 clamp(1.5rem,3vw,2.25rem)/1.15/600, Body 1rem/1.6/400, Small 0.875rem/1.5/400. Use clamp() for all responsive sizing.
2. Spacing: Use ONLY these values: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Never use random values like 17px, 23px, 13px.
3. Colors: Maximum 5 colors per screen. Public site: Background #FAFAFA, Primary #171717, Secondary #737373, Border #E5E5E5, Accent #7C3AED. Admin dashboard: Background #0F172A, Surface #1E293B, Primary #F8FAFC, Secondary #94A3B8, Accent #10B981, Alert #EF4444, Warning #F59E0B.
4. Layout: Container width: min(1200px, calc(100% - 40px)). 12-column grid desktop, 4-column mobile. Section padding: 96px desktop, 64px mobile.
5. Components: Buttons height 44px, radius 10px, padding 0 20px, font 14px/600, transition all 180ms ease, hover translateY(-2px). Cards radius 16px, padding 24px, shadow 0 1px 3px rgba(0,0,0,0.1), hover shadow 0 8px 30px rgba(0,0,0,0.12). Inputs height 48px, radius 10px, focus ring 2px accent.
6. Motion: Page entrance opacity 0→1, translateY(20px→0), 400ms ease-out. Cards hover translateY(-4px), 200ms. Nav scroll: backdrop-blur(12px). NO bouncing, NO excessive parallax, NO giant cursor effects.
7. Mobile: Design mobile-first. Navigation becomes hamburger. Hero becomes single column. Tables become cards or horizontal scroll.

BUILD THREE MODULES:

MODULE 1 — PUBLIC COLLEGE WEBSITE:
Rebuild https://jntuhcej.ac.in/ with premium polish. Include: Top announcement bar, glassmorphism navbar with logo+nav+login, full-height hero with headline "Shaping Engineers, Building Futures" and CTAs, stats bar (Est. 2007, 5 B.Tech, 5 M.Tech, NAAC A+), about section, 5 department cards (CSE, IT, ECE, EEE, ME) with hover lift, academics tabbed table, events/news cards, campus masonry gallery, 4-column footer. All pages: Home, About, Academics, Departments, Admissions, Placements, Research, Campus Life, Contact. Login portal routes to role-based dashboards.

MODULE 2 — GATE SECURITY & QR MONITORING:
Security guard tablet interface: Split screen — left 60% QR scanner viewfinder, right 40% student profile panel. On scan: show photo, name, roll no, last scan, direction toggle [IN]/[OUT], reason dropdown (Home Out/Day Out/Leave/Regular), large confirm button. Recent scans table below with color-coded rows. Manual entry mode for damaged QR. Admin dashboard: Dark mode. KPI cards (Students IN, Students OUT, Today's Scans, Pending Passes). Live campus strength with animated counter. Department breakdown bar chart. Recent activity feed. Gate pass approval table. Anomaly alerts. Parent mobile view: Child status badge (IN/OUT), timeline activity, gate pass approve/reject. Student mobile: Digital ID with QR (fullscreen, auto-brightness), gate pass request form, personal history calendar.

MODULE 3 — ATTENDANCE MANAGEMENT:
CR interface: Select subject/date/period → attendance sheet with student photo + name + roll no + [P][A][L] toggle per student. Present=green, Absent=red, Late=yellow. Bulk mark buttons. Counter bar. Submit confirmation modal. Faculty interface: Pending queue cards. Review screen with editable attendance sheet + class stats sidebar. Approve/Reject/Save Draft actions. Analytics: subject-wise attendance bars, low attendance alerts. Student view: Circular progress ring (overall %), color-coded (green≥75, yellow 65-75, red<75), subject accordion with monthly calendar. Parent view: Read-only child attendance + weekly reports. Admin dashboard: College attendance %, classes conducted, pending approvals, shortage alerts. Department heatmap. Student alert table with filter (below 75%, below 65%, critical). Faculty performance metrics.

MODULE 4 — ADMIN COMMAND CENTER (Principal View):
Unified dark dashboard. Sidebar navigation. Executive summary: 4 KPI cards (Campus Occupancy, Today's Attendance, Active Alerts, Pending Actions). Live campus map with location counters. Real-time activity feed (color-coded: blue=gate, green=attendance, red=alert). Department performance table with status badges. Attendance vs Gate correlation chart. Alert center with severity levels (Critical/Warning/Info). Reports generator with scheduling.

ROLE-BASED ACCESS:
- Admin: Full access to all modules and data
- Security: Gate scan execution, shift logs only
- Faculty: Attendance review/approve for assigned subjects only
- CR: Mark attendance for own class only
- Student: Own data only, digital ID, gate pass requests
- Parent: Child's data only, notifications, gate pass approvals

DATA FLOW RULES:
- Gate OUT events notify parents instantly
- Attendance data flows: CR → Faculty → Approved → Visible to all relevant parties
- Admin sees aggregated, real-time data from ALL sources
- Faculty only sees data for subjects/classes assigned by admin
- All timestamps in IST (Asia/Kolkata)

RESPONSIVE REQUIREMENTS:
- Mobile: <640px. Tablet: 640-1024px. Desktop: >1024px.
- Gate scanner optimized for tablet (landscape)
- CR attendance optimized for mobile portrait
- Admin dashboard optimized for desktop (can adapt to tablet)
- Parent/Student views mobile-first

PERFORMANCE:
- Lazy load images
- Skeleton loaders for data fetching
- Optimistic UI updates
- Debounced search inputs
- Virtualized lists for large datasets

Start by pulling all reference data from https://jntuhcej.ac.in/ including text content, image URLs, navigation structure, department details, and contact information. Then build the frontend implementation using Next.js, TypeScript, Tailwind CSS, and shadcn/ui components. Ensure every pixel follows the design system above. The result must look like a product from a top-tier design agency — not a typical college website.
