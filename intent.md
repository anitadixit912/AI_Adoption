# AI Tool Adoption Tracker – ENR

AI Tool Adoption & Efficiency Tracking Platform for ENR Industry Consultants

## Business challenge

There is no centralized way to know who is using SAP AI tools (EKX, J4C, J4D, Joule Desktop, Joule Studio), how effectively, or who isn't using them at all in the ENR industry. Without this visibility, the organization cannot identify and support non-adopting consultants, prove ROI of AI investments, take data-driven action to close the adoption gap, or report on AI adoption maturity.

## Business Goals & Success Criteria

| Metric | Baseline | Target | Timeline | Process / Capability | Source |
|--------|----------|--------|----------|----------------------|--------|
| AI tool adoption rate across consultants | — | To be defined | 6 months | AI Tool Usage Tracking | user |
| Number of non-adopters identified and supported | — | Minimize | Ongoing | Non-Adopter Identification | user |
| ROI visibility of AI investments | None | Dashboards live for CoE leadership | 3 months | Operational Efficiency Measurement | user |
| Automated nudge coverage for inactive consultants | 0% | 100% of 30-day inactive consultants notified | Ongoing | Automated Notifications | user |

## Key Milestones

- **Data Collection Live**: Usage data ingestion (auto + manual) operational for all 5 tools
- **Dashboards Published**: All 3 dashboard views (CoE Leadership, Practice Lead, Self-Service) accessible
- **Adoption Classification Active**: Consultants classified as Active Adopter / Occasional User / Non-Adopter
- **Automated Reports Running**: Weekly digest and monthly CoE summary generated automatically
- **Nudge Notifications Live**: In-app nudges triggered after 30 days of inactivity

## Business Architecture (RBA)

### End-to-End Process

Governance (IT Management & Enterprise Strategy)

### Process Hierarchy

```
Governance (E2E)
└── Manage Information Technology (generic)
    └── Manage IT Governance (BPS-456)
        └── Control IT management system
        └── IT asset and adoption monitoring
└── Plan to Optimize Enterprise (generic)
    └── Develop Enterprise Strategy and Plans (BPS-402)
        └── Develop operating model strategy
        └── IT Strategy Definition
```

### Summary

Tracking AI tool adoption maps to the Governance E2E — specifically IT Governance (monitoring and controlling AI tool usage) and Enterprise Strategy (defining the operating model for AI rollout and measuring maturity). The solution requires custom development on SAP BTP to close the gap, as no standard SAP product covers AI tool adoption tracking end-to-end.

## Fit Gap Analysis

| Requirement (business) | Standard asset(s) found | API ORD ID | MCP Server ORD ID | MCP Server Version | Gap? | Notes / assumptions |
|------------------------|-------------------------|------------|-------------------|--------------------|------|---------------------|
| Track AI tool usage per consultant per tool | No standard product | — | — | — | Yes | Custom CAP data model required |
| Classify consultants into adoption tiers | No standard product | — | — | — | Yes | Custom logic in CAP service |
| Flag consultants with 0 usage (30/60/90 days) | No standard product | — | — | — | Yes | Scheduled job in CAP |
| Measure hours saved & task cycle time | No standard product | — | — | — | Yes | Session data + manual adjustment |
| CoE Leadership dashboard | SAP Analytics Cloud (optional) | — | — | — | Maybe | Custom React UI preferred for tight integration |
| Practice Lead dashboard with heatmap | No standard product | — | — | — | Yes | Custom React UI with editable fields |
| Self-service consultant dashboard | No standard product | — | — | — | Yes | Custom React UI, peer comparison |
| Weekly digest & monthly CoE report | No standard product | — | — | — | Yes | n8n workflow for automated scheduling |
| In-app nudge notifications to non-adopters | No standard product | — | — | — | Yes | CAP notifications + n8n trigger workflow |
| IT governance & strategy reporting | SAP LeanIX (optional) | — | — | — | Maybe | LeanIX covers enterprise architecture; not consultant-level adoption |
| Organize consultants by Business Unit/Dept | No standard product | — | — | — | Yes | Custom org hierarchy in CAP data model |

### Key findings

- No standard SAP product covers AI tool adoption tracking at the consultant level — full custom development is required on SAP BTP.
- SAP Analytics Cloud could complement dashboards but adds deployment complexity; a React + SAP UI5 Web Components UI embedded in CAP is preferred.
- n8n workflows are ideal for automated weekly/monthly reports and nudge notification triggers without requiring SAP Build Process Automation.
- Usage data ingestion will be a hybrid: automatic API-based capture where tools expose APIs, plus a manual session logging form for tools without APIs.
- The adoption classification logic (Active Adopter / Occasional User / Non-Adopter) will be implemented as computed fields in the CAP service layer.
- In-app notifications will be stored in CAP and surfaced on the consultant's self-service dashboard; no external email or Teams integration in v1.

## Recommendations

### AI Tool Adoption Tracker — Custom CAP Application on SAP BTP

#### Executive Summary

Custom CAP app on SAP BTP with React UI, role-based dashboards, and n8n-driven automation.

#### Recommended Solution

A custom Cloud Application Programming (CAP) Node.js application deployed on SAP BTP, with:
- A CAP data model for consultants, tools, usage sessions, adoption tiers, and notifications
- A React UI with SAP UI5 Web Components for three role-based dashboard views (CoE Leadership, Practice Lead, Self-Service)
- Automated reporting and nudge notification workflows built in n8n
- Hybrid usage data ingestion: API-based auto-capture + manual session logging

#### Recommended solution category

CAP Application, n8n Workflow

#### Intent fit
88%
