// Types
export type {
  MatchRequestStatus,
  NegotiationStatus,
  AvailabilityResponseType,
  LevelBand,
  Team,
  TeamPolicy,
  Member,
  MatchRequest,
  OpponentTeam,
  Negotiation,
  GroundWatchTarget,
  GroundAvailabilitySnapshot,
  AvailabilityResponse,
  Confirmation,
  AuditLog,
} from "./types/domain";

export {
  MATCH_REQUEST_STATUSES,
  NEGOTIATION_STATUSES,
  AVAILABILITY_RESPONSES,
  LEVEL_BANDS,
} from "./types/domain";

// State Machine
export {
  canTransition,
  assertTransition,
  getAvailableTransitions,
  InvalidTransitionError,
  canNegotiationTransition,
  assertNegotiationTransition,
} from "./lib/state-machine";

// Governor
export {
  canConfirm,
  checkStopConditions,
  calculateConfidence,
} from "./lib/governor";
export type { GovernorContext, GovernorResult } from "./lib/governor";

// Audit
export { writeAuditLog } from "./lib/audit";
