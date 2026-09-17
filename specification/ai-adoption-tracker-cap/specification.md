# Specification: ai-adoption-tracker-cap

> **Guidelines**: Read [guidelines-cap.md](../guidelines-cap.md) before executing ANY tasks below. Follow all constraints described there throughout execution.

## Basic Setup

- [ ] Read `product-requirements-document.md` and `intent.md` for full context
- [ ] Invoke the `cap-app` skill from `assets/ai-adoption-tracker-cap/` to set up the CAP project structure
- [ ] Install dependencies (`npm install`), validate the project starts (`cds watch`) and responds

---

## Data Model — CDS Entities

- [ ] Define `Consultants` entity with fields: `ID` (UUID, key), `name`, `email`, `businessUnit`, `department`, `adoptionTier` (enum: ActiveAdopter / OccasionalUser / LapsedUser / NonAdopter), `lastActivityDate`, `createdAt`
- [ ] Define `AITools` entity with fields: `ID` (UUID, key), `name` (EKX / J4C / J4D / JWD / JS), `description`, `dataSource` (enum: BTPAuditLog / AICore / Manual)
- [ ] Define `UsageSessions` entity with fields: `ID` (UUID, key), `consultant` (association to Consultants), `tool` (association to AITools), `sessionDate`, `durationMinutes`, `estimatedHoursSaved` (Decimal), `consultantAdjustedHours` (Decimal, nullable), `source` (enum: Automatic / Manual), `taskType` (nullable), `createdAt`
- [ ] Define `Notifications` entity with fields: `ID` (UUID, key), `consultant` (association to Consultants), `type` (enum: Nudge / WeeklyDigest / MonthlyReport), `title`, `message`, `isRead` (Boolean, default false), `createdAt`
- [ ] Define `PracticeLeadNotes` entity with fields: `ID` (UUID, key), `consultant` (association to Consultants), `practiceLeadID`, `targetTier`, `notes`, `engagementStatus`, `updatedAt`
- [ ] Define `AdoptionSnapshots` entity for daily historical records: `ID`, `consultant`, `tool`, `sessionCount`, `snapshotDate`
- [ ] Add `@readonly` annotations to ingested data entities (UsageSessions created automatically); allow manual create only via dedicated action
- [ ] Run `cds compile srv/` and fix any errors

---

## Services

- [ ] Define `AdoptionService` (main OData V4 service) exposing:
  - `Consultants` (read + update adoptionTier, lastActivityDate)
  - `AITools` (read-only)
  - `UsageSessions` (read + create for manual EKX logging)
  - `Notifications` (read + update isRead)
  - `PracticeLeadNotes` (read + create + update)
  - `AdoptionSnapshots` (read-only)
- [ ] Restrict `Notifications` write to system/admin role only (n8n calls this to create notifications)
- [ ] Expose the following unbound actions/functions:
  - `logManualSession(toolID, taskType, sessionDate, durationMinutes)` — creates a UsageSession with source=Manual for EKX
  - `adjustHoursSaved(sessionID, adjustedHours)` — updates consultantAdjustedHours on a session
  - `runClassification()` — triggers adoption tier re-classification for all consultants (admin-only)
  - `getTeamHeatmap(practiceLeadID)` — returns consultant × tool usage matrix for Practice Lead dashboard
  - `getPeerComparison(consultantID)` — returns anonymized peer comparison stats within same BU
  - `getNonAdopterList(daysInactive)` — returns consultants with zero usage for 30 / 60 / 90 days

---

## Custom Handlers — Adoption Classification Engine

- [ ] Implement `runClassification()` handler in `srv/handlers/classification.js`:
  - Query all consultants and their latest session date per tool
  - Apply tier logic:
    - **ActiveAdopter**: has sessions within last 30 days
    - **OccasionalUser**: last session between 31–60 days ago
    - **LapsedUser**: last session between 61–90 days ago
    - **NonAdopter**: no sessions ever, or last session > 90 days ago
  - Update `adoptionTier` and `lastActivityDate` on each Consultant record
- [ ] Schedule classification job to run daily using `cds.schedule` or a CAP built-in job trigger (run at midnight UTC)
- [ ] Implement `getNonAdopterList(daysInactive)` handler: query consultants where `lastActivityDate` is null or older than `daysInactive` days; return sorted by inactivity duration desc

---

## Custom Handlers — Usage Ingestion (Mock / Stub)

