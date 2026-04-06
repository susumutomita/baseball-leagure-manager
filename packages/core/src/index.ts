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
  // League
  LeagueStatus,
  LeagueFormat,
  LeagueTeamStatus,
  LeagueMatchStatus,
  League,
  LeagueTeam,
  LeagueMatch,
  LeagueStanding,
  // Viral
  InviteType,
  SkillLevel,
  TeamInvitation,
  TeamProfile,
  InvitationUse,
  // RSVP Settings
  RsvpVisibilityMode,
  TeamRsvpSettings,
} from "./types/domain";

export {
  GAME_STATUSES,
  GAME_TYPES,
  RSVP_RESPONSES,
  NEGOTIATION_STATUSES,
  HELPER_REQUEST_STATUSES,
  MEMBER_TIERS,
  MEMBER_ROLES,
  LEAGUE_STATUSES,
  LEAGUE_FORMATS,
  LEAGUE_TEAM_STATUSES,
  LEAGUE_MATCH_STATUSES,
  INVITE_TYPES,
  SKILL_LEVELS,
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
export {
  writeAuditLog,
  auditGameTransition,
  AUDIT_ACTIONS,
} from "./lib/audit";
export type { AuditEntry, AuditResult, AuditAction } from "./lib/audit";

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

// Cost Estimator
export { estimateGameCost } from "./lib/cost-estimator";
export type { CostEstimate, CategoryEstimate } from "./lib/cost-estimator";

// Invitation
export {
  generateInvitationToken,
  decodeInvitationToken,
  validateInvitation,
  buildInvitationUrl,
  createInvitationPayload,
} from "./lib/invitation";
export type {
  InvitationPayload,
  InvitationValidation,
} from "./lib/invitation";

// API Handler
export {
  parseBody,
  errorResponse,
  notFound,
  unauthorized,
  conflict,
} from "./lib/api-handler";
export type { HandlerResult } from "./lib/api-handler";

// Webhook Events
export {
  createWebhookEvent,
  isGameTransitionEvent,
  isRsvpRespondedEvent,
  WEBHOOK_EVENT_TYPES,
} from "./lib/webhook-events";
export type {
  WebhookEventType,
  WebhookEvent,
  GameTransitionPayload,
  RsvpRespondedPayload,
  NegotiationUpdatedPayload,
  SettlementCompletedPayload,
} from "./lib/webhook-events";

// Availability Heatmap
export {
  analyzeMemberAvailability,
  analyzeTeamAvailability,
} from "./lib/availability-heatmap";
export type {
  DayOfWeekTrend,
  MemberAvailabilityPattern,
} from "./lib/availability-heatmap";

// Cron Guard
export {
  generateIdempotencyKey,
  isDuplicate,
  processBatch,
} from "./lib/cron-guard";
export type {
  CronExecutionRecord,
  BatchResult,
} from "./lib/cron-guard";

// Schedule Conflict
export {
  detectConflicts,
  detectMemberConflicts,
} from "./lib/schedule-conflict";
export type { ScheduleConflict } from "./lib/schedule-conflict";

// Data Export
export {
  toCSV,
  exportGamesToCSV,
  exportMembersToCSV,
  exportRsvpsToCSV,
} from "./lib/data-export";

// RSVP Follow-up
export { planFollowUp } from "./lib/rsvp-followup";
export type {
  FollowUpTarget,
  FollowUpPlan,
} from "./lib/rsvp-followup";

// Notification Templates
export {
  buildRsvpRequestMessage as buildRsvpRequestTemplate,
  buildRsvpReminderMessage as buildRsvpReminderTemplate,
  buildGameConfirmedMessage as buildGameConfirmedTemplate,
  buildGameCancelledMessage as buildGameCancelledTemplate,
  buildSettlementMessage as buildSettlementTemplate,
  buildDeadlineWarningMessage as buildDeadlineWarningTemplate,
} from "./lib/notification-templates";

// Game Analytics
export {
  calculateWinLossRecord,
  generateSeasonSummary,
  generateMonthlyStats,
  calculateStreak,
} from "./lib/game-analytics";
export type {
  WinLossRecord,
  SeasonSummary,
  MonthlyStats,
} from "./lib/game-analytics";

// Opponent Matcher
export {
  scoreOpponent,
  recommendOpponents,
} from "./lib/opponent-matcher";
export type {
  OpponentRecommendation,
  MatchingCriteria,
} from "./lib/opponent-matcher";

// Game Date
export {
  daysUntilGame,
  isGameDay,
  isGamePast,
  isGameFuture,
  formatGameSchedule,
  sortGamesByDate,
  filterGamesByDateRange,
  getThisWeekGames,
} from "./lib/game-date";

// Expense Report
export {
  getCategoryLabel,
  summarizeByCategory,
  generateExpenseReport,
} from "./lib/expense-report";
export type {
  CategorySummary,
  ExpenseReport,
} from "./lib/expense-report";

// Team Capacity
export {
  analyzeTeamCapacity,
  analyzePositions,
  estimateAttendance,
} from "./lib/team-capacity";
export type {
  PositionCoverage,
  TeamCapacityReport,
} from "./lib/team-capacity";

// Attendance Tracker
export {
  calculateMemberAttendance,
  calculateRsvpAccuracy,
  rankByAttendance,
} from "./lib/attendance-tracker";
export type {
  MemberAttendanceStats,
  RsvpAccuracy,
} from "./lib/attendance-tracker";

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
  shouldSendReminder as shouldSendDeadlineReminder,
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
  createLeagueSchema,
  recordMatchResultSchema,
  createInvitationSchema,
  updateTeamProfileSchema,
  updateTeamRsvpSettingsSchema,
  createMemberSchema,
  updateMemberSchema,
  updateHelperSchema,
  createOpponentTeamSchema,
  updateOpponentTeamSchema,
  updateGroundSchema,
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
  CreateLeagueInput,
  RecordMatchResultInput,
  CreateInvitationInput,
  UpdateTeamProfileInput,
  UpdateTeamRsvpSettingsInput,
  CreateMemberInput,
  UpdateMemberInput,
  UpdateHelperInput,
  CreateOpponentTeamInput,
  UpdateOpponentTeamInput,
  UpdateGroundInput,
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

// Ground Scraper
export {
  GroundScraper,
  generateRealisticSlots,
  parseYokohamaHtml,
  parseFujisawaHtml,
  fetchWithTimeout,
  formatDate,
  seededRandom,
  KNOWN_GROUNDS,
  SCRAPE_TIMEOUT_MS,
  MOCK_DAYS_AHEAD,
} from "./lib/ground-scraper";
export type {
  ScrapedSlot,
  ScrapeResult,
  GroundAdapter,
  ScraperLogger,
  TimeSlot as GroundTimeSlot,
  SlotStatus,
  GroundScraperOptions,
} from "./lib/ground-scraper";

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

// Cron Logic
export {
  findGamesNeedingReminder,
  findGamesPassedDeadline,
  shouldSendReminder,
} from "./lib/cron-logic";
export type { CronGameInput } from "./lib/cron-logic";

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

// Orchestrator
export {
  orchestrateGame,
  orchestrateTeam,
  formatActionAsNotification,
  formatActionsAsSummary,
} from "./lib/orchestrator";
export type {
  OrchestratorAction,
  OrchestratorActionType,
  GameOrchestrationContext,
  OrchestrationResult,
  TeamOrchestrationResult,
} from "./lib/orchestrator";

// RSVP Token
export {
  generateRsvpToken,
  decodeRsvpToken,
  validateRsvpToken,
  buildRsvpUrl,
} from "./lib/rsvp-token";
export type { RsvpTokenPayload } from "./lib/rsvp-token";

// League State Machine
export {
  canLeagueTransition,
  canLeagueTransitionWithContext,
  getAvailableLeagueTransitions,
} from "./lib/league-state-machine";
export type { LeagueTransitionCheck } from "./lib/league-state-machine";

// League Scheduler
export {
  generateRoundRobinSchedule,
  generateDoubleRoundRobinSchedule,
} from "./lib/league-scheduler";
export type { ScheduledMatch } from "./lib/league-scheduler";

// League Standings
export { calculateStandings, rankStandings } from "./lib/league-standings";

// League Manager
export {
  createLeague,
  inviteTeam,
  acceptInvitation,
  declineInvitation,
  getAcceptedTeams,
} from "./lib/league-manager";
export type { CreateLeagueInput as CreateLeagueData } from "./lib/league-manager";

// RSVP Defaults
export { processDeadlineDefaults } from "./lib/rsvp-defaults";
export type { RsvpDefaultResult } from "./lib/rsvp-defaults";

// RSVP Visibility
export {
  aggregateRsvps,
  filterRsvpsForVisibility,
} from "./lib/rsvp-visibility";
export type {
  RsvpAggregate,
  FilteredRsvpView,
} from "./lib/rsvp-visibility";

// Attendance Probability
export {
  predictAttendanceProbability,
  estimatePerPersonCost,
} from "./lib/attendance-probability";
export type { AttendancePrediction as AttendanceProbability } from "./lib/attendance-probability";

// Invitation Manager
export {
  generateInviteCode,
  createInvitation as createTeamInvitation,
  validateTeamInvitation,
  useInvitation,
  buildTeamInvitationUrl,
} from "./lib/invitation-manager";
export type {
  CreateInvitationInput as CreateTeamInvitationInput,
  InvitationValidationError,
} from "./lib/invitation-manager";

// Team Profile Manager
export {
  createDefaultProfile,
  isProfileComplete,
} from "./lib/team-profile-manager";

// Team Discovery
export { searchPublicTeams, recommendTeams } from "./lib/team-discovery";
export type {
  TeamSearchFilters,
  ScoredTeamProfile,
} from "./lib/team-discovery";

// Viral Analytics
export { calculateViralMetrics } from "./lib/viral-analytics";
export type { ViralMetrics } from "./lib/viral-analytics";

// Test Fixtures
export {
  createTeamFixture,
  createMemberFixture,
  createGameFixture,
  createRsvpFixture,
  createHelperFixture,
  createHelperRequestFixture,
  createOpponentFixture,
  createNegotiationFixture,
  createExpenseFixture,
  createGameResultFixture,
  createAttendanceFixture,
  createMembersFixture,
  createRsvpsFixture,
  createLeagueFixture,
  createLeagueTeamFixture,
  createLeagueMatchFixture,
  createLeagueStandingFixture,
  createTeamInvitationFixture,
  createTeamProfileFixture,
} from "./lib/test-fixtures";
