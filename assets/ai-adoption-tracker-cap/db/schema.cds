namespace adoption;

using { cuid, managed } from '@sap/cds/common';

// ─── AI Tools ───────────────────────────────────────────────────────────────

entity AITools : cuid {
  name        : String(50) not null;
  description : String(200);
  dataSource  : String(20) not null; // BTPAuditLog | AICore | Manual
}

// ─── Consultants ────────────────────────────────────────────────────────────

entity Consultants : cuid, managed {
  name             : String(100) not null;
  email            : String(150) not null;
  role             : String(30) not null default 'Consultant'; // Consultant | PracticeLead | CoELeadership | Admin
  businessUnit     : String(100) not null;
  department       : String(100);
  adoptionTier     : String(20) default 'NonAdopter'; // ActiveAdopter | OccasionalUser | LapsedUser | NonAdopter
  lastActivityDate : Date;
  sessions         : Composition of many UsageSessions on sessions.consultant = $self;
  notes            : Composition of many PracticeLeadNotes on notes.consultant = $self;
  notifications    : Composition of many Notifications on notifications.consultant = $self;
}

// ─── Usage Sessions ─────────────────────────────────────────────────────────

entity UsageSessions : cuid, managed {
  consultant             : Association to Consultants not null;
  tool                   : Association to AITools not null;
  sessionDate            : Date not null;
  durationMinutes        : Integer not null;
  estimatedHoursSaved    : Decimal(5,2);
  consultantAdjustedHours: Decimal(5,2);
  source                 : String(10) not null default 'Manual'; // Automatic | Manual
  taskType               : String(50); // DocumentDrafting | CodeReview | DataAnalysis | Research | Other
}

// ─── Notifications ──────────────────────────────────────────────────────────

entity Notifications : cuid, managed {
  consultant : Association to Consultants not null;
  type       : String(20) not null; // Nudge | WeeklyDigest | MonthlyReport
  title      : String(200) not null;
  message    : String(2000) not null;
  isRead     : Boolean not null default false;
}

// ─── Practice Lead Notes ────────────────────────────────────────────────────

entity PracticeLeadNotes : cuid, managed {
  consultant        : Association to Consultants not null;
  practiceLeadID    : String(36) not null;
  targetTier        : String(20); // ActiveAdopter | OccasionalUser
  notes             : String(1000);
  engagementStatus  : String(20) default 'Active'; // Active | Coaching | Escalated
}

// ─── Adoption Snapshots ─────────────────────────────────────────────────────

entity AdoptionSnapshots : cuid {
  consultant    : Association to Consultants not null;
  tool          : Association to AITools not null;
  sessionCount  : Integer not null default 0;
  snapshotDate  : Date not null;
}
