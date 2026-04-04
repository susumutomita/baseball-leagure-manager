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
  canTransitionWithContext,
  assertTransition,
  getAvailableTransitions,
  InvalidTransitionError,
  canNegotiationTransition,
  assertNegotiationTransition,
  canHelperRequestTransition,
  assertHelperRequestTransition,
} from "./lib/state-machine";
export type {
  TransitionContext,
  TransitionCheckResult,
} from "./lib/state-machine";

// Governor
export {
  canConfirm,
  checkHelperFulfillment,
  checkStopConditions,
} from "./lib/governor";
export type {
  GovernorResult,
  GovernorSuggestion,
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
  ConflictErr,
  ExternalServiceErr,
  AuthorizationErr,
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

// Notification
export {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  RECIPIENT_TYPES,
  queueNotification,
  sendNotification,
  sendBulkNotifications,
  sendNotificationWithRetry,
  createDefaultDispatchers,
} from "./lib/notification";
export type {
  NotificationType,
  NotificationChannel,
  RecipientType,
  NotificationEntry,
  NotificationResult,
  BulkNotificationResult,
  FailedNotification,
  NotificationRetryConfig,
  ChannelSender,
  ChannelDispatchers,
} from "./lib/notification";

// Auth
export { hasRole, assertRole, InsufficientRoleError } from "./lib/auth";

// Stats
export {
  calculateBattingStats,
  calculatePitchingStats,
  calculateTeamStats,
} from "./lib/stats";
export type { BattingStats, PitchingStats, TeamStats } from "./lib/stats";

// Negotiation Policy
export {
  getDefaultPolicy,
  matchPolicy,
  shouldAutoAccept,
  shouldAutoDecline,
  cancelOtherNegotiations,
  negotiationPolicySchema,
  negotiationPolicyPatchSchema,
  DAY_OF_WEEK,
  TIME_SLOT,
  COST_SPLIT,
} from "./lib/negotiation-policy";
export type {
  NegotiationPolicy,
  NegotiationProposal,
  NegotiationSummary,
  DayOfWeek,
  TimeSlot,
  CostSplit,
} from "./lib/negotiation-policy";

// iCal
export { generateICalFeed, generateVEvent } from "./lib/ical";

// PayPay
export { generatePayPayLink } from "./lib/paypay";

// Settlement
export { calculateSettlement } from "./lib/settlement";
export type {
  SettlementCalculationInput,
  SettlementCalculationResult,
} from "./lib/settlement";

// Game Summary
export {
  summarizeRsvps,
  summarizeNegotiations,
  summarizeHelperRequests,
  assessReadiness,
  createGameSummary,
  countByStatus,
} from "./lib/game-summary";
export type {
  RsvpSummary,
  NegotiationSummary as NegotiationSummaryInfo,
  HelperSummary,
  GameSummary,
  GameReadiness,
} from "./lib/game-summary";

// Deadline
export {
  checkDeadline,
  shouldSendReminder,
  filterExpiredGames,
} from "./lib/deadline";
export type {
  DeadlineCheckResult,
  ReminderCheckInput,
  ReminderCheckResult,
} from "./lib/deadline";

// Validators
export {
  createGameSchema,
  updateGameSchema,
  transitionGameSchema,
  respondRsvpSchema,
  createHelperSchema,
  createHelperRequestsSchema,
  respondHelperRequestSchema,
  createNegotiationSchema,
  updateNegotiationSchema,
  createExpenseSchema,
  createTeamSchema,
  createGroundSchema,
  updateGroundWatchSchema,
  sendNotificationSchema,
  zodToValidationError,
} from "./lib/validators";
export type {
  CreateGameInput,
  UpdateGameInput,
  TransitionGameInput,
  RespondRsvpInput,
  CreateHelperInput,
  CreateHelperRequestsInput,
  RespondHelperRequestInput,
  CreateNegotiationInput,
  UpdateNegotiationInput,
  CreateExpenseInput,
  CreateTeamInput,
  CreateGroundInput,
  UpdateGroundWatchInput,
  SendNotificationInput,
} from "./lib/validators";

// AI Service
export {
  predictAttendance,
  recommendHelpers,
  generateNegotiationMessage,
  generateWeeklyReport,
} from "./lib/ai-service";
export type {
  AttendancePrediction,
  HelperRecommendation,
  PredictAttendanceInput,
  PredictAttendanceGameInput,
  RecommendHelpersInput,
  WeeklyReportGameInput,
  NegotiationMessageContext,
} from "./lib/ai-service";

// Modal AI Service
export {
  predictAttendanceModal,
  recommendHelpersModal,
  generateNegotiationMessageModal,
  generateWeeklyReportModal,
} from "./lib/modal-ai-service";

// LINE Messaging
export {
  pushMessage,
  createLineSender,
  buildRsvpReminderMessage,
  buildRsvpReminderFlex,
  buildGameConfirmedMessage,
  buildSettlementRequestMessage,
} from "./lib/line-messaging";
export type {
  LineTextMessage,
  LineFlexMessage,
  LineMessage,
  LinePushResult,
  RsvpReminderContext,
  GameConfirmedContext,
  SettlementRequestContext,
} from "./lib/line-messaging";

// Email Service
export {
  sendEmail,
  createEmailSender,
  buildRsvpReminderEmail,
  buildGameConfirmedEmail,
  buildSettlementRequestEmail,
} from "./lib/email-service";
export type {
  EmailSendResult,
  EmailSendOptions,
  EmailContent,
  EmailRsvpReminderContext,
  EmailGameConfirmedContext,
  EmailSettlementRequestContext,
} from "./lib/email-service";

// Ground Scraper
export {
  scrapeGround,
  getAdapter,
  getSupportedMunicipalities,
  generateMockSlots,
  TIME_SLOTS,
  SLOT_STATUSES,
  scrapedSlotSchema,
} from "./lib/ground-scraper";
export type {
  ScrapedSlot,
  GroundScraperAdapter,
  TimeSlot as ScraperTimeSlot,
  SlotStatus as ScraperSlotStatus,
} from "./lib/ground-scraper";

// Ground Monitor
export {
  detectNewAvailability,
  checkGrounds,
} from "./lib/ground-monitor";
export type {
  NewAvailability,
  GroundCheckResult,
  CheckGroundsResult,
} from "./lib/ground-monitor";

// Notification Dispatcher
export {
  dispatchNotifications,
  dispatchToMember,
  resolveChannels,
  getNotificationHistory,
  dispatchNotificationSchema,
  memberNotificationPreferenceSchema,
} from "./lib/notification-dispatcher";
export type {
  DispatchNotificationInput,
  MemberNotificationPreference,
  DispatchResult,
  RetryConfig,
} from "./lib/notification-dispatcher";
