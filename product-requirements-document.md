# Product Requirements Document (PRD)

**Title:** AI Tool Adoption Tracker – ENR  
**Date:** 2026-09-16  
**Owner:** CoE Leadership / ENR Practice  
**Solution Category:** CAP Application, n8n Workflow

---

## Product Purpose & Value Proposition

**Elevator Pitch:**  
ENR consultants use SAP AI tools daily — but no one knows who is using them, how often, or how effectively. This application gives CoE leaders and Practice Leads full visibility into AI tool adoption across their teams, so they can prove ROI, support non-adopters, and take data-driven action.

**Business Need:**  
There is currently no centralized way to track usage of SAP AI tools (Joule Work Desktop, Joule Studio, J4C, J4D, EKX) across ENR consultants. Without this visibility, the organization cannot identify and support non-adopters, demonstrate the operational value of AI investments, or report on adoption maturity.

**Expected Value:**  
- CoE dashboards live within 3 months, giving leadership real-time ROI visibility
- 100% of consultants inactive for 30+ days automatically nudged
- Adoption rate tracked continuously, with a baseline established in month 1

**Product Objectives (Prioritized):**
1. Automatically capture AI tool usage per consultant from SAP BTP Audit Logs and SAP AI Core
2. Classify every consultant into an adoption tier and surface non-adopters immediately
3. Provide three role-based dashboard views: CoE Leadership, Practice Lead, Self-Service
4. Automate weekly and monthly reporting and 30-day inactivity nudge notifications

---

## Business Metrics

| Metric | Baseline | Target | Timeline | Process / Capability | Source |
|--------|----------|--------|----------|----------------------|--------|
| AI tool adoption rate across consultants | — | To be defined | 6 months | AI Tool Usage Tracking | user |
| Number of non-adopters identified and supported | — | Minimize | Ongoing | Non-Adopter Identification | user |
| ROI visibility of AI investments | None | Dashboards live for CoE leadership | 3 months | Operational Efficiency Measurement | user |
| Automated nudge coverage for inactive consultants | 0% | 100% of 30-day inactive consultants notified | Ongoing | Automated Notifications | user |

---

## User Profiles & Personas

### Primary Persona: Alex — CoE Leadership

Alex is a 45-year-old Director of Digital Transformation at an ENR firm. He sponsors the AI tooling investment and is accountable to the board for proving ROI. He checks dashboards weekly but does not have time to dig into raw data. His biggest frustration is not being able to answer: "How many of our consultants are actually using AI?" He needs a clear, executive-level view of adoption health, efficiency gains, and where the gaps are — without any manual effort.

### Secondary Persona: Priya — Practice Lead

Priya is a 38-year-old Practice Lead managing a team of 20 consultants. She cares deeply about her team's performance and wants to identify who needs coaching on AI tools. She is comfortable with technology but doesn't want to build reports herself. She is frustrated by lapsed consultants she only finds out about weeks too late. She needs a heatmap view of her team, an editable list of targets and notes, and automated alerts when someone goes inactive.

### Tertiary Persona: Marco — Consultant (Self-Service)

Marco is a 31-year-old SAP consultant who uses Joule Studio regularly but hasn't tried J4C yet. He wants to know how his AI usage compares to his peers and which tools he's missing out on. He is tech-savvy and would engage with a personal usage dashboard if it felt useful and not punitive. He also wants to see the time he's saved through AI — it motivates him to use tools more.

---

## User Goals & Tasks

### For Alex (CoE Leadership):
**Goals:**
- See the overall AI adoption health of the ENR practice at a glance
- Demonstrate ROI of AI investments to senior stakeholders
- Receive monthly summary reports without requesting them manually

**Key Tasks:**
- View overall adoption %, non-adopter count, and tool breakdown
- Review estimated hours saved across the practice
- Receive and review the monthly CoE summary report

### For Priya (Practice Lead):
**Goals:**
- Know which consultants on her team are not using AI tools
- Take action on lapsed consultants before it becomes a pattern
- Adjust team-level targets and notes directly in the dashboard

**Key Tasks:**
- View team heatmap (consultant × tool usage)
- Review non-adopter list and lapsed alerts
- Edit fields such as targets, coaching notes, and engagement status
- Receive weekly digest in-app

### For Marco (Consultant):
**Goals:**
- Understand his personal AI tool usage and adoption tier
- Discover tools he hasn't used yet
- See how he compares to peers (anonymized)

