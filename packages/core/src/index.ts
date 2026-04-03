// Types
export type {
  GameStatus,
  GameType,
  RsvpResponse,
  NegotiationStatus,
  HelperRequestStatus,
  MemberTier,
  MemberRole,
  Team,
  TeamSettings,
  Member,
  Helper,
  Game,
  Rsvp,
  Attendance,
  HelperRequest,
  OpponentTeam,
  Negotiation,
  Ground,
  GroundSlot,
  Expense,
  Settlement,
  GameResult,
  AuditLog,
} from "./types/domain";

export {
  GAME_STATUSES,
  GAME_TYPES,
  RSVP_RESPONSES,
  NEGOTIATION_STATUSES,
  HELPER_REQUEST_STATUSES,
  MEMBER_TIERS,
  MEMBER_ROLES,
} from "./types/domain";

// State Machine
export {
  canTransition,
  assertTransition,
  getAvailableTransitions,
  InvalidTransitionError,
  canNegotiationTransition,
  assertNegotiationTransition,
  canHelperRequestTransition,
  assertHelperRequestTransition,
} from "./lib/state-machine";

// Governor
export {
  canConfirm,
  checkHelperFulfillment,
  checkStopConditions,
} from "./lib/governor";
export type {
  GovernorResult,
  ConfirmContext,
  FulfillmentContext,
  FulfillmentResult,
  StopConditionContext,
} from "./lib/governor";

// Audit
export { writeAuditLog } from "./lib/audit";

// Result
export { ok, err, formatError, httpStatus } from "./lib/result";
export type {
  Result,
  AppError,
  InvalidTransitionErr,
  InsufficientMembersErr,
  MissingOpponentErr,
  GroundNotConfirmedErr,
  DeadlineNotReachedErr,
  ValidationErr,
  DatabaseErr,
  NotFoundErr,
} from "./lib/result";

// Response
export { apiSuccess, apiError } from "./lib/response";
export type {
  NextAction,
  ApiSuccessResponse,
  ApiErrorResponse,
} from "./lib/response";

// Next Actions
export {
  suggestNextActions,
  suggestAfterCreate,
  suggestOnTransitionError,
} from "./lib/next-actions";
export type { GameContext } from "./lib/next-actions";

// Auth
export { hasRole, assertRole, InsufficientRoleError } from "./lib/auth";

// Stats
export {
  calculateBattingStats,
  calculatePitchingStats,
  calculateTeamStats,
} from "./lib/stats";
export type { BattingStats, PitchingStats, TeamStats } from "./lib/stats";

// iCal
export { generateICalFeed, generateVEvent } from "./lib/ical";

// Validators
export {
  createGameSchema,
  transitionGameSchema,
  respondRsvpSchema,
  createHelperSchema,
  createHelperRequestsSchema,
  respondHelperRequestSchema,
  createNegotiationSchema,
  updateNegotiationSchema,
  createExpenseSchema,
  createTeamSchema,
  zodToValidationError,
} from "./lib/validators";
export type {
  CreateGameInput,
  TransitionGameInput,
  RespondRsvpInput,
  CreateHelperInput,
  CreateHelperRequestsInput,
  RespondHelperRequestInput,
  CreateNegotiationInput,
  UpdateNegotiationInput,
  CreateExpenseInput,
  CreateTeamInput,
} from "./lib/validators";
