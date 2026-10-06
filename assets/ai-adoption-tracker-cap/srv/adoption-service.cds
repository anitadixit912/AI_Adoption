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

  // ─── Ideas ────────────────────────────────────────────────────────────────
  entity Ideas as projection on adoption.Ideas {
    *,
    submitter
  };

  // ─── Learning Courses ─────────────────────────────────────────────────────
  entity LearningCourses as projection on adoption.LearningCourses {
    *,
    relatedTool,
    assignments
  };

  // ─── Course Assignments ───────────────────────────────────────────────────
  entity CourseAssignments as projection on adoption.CourseAssignments {
    *,
    course,
    consultant
  };

  // ─── Actions & Functions ──────────────────────────────────────────────────

  // Log a manual session (for EKX or any tool without auto-capture)
  action logManualSession(
    toolID                 : UUID,
    taskType               : String,
    sessionDate            : Date,
    durationMinutes        : Integer,
    selfReportedHoursSaved : Decimal,
    consultantID           : UUID
  ) returns UsageSessions;

  // Update the current user's consultant profile
  action updateMyProfile(
    name         : String,
    email        : String,
    jobTitle     : String,
    businessUnit : String,
    department   : String,
    managerName  : String,
    joinDate     : Date,
    consultantID : UUID
  ) returns Consultants;

  // Add a new AI tool (Admin)
  action addAITool(
    name               : String,
    description        : String,
    category           : String,
    rolloutDate        : Date,
    licensedUsersCount : Integer
  ) returns AITools;

  // Consultant adjusts system-estimated hours saved
  action adjustHoursSaved(
    sessionID     : UUID,
    adjustedHours : Decimal
  ) returns UsageSessions;

  // Trigger adoption tier re-classification (admin)
  action runClassification() returns String;

  // Bulk upload records for a given entity (admin)
  // records is a JSON string — array of objects serialized client-side
  action bulkUpload(
    entityName : String,
    records    : LargeString
  ) returns {
    success : Integer;
    failed  : Integer;
    errors  : array of { row : Integer; message : String };
  };

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