**Key Tasks:**
- View personal usage history per tool
- Check adoption tier (Active / Occasional / Non-Adopter)
- See anonymized peer comparison
- View and dismiss in-app nudge notifications

---

## Requirements

### Must-Have Requirements

**R01: Automatic Usage Data Ingestion**
- **Problem to Solve**: Manual tracking is unreliable and burdens consultants. Usage data must be captured without consultant effort.
- **User Story**: As a system, I need to automatically pull session data for Joule Work Desktop and Joule Studio from SAP BTP Audit Log Service, and for J4C and J4D from SAP AI Core API, so that usage is captured accurately without consultant intervention.
- **Acceptance Criteria**:
  - Given a consultant uses JWD, JS, J4C, or J4D, when a session occurs, then a usage record is created automatically in the system within 24 hours
  - Given EKX has no API, when a consultant uses EKX, then they can optionally log the session manually via the app
- **Maps to Objective**: Objective 1
- **Priority Rank**: 1

**R02: Adoption Tier Classification**
- **Problem to Solve**: Leadership and Practice Leads have no way to know who is actively using AI vs. who has stopped entirely.
- **User Story**: As a Practice Lead, I need every consultant to be automatically classified into an adoption tier so that I can prioritize coaching and support.
- **Acceptance Criteria**:
  - Given daily session data, when the classification job runs, then each consultant is labeled: Active Adopter (regular usage in last 30 days), Occasional User (some usage in last 60 days), Lapsed User (no usage in 30–90 days), or Non-Adopter (no usage ever or beyond 90 days)
  - Tier labels are visible on all three dashboard views
- **Maps to Objective**: Objective 2
- **Priority Rank**: 2

**R03: Non-Adopter & Lapsed Flagging**
- **Problem to Solve**: Practice Leads find out about inactive consultants too late to act.
- **User Story**: As a Practice Lead, I need to see consultants flagged at 30, 60, and 90 days of inactivity so that I can take timely action.
- **Acceptance Criteria**:
  - Given a consultant has no usage, when 30, 60, or 90 days pass, then they appear on the non-adopter/lapsed list with the exact inactivity duration
- **Maps to Objective**: Objective 2
- **Priority Rank**: 3

**R04: CoE Leadership Dashboard**
- **Problem to Solve**: CoE leaders have no single view of AI adoption health across the ENR practice.
- **User Story**: As a CoE leader, I need a dashboard showing overall adoption %, non-adopter count, tool breakdown, estimated hours saved, and an AI adoption health score so that I can report maturity to the board.
- **Acceptance Criteria**:
  - Dashboard shows: adoption % by tier, non-adopter count, per-tool usage breakdown, total estimated hours saved, and a composite health score
  - Data refreshes at least daily
- **Maps to Objective**: Objectives 2 & 3
- **Priority Rank**: 4

**R05: Practice Lead Dashboard with Heatmap**
- **Problem to Solve**: Practice Leads cannot see which consultants are using which tools at a glance.
- **User Story**: As a Practice Lead, I need a consultant × tool heatmap with editable fields so that I can manage my team's AI adoption and add coaching notes.
- **Acceptance Criteria**:
  - Heatmap shows each consultant (rows) against each AI tool (columns), color-coded by usage intensity
  - Practice Lead can edit fields: targets, notes, engagement status
  - Non-adopter list and lapsed alerts are visible below the heatmap
- **Maps to Objective**: Objectives 2 & 3
- **Priority Rank**: 5

**R06: Self-Service Consultant Dashboard**
- **Problem to Solve**: Consultants have no personal visibility into their AI tool usage or how they compare to peers.
- **User Story**: As a consultant, I need a personal dashboard showing my usage, adoption tier, peer comparison, and tools I haven't tried, so that I am motivated to adopt AI tools more broadly.
- **Acceptance Criteria**:
  - Shows my usage per tool (sessions, estimated hours saved)
  - Shows my current adoption tier
  - Shows anonymized peer comparison (e.g., "You are in the top 40% of your BU")
  - Lists tools with zero usage and encourages exploration
- **Maps to Objective**: Objectives 2 & 3
- **Priority Rank**: 6

