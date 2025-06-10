// Re-export shared types from the shared package for consistency
// Import first, then re-export to avoid conflicts
import { Instrument as SharedInstrument, SessionType as SharedSessionType, ActivityType as SharedActivityType, LogbookEntryType as SharedLogbookEntryType, Mood as SharedMood, GoalStatus as SharedGoalStatus, Theme as SharedTheme, NotationSize as SharedNotationSize, Validators as SharedValidators, DataConverters as SharedDataConverters, } from '@mirubato/shared';
// Re-export enums
export const Instrument = SharedInstrument;
export const SessionType = SharedSessionType;
export const ActivityType = SharedActivityType;
export const LogbookEntryType = SharedLogbookEntryType;
export const Mood = SharedMood;
export const GoalStatus = SharedGoalStatus;
export const Theme = SharedTheme;
export const NotationSize = SharedNotationSize;
// Re-export utilities
export const Validators = SharedValidators;
export const DataConverters = SharedDataConverters;
//# sourceMappingURL=shared.js.map