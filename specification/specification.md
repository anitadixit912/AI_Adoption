# Specification

> **Guidelines**: Read [guidelines.md](./guidelines.md) before executing ANY tasks below.

Check off items as completed.

## Solution Setup

- [x] Create asset directory: `mkdir -p assets/ai-adoption-tracker-cap/`
- [x] Invoke `setup-solution` skill to create `solution.yaml` and `asset.yaml` files for the asset
- [x] Validate `asset.yaml` and `solution.yaml` exist and are well-formed

## Asset Implementation

- [x] Execute `specification/ai-adoption-tracker-cap/specification.md` (all items) — CAP application with React UI and scheduled jobs

---

## Phase 2 — Planned Enhancements (Do NOT implement until instructed)

### R11: Adoption Overview — Enriched Key Metrics
- [ ] Update Practice Lead dashboard Adoption Overview section with:
  - My Team Adoption Rate (%) + delta vs ENR average (e.g. 68% vs 57% ▲ +11pp)
  - Active Adopters / Total Team count (e.g. 17 / 25)
  - Weekly Active Users (%)
  - Non-Adopters count broken down: never-used + lapsed (e.g. 3 + 1)
  - Average Hours Saved per Week (self-reported)
  - Tool-by-Tool Adoption Rates (EKX, J4C, Joule Desktop, J4D as %)

### R12: Adoption Tier Breakdown — Drilldown Table
- [ ] Make Adoption Tier Breakdown section clickable
- [ ] On click, open detailed consultant table (slide-in panel or new screen)
- [ ] Table columns: Name, Tier, Last Activity Date, Tools Used, Session Count
- [ ] Add filter by tier (Active, Occasional, Lapsed, Non-Adopter)

### R13: Adoption Trend Graph
- [ ] Add trend line chart to Practice Lead dashboard
- [ ] Show team adoption rate over time (weekly/monthly)
- [ ] Overlay ENR practice average trend line for comparison

### R14: Efficiency Insights — Top Use Cases Section
- [ ] Add new "Where AI Helps My Team Most" section to Practice Lead dashboard
- [ ] Table: Rank, Use Case, Primary Tool, Consultants Using, Avg Hrs Saved/Week
- [ ] Ranked by average hours saved per week
- [ ] Add horizontal bar chart below the table for visual comparison
- [ ] Pre-populate with example use cases from September 2026 survey data