**R07: Operational Efficiency Metrics**
- **Problem to Solve**: There is no way to quantify the time saved or efficiency gains from AI tool usage.
- **User Story**: As a CoE leader, I need estimated hours saved and task cycle time comparisons so that I can prove ROI.
- **Acceptance Criteria**:
  - System calculates estimated hours saved per consultant based on session duration and tool-specific benchmarks
  - Consultants can optionally adjust the system estimate
  - Delivery milestone adherence is tracked for AI-active vs. non-AI consultants
- **Maps to Objective**: Objectives 1 & 2
- **Priority Rank**: 7

**R08: In-App Nudge Notifications**
- **Problem to Solve**: Non-adopters are not reminded to engage with AI tools, so inactivity persists.
- **User Story**: As a consultant, I need to receive an in-app nudge after 30 days of inactivity so that I am prompted to start using AI tools again.
- **Acceptance Criteria**:
  - Nudge notification appears in the consultant's self-service dashboard after 30 days of zero usage
  - Notification includes which tools to try and a direct link to the tool
  - Consultant can dismiss and snooze the notification
- **Maps to Objective**: Objective 4
- **Priority Rank**: 8

**R09: Automated Weekly Digest & Monthly CoE Report**
- **Problem to Solve**: Practice Leads and CoE leaders must manually check dashboards; they need push reporting.
- **User Story**: As a Practice Lead, I need a weekly in-app digest, and as a CoE leader, I need a monthly summary report, so that I am kept informed without logging in every day.
- **Acceptance Criteria**:
  - Weekly digest posted in-app to Practice Leads every Monday, summarizing team adoption, non-adopters, and lapsed consultants
  - Monthly CoE summary posted in-app on the 1st of each month, aggregating all BU data, adoption rate, hours saved, and health score
- **Maps to Objective**: Objective 4
- **Priority Rank**: 9

**R10: Consultant & BU Organization**
- **Problem to Solve**: Without a structured org model, it is impossible to filter and report by team or business unit.
- **User Story**: As an admin, I need to organize consultants by Business Unit and Department so that all dashboards and reports can be filtered correctly.
- **Acceptance Criteria**:
  - Each consultant profile includes Business Unit and Department
  - All dashboards support filtering by Business Unit
- **Maps to Objective**: Objectives 2 & 3
- **Priority Rank**: 10

---

## Solution Architecture

**Architecture Overview:**  
A custom CAP (Cloud Application Programming Model) Node.js application deployed on SAP BTP Cloud Foundry. The React frontend (SAP UI5 Web Components) connects to the CAP OData/REST API. n8n workflows handle automated scheduling for reports and nudge triggers. Usage data is pulled automatically from SAP BTP Audit Log Service (JWD, JS) and SAP AI Core API (J4C, J4D), with a manual logging fallback for EKX.

**Key Components:**

- **CAP Backend**: Core data model and services — consultants, tools, usage sessions, adoption tiers, notifications
- **Adoption Classification Engine**: Scheduled CAP job that runs daily to compute and update each consultant's tier
- **React UI (SAP UI5 Web Components)**: Three role-based views — CoE Leadership, Practice Lead, Self-Service
- **CAP Scheduled Jobs**: Weekly digest, monthly CoE report, and 30-day nudge notification — all implemented as native CAP scheduled jobs running on BTP
- **SAP BTP Audit Log Integration**: Auto-ingests session data for Joule Work Desktop and Joule Studio
- **SAP AI Core API Integration**: Auto-ingests session/consumption data for J4C and J4D
- **EKX Manual Logging**: Fallback session form within the app, pending EKX API confirmation

**Integration Points:**

- SAP BTP Audit Log Service → CAP ingestion job (daily pull, read-only)
- SAP AI Core API → CAP ingestion job (daily pull, read-only)
- n8n → CAP Notification Service API (write: creates in-app notifications)

**Deployment:**

- SAP BTP Cloud Foundry (dev / prod)
- SAP HANA Cloud as the production database; SQLite for local development

---

## Automation & Agent Behaviour

**Automation Level:** Rule-based + Scheduled workflows

**Actions the system performs without human approval:**
- Daily adoption tier classification per consultant
- Automatic usage data ingestion from SAP BTP Audit Log and SAP AI Core
- Weekly digest notification creation for Practice Leads
- Monthly CoE summary notification creation for CoE leadership
- In-app nudge creation after 30 days of consultant inactivity