- [ ] Implement `srv/handlers/ingestion.js` with stubbed ingestion functions for each data source:
  - `ingestBTPAuditLog()` — stub that generates mock session records for JWD and JS consultants (simulates BTP Audit Log API response); notes integration point for real BTP Audit Log API
  - `ingestAICore()` — stub that generates mock session records for J4C and J4D (simulates SAP AI Core API response); notes integration point for real AI Core API
- [ ] Stubs should create realistic `UsageSessions` records with random durations (15–120 min) and estimated hours saved (duration × 0.6)
- [ ] Schedule ingestion stubs to run daily (simulating nightly sync)
- [ ] Add a comment block in each stub: `// TODO: Replace with real SAP BTP Audit Log API / SAP AI Core API call when credentials are available`

---

## Custom Handlers — Efficiency Metrics

- [ ] Implement estimated hours saved calculation on `UsageSessions` create:
  - On session creation, compute `estimatedHoursSaved = durationMinutes / 60 * toolEfficiencyFactor`
  - `toolEfficiencyFactor` defaults: JWD=0.6, JS=0.65, J4C=0.7, J4D=0.7, EKX=0.6
- [ ] Implement `adjustHoursSaved(sessionID, adjustedHours)` handler: update `consultantAdjustedHours` on session; the effective hours used in reports = `consultantAdjustedHours ?? estimatedHoursSaved`
- [ ] Implement aggregation query for total hours saved per consultant and per BU (used by dashboards)

---

## Custom Handlers — Dashboards Data

- [ ] Implement `getTeamHeatmap(practiceLeadID)` handler:
  - Return matrix: list of consultants (rows) × list of AI tools (columns)
  - Each cell: session count in last 30 days
  - Color intensity data: 0=none, 1=low (1–2), 2=medium (3–5), 3=high (>5)
- [ ] Implement `getPeerComparison(consultantID)` handler:
  - Get consultant's BU
  - Compute percentile rank of the consultant within their BU based on session count (last 30 days)
  - Return anonymized result: `{ percentileRank, avgSessionsInBU, mySessionCount, toolsNotUsed[] }`
- [ ] Implement CoE Leadership aggregation endpoint: total adoption %, non-adopter count, per-tool usage breakdown, total hours saved, composite health score
  - Health score = weighted average: 40% adoption rate + 30% active adopter % + 30% hours saved vs. target

---

## Seed Data

- [ ] Create `db/data/` CSV files with realistic seed data:
  - 3 Business Units (ENR-North, ENR-South, ENR-Global)
  - 20 consultants spread across BUs with varied adoption tiers
  - All 5 AI tools (EKX, J4C, J4D, JWD, JS)
  - 60 days of usage session history with varied frequency per consultant
  - 5 unread notifications per persona type

---

## React UI — CoE Leadership Dashboard

- [ ] Create `ui/src/pages/CoEDashboard.jsx`:
  - Overall adoption % (donut chart by tier)
  - Non-adopter count (highlighted KPI card)
  - Per-tool usage breakdown (bar chart: sessions per tool)
  - Total estimated hours saved (KPI card)
  - AI Adoption Health Score (gauge/score card with color: red < 50, amber 50–75, green > 75)
  - Date range filter (last 30 / 60 / 90 days)
- [ ] Use SAP UI5 Web Components for all UI elements (cards, charts, badges)

---

## React UI — Practice Lead Dashboard

- [ ] Create `ui/src/pages/PracticeLeadDashboard.jsx`:
  - Consultant × Tool heatmap table: rows = consultants, columns = AI tools, cells color-coded by session intensity
  - Non-adopter list below heatmap (consultant name, days inactive, adoption tier badge)
  - Lapsed alerts section (consultants at 30 / 60 / 90 day marks)
  - Editable fields per consultant row: target tier (dropdown), coaching notes (inline text), engagement status (dropdown: Active / Coaching / Escalated)
  - Save button per row — calls PATCH on `PracticeLeadNotes`
- [ ] Filter by BU / Department
- [ ] Use SAP UI5 Web Components throughout

---

## React UI — Self-Service Consultant Dashboard

- [ ] Create `ui/src/pages/ConsultantDashboard.jsx`:
  - My usage per tool: session count + hours saved per tool (last 30 days), displayed as cards
  - My adoption tier badge (color-coded: green=Active, amber=Occasional, orange=Lapsed, red=Non-Adopter)
  - Peer comparison widget: "You are in the top X% of your BU" with avg sessions in BU
  - Tools I haven't tried yet: list of tools with 0 sessions, with a short description and encouragement text
  - In-app notifications panel: list of unread nudges/digests with dismiss and mark-as-read
- [ ] Use SAP UI5 Web Components throughout

---

## React UI — Manual Session Logging (EKX)

