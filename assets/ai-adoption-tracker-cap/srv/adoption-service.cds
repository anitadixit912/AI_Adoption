using { adoption } from '../db/schema';

@path: '/AdoptionService'
service AdoptionService {

  // ─── Consultants ──────────────────────────────────────────────────────────
  entity Consultants as projection on adoption.Consultants {
    *,
    sessions,
    notes,
    notifications
  };

  // ─── AI Tools ─────────────────────────────────────────────────────────────
  @readonly
  entity AITools as projection on adoption.AITools;

  // ─── Usage Sessions ───────────────────────────────────────────────────────
  entity UsageSessions as projection on adoption.UsageSessions {
    *,
    consultant,
    tool
  };

  // ─── Notifications ────────────────────────────────────────────────────────
  entity Notifications as projection on adoption.Notifications {
    *,
    consultant
  };

  // ─── Practice Lead Notes ──────────────────────────────────────────────────
  entity PracticeLeadNotes as projection on adoption.PracticeLeadNotes {
    *,
    consultant
  };

  // ─── Adoption Snapshots ───────────────────────────────────────────────────
  @readonly
  entity AdoptionSnapshots as projection on adoption.AdoptionSnapshots {
    *,
    consultant,
    tool
  };

  // ─── Actions & Functions ──────────────────────────────────────────────────

  // Log a manual session (for EKX or any tool without auto-capture)
  action logManualSession(
    toolID        : UUID,
    taskType      : String,
    sessionDate   : Date,
    durationMinutes : Integer
  ) returns UsageSessions;

  // Consultant adjusts system-estimated hours saved
  action adjustHoursSaved(
    sessionID     : UUID,
    adjustedHours : Decimal
  ) returns UsageSessions;

  // Trigger adoption tier re-classification (admin)
  action runClassification() returns String;

  // Team heatmap: consultant × tool usage matrix
  function getTeamHeatmap(practiceLeadID : String) returns array of {
    consultantID   : UUID;
    consultantName : String;
    adoptionTier   : String;
    toolUsage      : array of {
      toolID       : UUID;
      toolName     : String;
      sessionCount : Integer;
      intensity    : Integer; // 0=none,1=low,2=medium,3=high
    };
  };

  // Anonymized peer comparison within same BU
  function getPeerComparison(consultantID : UUID) returns {
    percentileRank    : Integer;
    avgSessionsInBU   : Decimal;
    mySessionCount    : Integer;
    toolsNotUsed      : array of String;
  };

  // List consultants inactive for N days
  function getNonAdopterList(daysInactive : Integer) returns array of {
    consultantID     : UUID;
    consultantName   : String;
    email            : String;
    businessUnit     : String;
    adoptionTier     : String;
    daysInactive     : Integer;
    lastActivityDate : Date;
  };

  // CoE Leadership aggregated stats
  function getCoEStats() returns {
    totalConsultants    : Integer;
    activeAdopters      : Integer;
    occasionalUsers     : Integer;
    lapsedUsers         : Integer;
    nonAdopters         : Integer;
    adoptionPct         : Decimal;
    totalHoursSaved     : Decimal;
    healthScore         : Integer;
    topTool             : String;
    toolBreakdown       : array of {
      toolName          : String;
      sessionCount      : Integer;
    };
  };
}