**Actions that require human review or approval:**
- Adjusting system-estimated hours saved (consultant can override)
- Editing Practice Lead dashboard fields (targets, notes, engagement status)
- Escalation or coaching action after nudge — human decision

**Guardrails & fail-safes:**
- Usage data is read-only from source systems — the app never writes back to BTP Audit Log or AI Core
- Adoption tier downgrades (e.g., Active → Lapsed) only occur after a full inactivity period has elapsed, not on a single missed day
- Peer comparison data is always anonymized — no individual names exposed in comparisons

---

## Milestones

### M1: Data Collection Live
- **Description**: Automatic usage data ingestion is operational for JWD, JS, J4C, and J4D
- **Achieved when**: At least one usage session is successfully ingested per tool from their respective SAP source systems
- **Log on achievement**: `M1.achieved: usage data ingestion live for all configured tools`
- **Log on miss**: `M1.missed: ingestion pipeline failed or no sessions received within expected window`

### M2: Adoption Classification Active
- **Description**: Daily classification job is running and all consultant profiles carry an adoption tier
- **Achieved when**: 100% of consultant profiles have a non-null adoption tier after the first classification run
- **Log on achievement**: `M2.achieved: adoption classification active — all consultants assigned a tier`
- **Log on miss**: `M2.missed: classification job did not complete or consultant profiles remain unclassified`

### M3: Dashboards Published
- **Description**: All three role-based dashboard views are live and accessible
- **Achieved when**: CoE Leadership, Practice Lead, and Self-Service views are deployed and return live data
- **Log on achievement**: `M3.achieved: all three dashboard views live and serving data`
- **Log on miss**: `M3.missed: one or more dashboard views failed to deploy or returned no data`

### M4: Nudge Notifications Live
- **Description**: In-app nudge notifications are triggered automatically for 30-day inactive consultants
- **Achieved when**: First nudge notification is successfully created and visible in a consultant's self-service dashboard
- **Log on achievement**: `M4.achieved: nudge notification workflow active — first nudges delivered`
- **Log on miss**: `M4.missed: nudge workflow did not trigger or notifications not visible in dashboard`

### M5: Automated Reports Running
- **Description**: Weekly digest and monthly CoE summary are generated and delivered automatically
- **Achieved when**: First weekly digest and first monthly summary are posted as in-app notifications to the correct recipients
- **Log on achievement**: `M5.achieved: automated reporting workflows live — weekly and monthly reports delivered`
- **Log on miss**: `M5.missed: report workflow did not execute or notification not delivered to recipients`

---

## Risks, Assumptions, and Dependencies

### Risks
- SAP BTP Audit Log API may not expose granular per-user session data for JWD/JS — needs verification before build
- EKX may have no accessible API, making its data entirely dependent on voluntary manual logging
- Consultant adoption of the self-service dashboard depends on perceived value — low engagement reduces data quality for manual fallback

### Assumptions
- JWD and JS log user activity to SAP BTP Audit Log Service in a structured, queryable format
- J4C and J4D expose consumption/session metrics via SAP AI Core API
- Consultants are organized in a defined Business Unit / Department hierarchy that can be seeded into the app
- Role-based access control (who is CoE vs. Practice Lead vs. Consultant) will be defined by an admin during initial setup

### Dependencies
- Confirmation from IT/tool admins on SAP BTP Audit Log schema for JWD and JS
- SAP AI Core API access credentials for J4C and J4D
- EKX API availability (or confirmed absence, triggering manual fallback design)
- SAP BTP subaccount with Cloud Foundry runtime and HANA Cloud instance

---

## Appendix

### Glossary

- **JWD / Joule Work Desktop**: SAP's AI assistant for workplace productivity tasks
- **JS / Joule Studio**: SAP's AI-assisted development environment
- **J4C**: Joule for Copilot — AI copilot capability for business workflows
- **J4D**: Joule for Developers — AI assistant for developers
- **EKX**: Internal SAP AI tool (API availability TBC)
- **Active Adopter**: Consultant with regular AI tool usage in the last 30 days
- **Occasional User**: Consultant with some usage in the last 31–60 days
- **Lapsed User**: Consultant with no usage in 31–90 days
- **Non-Adopter**: Consultant with no recorded usage ever, or beyond 90 days
- **CoE**: Center of Excellence — cross-practice leadership body overseeing AI adoption
- **BU**: Business Unit