- [ ] Create `ui/src/pages/LogSession.jsx`:
  - Tool selector (pre-filtered to EKX only, expandable to any tool in future)
  - Task type selector (dropdown: Document Drafting / Code Review / Data Analysis / Research / Other)
  - Date picker (defaults to today)
  - Duration selector (dropdown: 15 / 30 / 45 / 60 / 90 / 120 minutes)
  - System-estimated hours saved (shown read-only after tool + duration selected)
  - Adjustment input (optional override of estimated hours)
  - Submit button — calls `logManualSession` action
- [ ] Show confirmation toast on success

---

## React UI — Navigation & Layout

- [ ] Implement role-based navigation:
  - CoE Leadership role → CoE Dashboard tab
  - Practice Lead role → Practice Lead Dashboard tab
  - Consultant role → Self-Service tab + Log Session tab
  - Admin role → all tabs + trigger classification button
- [ ] Use SAP UI5 Shell Bar as the main navigation container
- [ ] Add a role switcher (dropdown) for demo/testing purposes since auth is not implemented
- [ ] All views must be responsive and work on desktop browser

---

## Tests

- [ ] Write tests for `runClassification()` logic:
  - Consultant with sessions in last 30 days → ActiveAdopter
  - Consultant with sessions 45 days ago only → OccasionalUser
  - Consultant with sessions 75 days ago only → LapsedUser
  - Consultant with no sessions → NonAdopter
- [ ] Write tests for `estimatedHoursSaved` calculation on session create (per tool efficiency factor)
- [ ] Write tests for `adjustHoursSaved` handler (ensure adjusted value overrides estimate)
- [ ] Write tests for `getNonAdopterList(30)` — returns only consultants inactive 30+ days
- [ ] Write tests for `getPeerComparison` — result is anonymized (no names), contains percentile rank

---

## Scheduled Jobs

- [ ] Implement `srv/jobs/weekly-digest.js` — runs every Monday at 08:00 UTC:
  - Fetch all Practice Leads from `Consultants`
  - For each Practice Lead, fetch their team's adoption data using `getTeamHeatmap`
  - Fetch non-adopters for the team using `getNonAdopterList(30)`
  - Compose digest message: adoption summary, non-adopter names, top tool used
  - Create a `Notifications` record per Practice Lead with `type = 'WeeklyDigest'`

- [ ] Implement `srv/jobs/monthly-report.js` — runs on 1st of every month at 07:00 UTC:
  - Aggregate all consultants by adoption tier across all BUs
  - Calculate total estimated hours saved across all sessions in the month
  - Fetch per-tool session breakdown
  - Compute composite health score
  - Compose monthly summary message with all above metrics
  - Create a `Notifications` record per CoE Leadership consultant with `type = 'MonthlyReport'`

- [ ] Implement `srv/jobs/nudge-notifications.js` — runs every day at 09:00 UTC:
  - Fetch all consultants inactive for 30+ days using `getNonAdopterList(30)`
  - For each inactive consultant, check if a `Nudge` notification was already sent in the last 7 days (anti-spam guard)
  - If no recent nudge exists, identify tools with zero sessions in last 30 days for that consultant
  - Compose nudge message: personalized with days inactive, tools not tried, team average hours saved
  - Create a `Notifications` record with `type = 'Nudge'`

- [ ] Register all three jobs in `srv/server.js` using `cds.schedule` with appropriate cron expressions:
  - Weekly digest: `'0 8 * * 1'` (every Monday 08:00 UTC)
  - Monthly report: `'0 7 1 * *'` (1st of every month 07:00 UTC)
  - Daily nudge: `'0 9 * * *'` (every day 09:00 UTC)

- [ ] Write tests for scheduled job logic:
  - Weekly digest creates correct number of notifications (one per Practice Lead)
  - Monthly report includes correct tier breakdown and hours saved totals
  - Nudge job skips consultants who received a nudge in the last 7 days
  - Nudge job sends notification to consultants inactive exactly 30 days

---

## Validation

- [ ] Run `cds compile srv/` — zero errors
- [ ] Run `cds watch` — service starts on port 4004
- [ ] Curl `GET /odata/v4/AdoptionService/Consultants` — returns seeded consultants
- [ ] Curl `POST /odata/v4/AdoptionService/runClassification` — all consultants get a tier
- [ ] Curl `GET /odata/v4/AdoptionService/getTeamHeatmap(practiceLeadID='...')` — returns matrix
- [ ] Open UI at `http://localhost:4004` — all 3 dashboard views render with data
- [ ] All tests pass
