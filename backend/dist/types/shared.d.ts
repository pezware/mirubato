import { Instrument as SharedInstrument, SessionType as SharedSessionType, ActivityType as SharedActivityType, LogbookEntryType as SharedLogbookEntryType, Mood as SharedMood, GoalStatus as SharedGoalStatus, Theme as SharedTheme, NotationSize as SharedNotationSize, User as SharedUser, UserPreferences as SharedUserPreferences, UserStats as SharedUserStats, PracticeSession as SharedPracticeSession, PracticeLog as SharedPracticeLog, LogbookEntry as SharedLogbookEntry, PieceReference as SharedPieceReference, Goal as SharedGoal, GoalMilestone as SharedGoalMilestone } from '@mirubato/shared';
export declare const Instrument: typeof SharedInstrument;
export declare const SessionType: typeof SharedSessionType;
export declare const ActivityType: typeof SharedActivityType;
export declare const LogbookEntryType: typeof SharedLogbookEntryType;
export declare const Mood: typeof SharedMood;
export declare const GoalStatus: typeof SharedGoalStatus;
export declare const Theme: typeof SharedTheme;
export declare const NotationSize: typeof SharedNotationSize;
export type UserPreferences = SharedUserPreferences;
export type UserStats = SharedUserStats;
export interface User extends SharedUser {
    preferences: UserPreferences;
    stats: UserStats;
}
export type PracticeSession = SharedPracticeSession;
export type PracticeLog = SharedPracticeLog;
export type LogbookEntry = SharedLogbookEntry;
export type PieceReference = SharedPieceReference;
export type Goal = SharedGoal;
export type GoalMilestone = SharedGoalMilestone;
export declare const Validators: {
    isValidInstrument: (value: any) => value is SharedInstrument;
    isValidSessionType: (value: any) => value is SharedSessionType;
    isValidActivityType: (value: any) => value is SharedActivityType;
    isValidTheme: (value: any) => value is SharedTheme;
    isValidLogbookEntryType: (value: any) => value is SharedLogbookEntryType;
    isValidMood: (value: any) => value is SharedMood;
    isValidGoalStatus: (value: any) => value is SharedGoalStatus;
    isValidProgress: (value: any) => boolean;
    isValidSelfRating: (value: any) => boolean;
    isValidEmail: (email: string) => boolean;
    isValidISODate: (date: string) => boolean;
};
export declare const DataConverters: {
    localSessionToDbSession: (local: import("@mirubato/shared").LocalPracticeSession) => SharedPracticeSession;
    dbSessionToLocalSession: (db: SharedPracticeSession, isSynced?: boolean) => import("@mirubato/shared").LocalPracticeSession;
    toISOString: (date: Date | string) => string;
    parseJsonField: <T>(field: string | null | undefined, defaultValue: T) => T;
    stringifyJsonField: <T>(field: T) => string;
};
/** @deprecated Use Instrument enum from @mirubato/shared instead */
export type LegacyInstrument = 'PIANO' | 'GUITAR';
/** @deprecated Use Theme enum from @mirubato/shared instead */
export type LegacyTheme = 'LIGHT' | 'DARK' | 'AUTO';
/** @deprecated Use NotationSize enum from @mirubato/shared instead */
export type LegacyNotationSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type StylePeriod = 'BAROQUE' | 'CLASSICAL' | 'ROMANTIC' | 'MODERN' | 'CONTEMPORARY';
export interface Note {
    keys: string[];
    duration: string;
    time: number;
}
export interface Tempo {
    bpm: number;
    marking?: string;
    originalMarking?: string;
    practiceTempos?: {
        slow: number;
        medium: number;
        target: number;
        performance: number;
    };
}
export interface Measure {
    number: number;
    notes: Note[];
    timeSignature?: string;
    keySignature?: string;
    clef?: string;
    tempo?: Tempo;
}
export interface SheetMusicMetadata {
    source?: string;
    license?: string;
    arrangedBy?: string;
    year?: number;
}
export interface SheetMusic {
    id: string;
    title: string;
    composer: string;
    opus?: string;
    movement?: string;
    instrument: SharedInstrument;
    difficulty: Difficulty;
    difficultyLevel: number;
    gradeLevel?: string;
    durationSeconds: number;
    timeSignature: string;
    keySignature: string;
    tempoMarking?: string;
    suggestedTempo: number;
    stylePeriod: StylePeriod;
    tags: string[];
    measures: Measure[];
    metadata?: SheetMusicMetadata;
    thumbnail?: string;
}
//# sourceMappingURL=shared.d.ts.map