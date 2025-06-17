import { DocumentNode } from 'graphql'
import * as ApolloReactCommon from '@apollo/client'
import * as ApolloReactHooks from '@apollo/client'
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K]
}
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>
}
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>
}
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never }
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
const defaultOptions = {} as const
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  DateTime: { input: string; output: string }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown> }
}

export type ActivityType =
  | 'ETUDES'
  | 'OTHER'
  | 'REPERTOIRE'
  | 'SCALES'
  | 'SIGHT_READING'
  | 'TECHNIQUE'

export type AuthPayload = {
  __typename?: 'AuthPayload'
  message: Scalars['String']['output']
  success: Scalars['Boolean']['output']
}

export type AuthResponse = {
  __typename?: 'AuthResponse'
  accessToken: Scalars['String']['output']
  expiresIn: Scalars['Int']['output']
  message: Scalars['String']['output']
  refreshToken: Scalars['String']['output']
  success: Scalars['Boolean']['output']
  user: User
}

export type CompletePracticeSessionInput = {
  accuracy?: InputMaybe<Scalars['Float']['input']>
  notesAttempted?: InputMaybe<Scalars['Int']['input']>
  notesCorrect?: InputMaybe<Scalars['Int']['input']>
  sessionId: Scalars['ID']['input']
}

export type CreateGoalInput = {
  description?: InputMaybe<Scalars['String']['input']>
  milestones?: InputMaybe<Array<GoalMilestoneInput>>
  targetDate?: InputMaybe<Scalars['DateTime']['input']>
  title: Scalars['String']['input']
}

export type CreateLogbookEntryInput = {
  duration: Scalars['Int']['input']
  goalIds?: InputMaybe<Array<Scalars['ID']['input']>>
  instrument: Instrument
  metadata?: InputMaybe<LogbookMetadataInput>
  mood?: InputMaybe<Mood>
  notes?: InputMaybe<Scalars['String']['input']>
  pieces: Array<PieceReferenceInput>
  sessionId?: InputMaybe<Scalars['ID']['input']>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  techniques?: InputMaybe<Array<Scalars['String']['input']>>
  timestamp: Scalars['DateTime']['input']
  type: LogbookEntryType
}

export type CreatePracticeLogInput = {
  activityType: ActivityType
  durationSeconds: Scalars['Int']['input']
  focusAreas?: InputMaybe<Array<Scalars['String']['input']>>
  notes?: InputMaybe<Scalars['String']['input']>
  selfRating?: InputMaybe<Scalars['Int']['input']>
  sessionId: Scalars['ID']['input']
  targetTempo?: InputMaybe<Scalars['Int']['input']>
  tempoPracticed?: InputMaybe<Scalars['Int']['input']>
}

export type CreatePracticeSessionInput = {
  accuracy?: InputMaybe<Scalars['Float']['input']>
  completedAt?: InputMaybe<Scalars['String']['input']>
  createdAt: Scalars['String']['input']
  durationMinutes: Scalars['Int']['input']
  instrument: Instrument
  notes?: InputMaybe<Scalars['String']['input']>
  sessionType: SessionType
  sheetMusicId?: InputMaybe<Scalars['ID']['input']>
  status: SessionStatus
  tempo?: InputMaybe<Scalars['Int']['input']>
  updatedAt: Scalars['String']['input']
}

export type Difficulty = 'ADVANCED' | 'BEGINNER' | 'INTERMEDIATE'

export type Goal = {
  __typename?: 'Goal'
  completedAt?: Maybe<Scalars['DateTime']['output']>
  createdAt: Scalars['DateTime']['output']
  description?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  linkedEntries: Array<Scalars['ID']['output']>
  milestones: Array<GoalMilestone>
  progress: Scalars['Float']['output']
  status: GoalStatus
  targetDate?: Maybe<Scalars['DateTime']['output']>
  title: Scalars['String']['output']
  updatedAt: Scalars['DateTime']['output']
  user: User
}

export type GoalConnection = {
  __typename?: 'GoalConnection'
  edges: Array<GoalEdge>
  pageInfo: PageInfo
  totalCount: Scalars['Int']['output']
}

export type GoalEdge = {
  __typename?: 'GoalEdge'
  cursor: Scalars['String']['output']
  node: Goal
}

export type GoalMilestone = {
  __typename?: 'GoalMilestone'
  completed: Scalars['Boolean']['output']
  completedAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  title: Scalars['String']['output']
}

export type GoalMilestoneInput = {
  completed?: InputMaybe<Scalars['Boolean']['input']>
  id?: InputMaybe<Scalars['ID']['input']>
  title: Scalars['String']['input']
}

export type GoalStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'PAUSED'

export type Instrument = 'GUITAR' | 'PIANO'

export type LogbookEntry = {
  __typename?: 'LogbookEntry'
  createdAt: Scalars['DateTime']['output']
  duration: Scalars['Int']['output']
  goalIds: Array<Scalars['ID']['output']>
  id: Scalars['ID']['output']
  instrument: Instrument
  metadata?: Maybe<LogbookMetadata>
  mood?: Maybe<Mood>
  notes?: Maybe<Scalars['String']['output']>
  pieces: Array<PieceReference>
  sessionId?: Maybe<Scalars['ID']['output']>
  tags: Array<Scalars['String']['output']>
  techniques: Array<Scalars['String']['output']>
  timestamp: Scalars['DateTime']['output']
  type: LogbookEntryType
  updatedAt: Scalars['DateTime']['output']
  user: User
}

export type LogbookEntryConnection = {
  __typename?: 'LogbookEntryConnection'
  edges: Array<LogbookEntryEdge>
  pageInfo: PageInfo
  totalCount: Scalars['Int']['output']
}

export type LogbookEntryEdge = {
  __typename?: 'LogbookEntryEdge'
  cursor: Scalars['String']['output']
  node: LogbookEntry
}

export type LogbookEntryType =
  | 'LESSON'
  | 'PERFORMANCE'
  | 'PRACTICE'
  | 'REHEARSAL'

export type LogbookFilterInput = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>
  instrument?: InputMaybe<Instrument>
  mood?: InputMaybe<Array<Mood>>
  search?: InputMaybe<Scalars['String']['input']>
  startDate?: InputMaybe<Scalars['DateTime']['input']>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  type?: InputMaybe<Array<LogbookEntryType>>
  userId?: InputMaybe<Scalars['ID']['input']>
}

export type LogbookMetadata = {
  __typename?: 'LogbookMetadata'
  accuracy?: Maybe<Scalars['Float']['output']>
  mistakeCount?: Maybe<Scalars['Int']['output']>
  notesPlayed?: Maybe<Scalars['Int']['output']>
  source: Scalars['String']['output']
}

export type LogbookMetadataInput = {
  accuracy?: InputMaybe<Scalars['Float']['input']>
  mistakeCount?: InputMaybe<Scalars['Int']['input']>
  notesPlayed?: InputMaybe<Scalars['Int']['input']>
  source: Scalars['String']['input']
}

export type Measure = {
  __typename?: 'Measure'
  clef?: Maybe<Scalars['String']['output']>
  keySignature?: Maybe<Scalars['String']['output']>
  notes: Array<Note>
  number: Scalars['Int']['output']
  tempo?: Maybe<Tempo>
  timeSignature?: Maybe<Scalars['String']['output']>
}

export type Mood = 'EXCITED' | 'FRUSTRATED' | 'NEUTRAL' | 'SATISFIED'

export type Mutation = {
  __typename?: 'Mutation'
  completePracticeSession: PracticeSession
  createGoal: Goal
  createLogbookEntry: LogbookEntry
  createPracticeLog: PracticeLog
  deleteAccount: AuthPayload
  deleteGoal: Scalars['Boolean']['output']
  deleteLogbookEntry: Scalars['Boolean']['output']
  linkEntryToGoal: Goal
  logout: AuthPayload
  pausePracticeSession: PracticeSession
  refreshToken: AuthResponse
  requestMagicLink: AuthPayload
  resumePracticeSession: PracticeSession
  startPracticeSession: PracticeSession
  syncAnonymousData: SyncResult
  /** Sync a batch of entities */
  syncBatch: SyncBatchResult
  updateGoal: Goal
  updateGoalMilestone: Goal
  updateLogbookEntry: LogbookEntry
  /** Update sync metadata after successful sync */
  updateSyncMetadata: SyncMetadata
  updateUser: User
  verifyMagicLink: AuthResponse
}

export type MutationCompletePracticeSessionArgs = {
  input: CompletePracticeSessionInput
}

export type MutationCreateGoalArgs = {
  input: CreateGoalInput
}

export type MutationCreateLogbookEntryArgs = {
  input: CreateLogbookEntryInput
}

export type MutationCreatePracticeLogArgs = {
  input: CreatePracticeLogInput
}

export type MutationDeleteGoalArgs = {
  id: Scalars['ID']['input']
}

export type MutationDeleteLogbookEntryArgs = {
  id: Scalars['ID']['input']
}

export type MutationLinkEntryToGoalArgs = {
  entryId: Scalars['ID']['input']
  goalId: Scalars['ID']['input']
}

export type MutationPausePracticeSessionArgs = {
  sessionId: Scalars['ID']['input']
}

export type MutationRequestMagicLinkArgs = {
  email: Scalars['String']['input']
}

export type MutationResumePracticeSessionArgs = {
  sessionId: Scalars['ID']['input']
}

export type MutationStartPracticeSessionArgs = {
  input: StartPracticeSessionInput
}

export type MutationSyncAnonymousDataArgs = {
  input: SyncAnonymousDataInput
}

export type MutationSyncBatchArgs = {
  batch: SyncBatchInput
}

export type MutationUpdateGoalArgs = {
  id: Scalars['ID']['input']
  input: UpdateGoalInput
}

export type MutationUpdateGoalMilestoneArgs = {
  completed: Scalars['Boolean']['input']
  goalId: Scalars['ID']['input']
  milestoneId: Scalars['ID']['input']
}

export type MutationUpdateLogbookEntryArgs = {
  id: Scalars['ID']['input']
  input: UpdateLogbookEntryInput
}

export type MutationUpdateSyncMetadataArgs = {
  lastSyncTimestamp: Scalars['Float']['input']
  status: Scalars['String']['input']
  syncToken: Scalars['String']['input']
  userId: Scalars['ID']['input']
}

export type MutationUpdateUserArgs = {
  input: UpdateUserInput
}

export type MutationVerifyMagicLinkArgs = {
  token: Scalars['String']['input']
}

export type NotationSize = 'LARGE' | 'MEDIUM' | 'SMALL'

export type Note = {
  __typename?: 'Note'
  duration: Scalars['String']['output']
  keys: Array<Scalars['String']['output']>
  time: Scalars['Float']['output']
}

export type PageInfo = {
  __typename?: 'PageInfo'
  endCursor?: Maybe<Scalars['String']['output']>
  hasNextPage: Scalars['Boolean']['output']
  hasPreviousPage: Scalars['Boolean']['output']
  startCursor?: Maybe<Scalars['String']['output']>
}

export type PieceReference = {
  __typename?: 'PieceReference'
  composer?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  measures?: Maybe<Scalars['String']['output']>
  tempo?: Maybe<Scalars['Int']['output']>
  title: Scalars['String']['output']
}

export type PieceReferenceInput = {
  composer?: InputMaybe<Scalars['String']['input']>
  id: Scalars['ID']['input']
  measures?: InputMaybe<Scalars['String']['input']>
  tempo?: InputMaybe<Scalars['Int']['input']>
  title: Scalars['String']['input']
}

export type PracticeGoal = {
  __typename?: 'PracticeGoal'
  completed: Scalars['Boolean']['output']
  completedAt?: Maybe<Scalars['DateTime']['output']>
  createdAt: Scalars['DateTime']['output']
  currentValue: Scalars['Float']['output']
  deadline?: Maybe<Scalars['DateTime']['output']>
  description?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  targetValue: Scalars['Float']['output']
  title: Scalars['String']['output']
  unit: Scalars['String']['output']
  updatedAt: Scalars['DateTime']['output']
}

export type PracticeLog = {
  __typename?: 'PracticeLog'
  activityType: ActivityType
  createdAt: Scalars['DateTime']['output']
  durationSeconds: Scalars['Int']['output']
  focusAreas: Array<Scalars['String']['output']>
  id: Scalars['ID']['output']
  notes?: Maybe<Scalars['String']['output']>
  selfRating?: Maybe<Scalars['Int']['output']>
  session: PracticeSession
  targetTempo?: Maybe<Scalars['Int']['output']>
  tempoPracticed?: Maybe<Scalars['Int']['output']>
}

export type PracticeSession = {
  __typename?: 'PracticeSession'
  accuracy?: Maybe<Scalars['Float']['output']>
  completedAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  instrument: Instrument
  logs: Array<PracticeLog>
  notesAttempted: Scalars['Int']['output']
  notesCorrect: Scalars['Int']['output']
  pausedDuration: Scalars['Int']['output']
  sessionType: SessionType
  sheetMusic?: Maybe<SheetMusic>
  startedAt: Scalars['DateTime']['output']
  user: User
}

export type PracticeSessionConnection = {
  __typename?: 'PracticeSessionConnection'
  edges: Array<PracticeSessionEdge>
  pageInfo: PageInfo
  totalCount: Scalars['Int']['output']
}

export type PracticeSessionEdge = {
  __typename?: 'PracticeSessionEdge'
  cursor: Scalars['String']['output']
  node: PracticeSession
}

export type PracticeTempos = {
  __typename?: 'PracticeTempos'
  medium: Scalars['Int']['output']
  performance: Scalars['Int']['output']
  slow: Scalars['Int']['output']
  target: Scalars['Int']['output']
}

export type Query = {
  __typename?: 'Query'
  /** Get all user data for full sync */
  allUserData: UserData
  goal?: Maybe<Goal>
  listSheetMusic: SheetMusicConnection
  logbookEntry?: Maybe<LogbookEntry>
  me?: Maybe<User>
  myGoals: GoalConnection
  myLogbookEntries: LogbookEntryConnection
  myPracticeSessions: PracticeSessionConnection
  practiceSession?: Maybe<PracticeSession>
  randomSheetMusic?: Maybe<SheetMusic>
  sheetMusic?: Maybe<SheetMusic>
  /** Get changes since a sync token */
  syncChangesSince: SyncDelta
  /** Get sync metadata for a user */
  syncMetadata?: Maybe<SyncMetadata>
  user?: Maybe<User>
}

export type QueryAllUserDataArgs = {
  userId: Scalars['ID']['input']
}

export type QueryGoalArgs = {
  id: Scalars['ID']['input']
}

export type QueryListSheetMusicArgs = {
  filter?: InputMaybe<SheetMusicFilterInput>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryLogbookEntryArgs = {
  id: Scalars['ID']['input']
}

export type QueryMyGoalsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  status?: InputMaybe<GoalStatus>
}

export type QueryMyLogbookEntriesArgs = {
  filter?: InputMaybe<LogbookFilterInput>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryMyPracticeSessionsArgs = {
  instrument?: InputMaybe<Instrument>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type QueryPracticeSessionArgs = {
  id: Scalars['ID']['input']
}

export type QueryRandomSheetMusicArgs = {
  difficulty?: InputMaybe<Difficulty>
  instrument: Instrument
  maxDuration?: InputMaybe<Scalars['Int']['input']>
}

export type QuerySheetMusicArgs = {
  id: Scalars['ID']['input']
}

export type QuerySyncChangesSinceArgs = {
  syncToken: Scalars['String']['input']
}

export type QuerySyncMetadataArgs = {
  userId: Scalars['ID']['input']
}

export type QueryUserArgs = {
  id: Scalars['ID']['input']
}

export type SessionStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PAUSED'

export type SessionType = 'ASSESSMENT' | 'FREE_PRACTICE' | 'GUIDED_PRACTICE'

export type SheetMusic = {
  __typename?: 'SheetMusic'
  composer: Scalars['String']['output']
  difficulty: Difficulty
  difficultyLevel: Scalars['Int']['output']
  durationSeconds: Scalars['Int']['output']
  gradeLevel?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  instrument: Instrument
  keySignature: Scalars['String']['output']
  measures: Array<Measure>
  metadata?: Maybe<SheetMusicMetadata>
  movement?: Maybe<Scalars['String']['output']>
  opus?: Maybe<Scalars['String']['output']>
  stylePeriod: StylePeriod
  suggestedTempo: Scalars['Int']['output']
  tags: Array<Scalars['String']['output']>
  tempoMarking?: Maybe<Scalars['String']['output']>
  thumbnail?: Maybe<Scalars['String']['output']>
  timeSignature: Scalars['String']['output']
  title: Scalars['String']['output']
}

export type SheetMusicConnection = {
  __typename?: 'SheetMusicConnection'
  edges: Array<SheetMusicEdge>
  pageInfo: PageInfo
  totalCount: Scalars['Int']['output']
}

export type SheetMusicEdge = {
  __typename?: 'SheetMusicEdge'
  cursor: Scalars['String']['output']
  node: SheetMusic
}

export type SheetMusicFilterInput = {
  difficulty?: InputMaybe<Difficulty>
  instrument?: InputMaybe<Instrument>
  maxDifficultyLevel?: InputMaybe<Scalars['Int']['input']>
  maxDuration?: InputMaybe<Scalars['Int']['input']>
  minDifficultyLevel?: InputMaybe<Scalars['Int']['input']>
  search?: InputMaybe<Scalars['String']['input']>
  stylePeriod?: InputMaybe<StylePeriod>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
}

export type SheetMusicMetadata = {
  __typename?: 'SheetMusicMetadata'
  arrangedBy?: Maybe<Scalars['String']['output']>
  license?: Maybe<Scalars['String']['output']>
  source?: Maybe<Scalars['String']['output']>
  year?: Maybe<Scalars['Int']['output']>
}

export type StartPracticeSessionInput = {
  instrument: Instrument
  sessionType: SessionType
  sheetMusicId?: InputMaybe<Scalars['ID']['input']>
}

export type StylePeriod =
  | 'BAROQUE'
  | 'CLASSICAL'
  | 'CONTEMPORARY'
  | 'MODERN'
  | 'ROMANTIC'

export type SyncAnonymousDataInput = {
  entries: Array<CreateLogbookEntryInput>
  goals: Array<CreateGoalInput>
  logs: Array<CreatePracticeLogInput>
  sessions: Array<CreatePracticeSessionInput>
}

export type SyncBatchInput = {
  entities: Array<SyncEntityInput>
  syncToken?: InputMaybe<Scalars['String']['input']>
  userId: Scalars['ID']['input']
}

export type SyncBatchResult = {
  __typename?: 'SyncBatchResult'
  errors: Array<SyncError>
  failed: Scalars['Int']['output']
  newSyncToken: Scalars['String']['output']
  uploaded: Scalars['Int']['output']
}

export type SyncDelta = {
  __typename?: 'SyncDelta'
  deletedIds: Array<Scalars['String']['output']>
  entities: Array<SyncEntity>
  newSyncToken: Scalars['String']['output']
}

export type SyncEntity = {
  __typename?: 'SyncEntity'
  checksum: Scalars['String']['output']
  createdAt: Scalars['Float']['output']
  data: Scalars['JSON']['output']
  deletedAt?: Maybe<Scalars['Float']['output']>
  entityType: Scalars['String']['output']
  id: Scalars['ID']['output']
  syncVersion: Scalars['Int']['output']
  updatedAt: Scalars['Float']['output']
}

export type SyncEntityInput = {
  checksum: Scalars['String']['input']
  createdAt: Scalars['Float']['input']
  data: Scalars['JSON']['input']
  deletedAt?: InputMaybe<Scalars['Float']['input']>
  entityType: Scalars['String']['input']
  id: Scalars['String']['input']
  localId: Scalars['String']['input']
  remoteId?: InputMaybe<Scalars['String']['input']>
  syncVersion: Scalars['Int']['input']
  updatedAt: Scalars['Float']['input']
}

export type SyncError = {
  __typename?: 'SyncError'
  entityId: Scalars['String']['output']
  error: Scalars['String']['output']
}

export type SyncMetadata = {
  __typename?: 'SyncMetadata'
  lastSyncError?: Maybe<Scalars['String']['output']>
  lastSyncStatus: Scalars['String']['output']
  lastSyncTimestamp: Scalars['Float']['output']
  pendingSyncCount: Scalars['Int']['output']
  syncToken?: Maybe<Scalars['String']['output']>
}

export type SyncResult = {
  __typename?: 'SyncResult'
  errors?: Maybe<Array<Scalars['String']['output']>>
  success: Scalars['Boolean']['output']
  syncedEntries: Scalars['Int']['output']
  syncedGoals: Scalars['Int']['output']
  syncedLogs: Scalars['Int']['output']
  syncedSessions: Scalars['Int']['output']
}

export type Tempo = {
  __typename?: 'Tempo'
  bpm: Scalars['Int']['output']
  marking?: Maybe<Scalars['String']['output']>
  originalMarking?: Maybe<Scalars['String']['output']>
  practiceTempos?: Maybe<PracticeTempos>
}

export type Theme = 'AUTO' | 'DARK' | 'LIGHT'

export type TokenPayload = {
  __typename?: 'TokenPayload'
  accessToken: Scalars['String']['output']
  expiresIn: Scalars['Int']['output']
  refreshToken: Scalars['String']['output']
  user: User
}

export type UpdateGoalInput = {
  description?: InputMaybe<Scalars['String']['input']>
  progress?: InputMaybe<Scalars['Float']['input']>
  status?: InputMaybe<GoalStatus>
  targetDate?: InputMaybe<Scalars['DateTime']['input']>
  title?: InputMaybe<Scalars['String']['input']>
}

export type UpdateLogbookEntryInput = {
  duration?: InputMaybe<Scalars['Int']['input']>
  goalIds?: InputMaybe<Array<Scalars['ID']['input']>>
  instrument?: InputMaybe<Instrument>
  mood?: InputMaybe<Mood>
  notes?: InputMaybe<Scalars['String']['input']>
  pieces?: InputMaybe<Array<PieceReferenceInput>>
  tags?: InputMaybe<Array<Scalars['String']['input']>>
  techniques?: InputMaybe<Array<Scalars['String']['input']>>
  timestamp?: InputMaybe<Scalars['DateTime']['input']>
  type?: InputMaybe<LogbookEntryType>
}

export type UpdateUserInput = {
  displayName?: InputMaybe<Scalars['String']['input']>
  preferences?: InputMaybe<UserPreferencesInput>
  primaryInstrument?: InputMaybe<Instrument>
}

export type User = {
  __typename?: 'User'
  createdAt: Scalars['DateTime']['output']
  displayName?: Maybe<Scalars['String']['output']>
  email: Scalars['String']['output']
  hasCloudStorage: Scalars['Boolean']['output']
  id: Scalars['ID']['output']
  preferences: UserPreferences
  primaryInstrument: Instrument
  stats: UserStats
  updatedAt: Scalars['DateTime']['output']
}

export type UserData = {
  __typename?: 'UserData'
  logbookEntries: Array<LogbookEntry>
  practiceGoals: Array<PracticeGoal>
  practiceSessions: Array<PracticeSession>
}

export type UserPreferences = {
  __typename?: 'UserPreferences'
  customSettings?: Maybe<Scalars['JSON']['output']>
  dailyGoalMinutes: Scalars['Int']['output']
  notationSize: NotationSize
  practiceReminders: Scalars['Boolean']['output']
  theme: Theme
}

export type UserPreferencesInput = {
  customSettings?: InputMaybe<Scalars['JSON']['input']>
  dailyGoalMinutes?: InputMaybe<Scalars['Int']['input']>
  notationSize?: InputMaybe<NotationSize>
  practiceReminders?: InputMaybe<Scalars['Boolean']['input']>
  theme?: InputMaybe<Theme>
}

export type UserStats = {
  __typename?: 'UserStats'
  accuracyAverage: Scalars['Float']['output']
  consecutiveDays: Scalars['Int']['output']
  piecesCompleted: Scalars['Int']['output']
  totalPracticeTime: Scalars['Int']['output']
}

export type RequestMagicLinkMutationVariables = Exact<{
  email: Scalars['String']['input']
}>

export type RequestMagicLinkMutation = {
  __typename?: 'Mutation'
  requestMagicLink: {
    __typename?: 'AuthPayload'
    success: boolean
    message: string
  }
}

export type VerifyMagicLinkMutationVariables = Exact<{
  token: Scalars['String']['input']
}>

export type VerifyMagicLinkMutation = {
  __typename?: 'Mutation'
  verifyMagicLink: {
    __typename?: 'AuthResponse'
    success: boolean
    message: string
    user: {
      __typename?: 'User'
      id: string
      email: string
      displayName?: string | null
      primaryInstrument: Instrument
      hasCloudStorage: boolean
      createdAt: string
      updatedAt: string
    }
  }
}

export type RefreshTokenMutationVariables = Exact<{ [key: string]: never }>

export type RefreshTokenMutation = {
  __typename?: 'Mutation'
  refreshToken: {
    __typename?: 'AuthResponse'
    success: boolean
    message: string
    user: {
      __typename?: 'User'
      id: string
      email: string
      displayName?: string | null
      primaryInstrument: Instrument
      hasCloudStorage: boolean
      createdAt: string
      updatedAt: string
    }
  }
}

export type LogoutMutationVariables = Exact<{ [key: string]: never }>

export type LogoutMutation = {
  __typename?: 'Mutation'
  logout: { __typename?: 'AuthPayload'; success: boolean; message: string }
}

export type GetLogbookEntriesQueryVariables = Exact<{
  filter?: InputMaybe<LogbookFilterInput>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetLogbookEntriesQuery = {
  __typename?: 'Query'
  myLogbookEntries: {
    __typename?: 'LogbookEntryConnection'
    totalCount: number
    edges: Array<{
      __typename?: 'LogbookEntryEdge'
      node: {
        __typename?: 'LogbookEntry'
        id: string
        timestamp: string
        duration: number
        type: LogbookEntryType
        instrument: Instrument
        techniques: Array<string>
        goalIds: Array<string>
        notes?: string | null
        mood?: Mood | null
        tags: Array<string>
        createdAt: string
        updatedAt: string
        user: { __typename?: 'User'; id: string }
        pieces: Array<{
          __typename?: 'PieceReference'
          id: string
          title: string
          composer?: string | null
          measures?: string | null
          tempo?: number | null
        }>
        metadata?: {
          __typename?: 'LogbookMetadata'
          source: string
          accuracy?: number | null
          notesPlayed?: number | null
          mistakeCount?: number | null
        } | null
      }
    }>
    pageInfo: {
      __typename?: 'PageInfo'
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
  }
}

export type GetGoalsQueryVariables = Exact<{
  status?: InputMaybe<GoalStatus>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}>

export type GetGoalsQuery = {
  __typename?: 'Query'
  myGoals: {
    __typename?: 'GoalConnection'
    totalCount: number
    edges: Array<{
      __typename?: 'GoalEdge'
      node: {
        __typename?: 'Goal'
        id: string
        title: string
        description?: string | null
        targetDate?: string | null
        progress: number
        status: GoalStatus
        linkedEntries: Array<string>
        createdAt: string
        updatedAt: string
        completedAt?: string | null
        user: { __typename?: 'User'; id: string }
        milestones: Array<{
          __typename?: 'GoalMilestone'
          id: string
          title: string
          completed: boolean
          completedAt?: string | null
        }>
      }
    }>
    pageInfo: {
      __typename?: 'PageInfo'
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
  }
}

export type CreateLogbookEntryMutationVariables = Exact<{
  input: CreateLogbookEntryInput
}>

export type CreateLogbookEntryMutation = {
  __typename?: 'Mutation'
  createLogbookEntry: {
    __typename?: 'LogbookEntry'
    id: string
    timestamp: string
    duration: number
    type: LogbookEntryType
    instrument: Instrument
    techniques: Array<string>
    goalIds: Array<string>
    notes?: string | null
    mood?: Mood | null
    tags: Array<string>
    sessionId?: string | null
    createdAt: string
    updatedAt: string
    user: { __typename?: 'User'; id: string }
    pieces: Array<{
      __typename?: 'PieceReference'
      id: string
      title: string
      composer?: string | null
      measures?: string | null
      tempo?: number | null
    }>
    metadata?: {
      __typename?: 'LogbookMetadata'
      source: string
      accuracy?: number | null
      notesPlayed?: number | null
      mistakeCount?: number | null
    } | null
  }
}

export type UpdateLogbookEntryMutationVariables = Exact<{
  id: Scalars['ID']['input']
  input: UpdateLogbookEntryInput
}>

export type UpdateLogbookEntryMutation = {
  __typename?: 'Mutation'
  updateLogbookEntry: {
    __typename?: 'LogbookEntry'
    id: string
    timestamp: string
    duration: number
    type: LogbookEntryType
    instrument: Instrument
    techniques: Array<string>
    goalIds: Array<string>
    notes?: string | null
    mood?: Mood | null
    tags: Array<string>
    sessionId?: string | null
    createdAt: string
    updatedAt: string
    user: { __typename?: 'User'; id: string }
    pieces: Array<{
      __typename?: 'PieceReference'
      id: string
      title: string
      composer?: string | null
      measures?: string | null
      tempo?: number | null
    }>
    metadata?: {
      __typename?: 'LogbookMetadata'
      source: string
      accuracy?: number | null
      notesPlayed?: number | null
      mistakeCount?: number | null
    } | null
  }
}

export type DeleteLogbookEntryMutationVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type DeleteLogbookEntryMutation = {
  __typename?: 'Mutation'
  deleteLogbookEntry: boolean
}

export type CreateGoalMutationVariables = Exact<{
  input: CreateGoalInput
}>

export type CreateGoalMutation = {
  __typename?: 'Mutation'
  createGoal: {
    __typename?: 'Goal'
    id: string
    title: string
    description?: string | null
    targetDate?: string | null
    progress: number
    status: GoalStatus
    linkedEntries: Array<string>
    createdAt: string
    updatedAt: string
    completedAt?: string | null
    user: { __typename?: 'User'; id: string }
    milestones: Array<{
      __typename?: 'GoalMilestone'
      id: string
      title: string
      completed: boolean
      completedAt?: string | null
    }>
  }
}

export type UpdateGoalMutationVariables = Exact<{
  id: Scalars['ID']['input']
  input: UpdateGoalInput
}>

export type UpdateGoalMutation = {
  __typename?: 'Mutation'
  updateGoal: {
    __typename?: 'Goal'
    id: string
    title: string
    description?: string | null
    targetDate?: string | null
    progress: number
    status: GoalStatus
    linkedEntries: Array<string>
    createdAt: string
    updatedAt: string
    completedAt?: string | null
    user: { __typename?: 'User'; id: string }
    milestones: Array<{
      __typename?: 'GoalMilestone'
      id: string
      title: string
      completed: boolean
      completedAt?: string | null
    }>
  }
}

export type DeleteGoalMutationVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type DeleteGoalMutation = {
  __typename?: 'Mutation'
  deleteGoal: boolean
}

export type SyncAnonymousDataMutationVariables = Exact<{
  input: SyncAnonymousDataInput
}>

export type SyncAnonymousDataMutation = {
  __typename?: 'Mutation'
  syncAnonymousData: {
    __typename?: 'SyncResult'
    success: boolean
    syncedSessions: number
    syncedLogs: number
    syncedEntries: number
    syncedGoals: number
    errors?: Array<string> | null
  }
}

export type GetCurrentUserQueryVariables = Exact<{ [key: string]: never }>

export type GetCurrentUserQuery = {
  __typename?: 'Query'
  me?: {
    __typename?: 'User'
    id: string
    email: string
    displayName?: string | null
    primaryInstrument: Instrument
    hasCloudStorage: boolean
    createdAt: string
    updatedAt: string
    preferences: {
      __typename?: 'UserPreferences'
      theme: Theme
      notationSize: NotationSize
      practiceReminders: boolean
      dailyGoalMinutes: number
      customSettings?: Record<string, unknown> | null
    }
    stats: {
      __typename?: 'UserStats'
      totalPracticeTime: number
      consecutiveDays: number
      piecesCompleted: number
      accuracyAverage: number
    }
  } | null
}

export type UpdateUserProfileMutationVariables = Exact<{
  input: UpdateUserInput
}>

export type UpdateUserProfileMutation = {
  __typename?: 'Mutation'
  updateUser: {
    __typename?: 'User'
    id: string
    email: string
    displayName?: string | null
    primaryInstrument: Instrument
    updatedAt: string
  }
}

export type UpdateUserPreferencesMutationVariables = Exact<{
  preferences: UserPreferencesInput
}>

export type UpdateUserPreferencesMutation = {
  __typename?: 'Mutation'
  updateUser: {
    __typename?: 'User'
    id: string
    preferences: {
      __typename?: 'UserPreferences'
      theme: Theme
      notationSize: NotationSize
      practiceReminders: boolean
      dailyGoalMinutes: number
      customSettings?: Record<string, unknown> | null
    }
  }
}

export const RequestMagicLinkDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RequestMagicLink' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'email' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'requestMagicLink' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'email' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'email' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type RequestMagicLinkMutationFn = ApolloReactCommon.MutationFunction<
  RequestMagicLinkMutation,
  RequestMagicLinkMutationVariables
>

/**
 * __useRequestMagicLinkMutation__
 *
 * To run a mutation, you first call `useRequestMagicLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestMagicLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestMagicLinkMutation, { data, loading, error }] = useRequestMagicLinkMutation({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useRequestMagicLinkMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    RequestMagicLinkMutation,
    RequestMagicLinkMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    RequestMagicLinkMutation,
    RequestMagicLinkMutationVariables
  >(RequestMagicLinkDocument, options)
}
export type RequestMagicLinkMutationHookResult = ReturnType<
  typeof useRequestMagicLinkMutation
>
export type RequestMagicLinkMutationResult =
  ApolloReactCommon.MutationResult<RequestMagicLinkMutation>
export type RequestMagicLinkMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    RequestMagicLinkMutation,
    RequestMagicLinkMutationVariables
  >
export const VerifyMagicLinkDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'VerifyMagicLink' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'token' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'verifyMagicLink' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'token' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'token' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'displayName' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'primaryInstrument' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasCloudStorage' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdAt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type VerifyMagicLinkMutationFn = ApolloReactCommon.MutationFunction<
  VerifyMagicLinkMutation,
  VerifyMagicLinkMutationVariables
>

/**
 * __useVerifyMagicLinkMutation__
 *
 * To run a mutation, you first call `useVerifyMagicLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVerifyMagicLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [verifyMagicLinkMutation, { data, loading, error }] = useVerifyMagicLinkMutation({
 *   variables: {
 *      token: // value for 'token'
 *   },
 * });
 */
export function useVerifyMagicLinkMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    VerifyMagicLinkMutation,
    VerifyMagicLinkMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    VerifyMagicLinkMutation,
    VerifyMagicLinkMutationVariables
  >(VerifyMagicLinkDocument, options)
}
export type VerifyMagicLinkMutationHookResult = ReturnType<
  typeof useVerifyMagicLinkMutation
>
export type VerifyMagicLinkMutationResult =
  ApolloReactCommon.MutationResult<VerifyMagicLinkMutation>
export type VerifyMagicLinkMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    VerifyMagicLinkMutation,
    VerifyMagicLinkMutationVariables
  >
export const RefreshTokenDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RefreshToken' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'refreshToken' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'displayName' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'primaryInstrument' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasCloudStorage' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdAt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type RefreshTokenMutationFn = ApolloReactCommon.MutationFunction<
  RefreshTokenMutation,
  RefreshTokenMutationVariables
>

/**
 * __useRefreshTokenMutation__
 *
 * To run a mutation, you first call `useRefreshTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRefreshTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [refreshTokenMutation, { data, loading, error }] = useRefreshTokenMutation({
 *   variables: {
 *   },
 * });
 */
export function useRefreshTokenMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    RefreshTokenMutation,
    RefreshTokenMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    RefreshTokenMutation,
    RefreshTokenMutationVariables
  >(RefreshTokenDocument, options)
}
export type RefreshTokenMutationHookResult = ReturnType<
  typeof useRefreshTokenMutation
>
export type RefreshTokenMutationResult =
  ApolloReactCommon.MutationResult<RefreshTokenMutation>
export type RefreshTokenMutationOptions = ApolloReactCommon.BaseMutationOptions<
  RefreshTokenMutation,
  RefreshTokenMutationVariables
>
export const LogoutDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'Logout' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'logout' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type LogoutMutationFn = ApolloReactCommon.MutationFunction<
  LogoutMutation,
  LogoutMutationVariables
>

/**
 * __useLogoutMutation__
 *
 * To run a mutation, you first call `useLogoutMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogoutMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logoutMutation, { data, loading, error }] = useLogoutMutation({
 *   variables: {
 *   },
 * });
 */
export function useLogoutMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    LogoutMutation,
    LogoutMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<LogoutMutation, LogoutMutationVariables>(
    LogoutDocument,
    options
  )
}
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>
export type LogoutMutationResult =
  ApolloReactCommon.MutationResult<LogoutMutation>
export type LogoutMutationOptions = ApolloReactCommon.BaseMutationOptions<
  LogoutMutation,
  LogoutMutationVariables
>
export const GetLogbookEntriesDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetLogbookEntries' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'filter' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'LogbookFilterInput' },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'limit' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'offset' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'myLogbookEntries' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'filter' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'filter' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'limit' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'offset' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'offset' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'edges' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'node' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'id' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'user' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'id' },
                                  },
                                ],
                              },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'timestamp' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'duration' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'type' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'instrument' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'pieces' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'id' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'title' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'composer' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'measures' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'tempo' },
                                  },
                                ],
                              },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'techniques' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'goalIds' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'notes' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'mood' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'tags' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'metadata' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'source' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'accuracy' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: {
                                      kind: 'Name',
                                      value: 'notesPlayed',
                                    },
                                  },
                                  {
                                    kind: 'Field',
                                    name: {
                                      kind: 'Name',
                                      value: 'mistakeCount',
                                    },
                                  },
                                ],
                              },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'createdAt' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'updatedAt' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'pageInfo' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasNextPage' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasPreviousPage' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'startCursor' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endCursor' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode

/**
 * __useGetLogbookEntriesQuery__
 *
 * To run a query within a React component, call `useGetLogbookEntriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLogbookEntriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLogbookEntriesQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetLogbookEntriesQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<
    GetLogbookEntriesQuery,
    GetLogbookEntriesQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<
    GetLogbookEntriesQuery,
    GetLogbookEntriesQueryVariables
  >(GetLogbookEntriesDocument, options)
}
export function useGetLogbookEntriesLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetLogbookEntriesQuery,
    GetLogbookEntriesQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<
    GetLogbookEntriesQuery,
    GetLogbookEntriesQueryVariables
  >(GetLogbookEntriesDocument, options)
}
export function useGetLogbookEntriesSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetLogbookEntriesQuery,
        GetLogbookEntriesQueryVariables
      >
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useSuspenseQuery<
    GetLogbookEntriesQuery,
    GetLogbookEntriesQueryVariables
  >(GetLogbookEntriesDocument, options)
}
export type GetLogbookEntriesQueryHookResult = ReturnType<
  typeof useGetLogbookEntriesQuery
>
export type GetLogbookEntriesLazyQueryHookResult = ReturnType<
  typeof useGetLogbookEntriesLazyQuery
>
export type GetLogbookEntriesSuspenseQueryHookResult = ReturnType<
  typeof useGetLogbookEntriesSuspenseQuery
>
export type GetLogbookEntriesQueryResult = ApolloReactCommon.QueryResult<
  GetLogbookEntriesQuery,
  GetLogbookEntriesQueryVariables
>
export const GetGoalsDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetGoals' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'status' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'GoalStatus' },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'limit' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'offset' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'myGoals' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'status' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'status' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'limit' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'offset' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'offset' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'edges' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'node' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'id' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'user' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'id' },
                                  },
                                ],
                              },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'title' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'description' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'targetDate' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'progress' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'status' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'linkedEntries' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'milestones' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'id' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'title' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'completed' },
                                  },
                                  {
                                    kind: 'Field',
                                    name: {
                                      kind: 'Name',
                                      value: 'completedAt',
                                    },
                                  },
                                ],
                              },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'createdAt' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'updatedAt' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'completedAt' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'pageInfo' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasNextPage' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasPreviousPage' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'startCursor' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endCursor' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode

/**
 * __useGetGoalsQuery__
 *
 * To run a query within a React component, call `useGetGoalsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGoalsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGoalsQuery({
 *   variables: {
 *      status: // value for 'status'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetGoalsQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<
    GetGoalsQuery,
    GetGoalsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<GetGoalsQuery, GetGoalsQueryVariables>(
    GetGoalsDocument,
    options
  )
}
export function useGetGoalsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetGoalsQuery,
    GetGoalsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<GetGoalsQuery, GetGoalsQueryVariables>(
    GetGoalsDocument,
    options
  )
}
export function useGetGoalsSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetGoalsQuery,
        GetGoalsQueryVariables
      >
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useSuspenseQuery<
    GetGoalsQuery,
    GetGoalsQueryVariables
  >(GetGoalsDocument, options)
}
export type GetGoalsQueryHookResult = ReturnType<typeof useGetGoalsQuery>
export type GetGoalsLazyQueryHookResult = ReturnType<
  typeof useGetGoalsLazyQuery
>
export type GetGoalsSuspenseQueryHookResult = ReturnType<
  typeof useGetGoalsSuspenseQuery
>
export type GetGoalsQueryResult = ApolloReactCommon.QueryResult<
  GetGoalsQuery,
  GetGoalsQueryVariables
>
export const CreateLogbookEntryDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateLogbookEntry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateLogbookEntryInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createLogbookEntry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
                { kind: 'Field', name: { kind: 'Name', value: 'duration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'instrument' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'pieces' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'composer' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'measures' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'tempo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'techniques' } },
                { kind: 'Field', name: { kind: 'Name', value: 'goalIds' } },
                { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
                { kind: 'Field', name: { kind: 'Name', value: 'mood' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tags' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'metadata' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'source' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'accuracy' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'notesPlayed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mistakeCount' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type CreateLogbookEntryMutationFn = ApolloReactCommon.MutationFunction<
  CreateLogbookEntryMutation,
  CreateLogbookEntryMutationVariables
>

/**
 * __useCreateLogbookEntryMutation__
 *
 * To run a mutation, you first call `useCreateLogbookEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateLogbookEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createLogbookEntryMutation, { data, loading, error }] = useCreateLogbookEntryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateLogbookEntryMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreateLogbookEntryMutation,
    CreateLogbookEntryMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    CreateLogbookEntryMutation,
    CreateLogbookEntryMutationVariables
  >(CreateLogbookEntryDocument, options)
}
export type CreateLogbookEntryMutationHookResult = ReturnType<
  typeof useCreateLogbookEntryMutation
>
export type CreateLogbookEntryMutationResult =
  ApolloReactCommon.MutationResult<CreateLogbookEntryMutation>
export type CreateLogbookEntryMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    CreateLogbookEntryMutation,
    CreateLogbookEntryMutationVariables
  >
export const UpdateLogbookEntryDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateLogbookEntry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateLogbookEntryInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateLogbookEntry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
                { kind: 'Field', name: { kind: 'Name', value: 'duration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'instrument' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'pieces' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'composer' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'measures' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'tempo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'techniques' } },
                { kind: 'Field', name: { kind: 'Name', value: 'goalIds' } },
                { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
                { kind: 'Field', name: { kind: 'Name', value: 'mood' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tags' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'metadata' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'source' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'accuracy' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'notesPlayed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mistakeCount' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type UpdateLogbookEntryMutationFn = ApolloReactCommon.MutationFunction<
  UpdateLogbookEntryMutation,
  UpdateLogbookEntryMutationVariables
>

/**
 * __useUpdateLogbookEntryMutation__
 *
 * To run a mutation, you first call `useUpdateLogbookEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateLogbookEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateLogbookEntryMutation, { data, loading, error }] = useUpdateLogbookEntryMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateLogbookEntryMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    UpdateLogbookEntryMutation,
    UpdateLogbookEntryMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    UpdateLogbookEntryMutation,
    UpdateLogbookEntryMutationVariables
  >(UpdateLogbookEntryDocument, options)
}
export type UpdateLogbookEntryMutationHookResult = ReturnType<
  typeof useUpdateLogbookEntryMutation
>
export type UpdateLogbookEntryMutationResult =
  ApolloReactCommon.MutationResult<UpdateLogbookEntryMutation>
export type UpdateLogbookEntryMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    UpdateLogbookEntryMutation,
    UpdateLogbookEntryMutationVariables
  >
export const DeleteLogbookEntryDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteLogbookEntry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteLogbookEntry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type DeleteLogbookEntryMutationFn = ApolloReactCommon.MutationFunction<
  DeleteLogbookEntryMutation,
  DeleteLogbookEntryMutationVariables
>

/**
 * __useDeleteLogbookEntryMutation__
 *
 * To run a mutation, you first call `useDeleteLogbookEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteLogbookEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteLogbookEntryMutation, { data, loading, error }] = useDeleteLogbookEntryMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteLogbookEntryMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    DeleteLogbookEntryMutation,
    DeleteLogbookEntryMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    DeleteLogbookEntryMutation,
    DeleteLogbookEntryMutationVariables
  >(DeleteLogbookEntryDocument, options)
}
export type DeleteLogbookEntryMutationHookResult = ReturnType<
  typeof useDeleteLogbookEntryMutation
>
export type DeleteLogbookEntryMutationResult =
  ApolloReactCommon.MutationResult<DeleteLogbookEntryMutation>
export type DeleteLogbookEntryMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    DeleteLogbookEntryMutation,
    DeleteLogbookEntryMutationVariables
  >
export const CreateGoalDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateGoal' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateGoalInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createGoal' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'targetDate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'milestones' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'completed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'completedAt' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'linkedEntries' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type CreateGoalMutationFn = ApolloReactCommon.MutationFunction<
  CreateGoalMutation,
  CreateGoalMutationVariables
>

/**
 * __useCreateGoalMutation__
 *
 * To run a mutation, you first call `useCreateGoalMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGoalMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGoalMutation, { data, loading, error }] = useCreateGoalMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateGoalMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreateGoalMutation,
    CreateGoalMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    CreateGoalMutation,
    CreateGoalMutationVariables
  >(CreateGoalDocument, options)
}
export type CreateGoalMutationHookResult = ReturnType<
  typeof useCreateGoalMutation
>
export type CreateGoalMutationResult =
  ApolloReactCommon.MutationResult<CreateGoalMutation>
export type CreateGoalMutationOptions = ApolloReactCommon.BaseMutationOptions<
  CreateGoalMutation,
  CreateGoalMutationVariables
>
export const UpdateGoalDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateGoal' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateGoalInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateGoal' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'targetDate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'milestones' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'completed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'completedAt' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'linkedEntries' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type UpdateGoalMutationFn = ApolloReactCommon.MutationFunction<
  UpdateGoalMutation,
  UpdateGoalMutationVariables
>

/**
 * __useUpdateGoalMutation__
 *
 * To run a mutation, you first call `useUpdateGoalMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGoalMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGoalMutation, { data, loading, error }] = useUpdateGoalMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateGoalMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    UpdateGoalMutation,
    UpdateGoalMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    UpdateGoalMutation,
    UpdateGoalMutationVariables
  >(UpdateGoalDocument, options)
}
export type UpdateGoalMutationHookResult = ReturnType<
  typeof useUpdateGoalMutation
>
export type UpdateGoalMutationResult =
  ApolloReactCommon.MutationResult<UpdateGoalMutation>
export type UpdateGoalMutationOptions = ApolloReactCommon.BaseMutationOptions<
  UpdateGoalMutation,
  UpdateGoalMutationVariables
>
export const DeleteGoalDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteGoal' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteGoal' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type DeleteGoalMutationFn = ApolloReactCommon.MutationFunction<
  DeleteGoalMutation,
  DeleteGoalMutationVariables
>

/**
 * __useDeleteGoalMutation__
 *
 * To run a mutation, you first call `useDeleteGoalMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGoalMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGoalMutation, { data, loading, error }] = useDeleteGoalMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGoalMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    DeleteGoalMutation,
    DeleteGoalMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    DeleteGoalMutation,
    DeleteGoalMutationVariables
  >(DeleteGoalDocument, options)
}
export type DeleteGoalMutationHookResult = ReturnType<
  typeof useDeleteGoalMutation
>
export type DeleteGoalMutationResult =
  ApolloReactCommon.MutationResult<DeleteGoalMutation>
export type DeleteGoalMutationOptions = ApolloReactCommon.BaseMutationOptions<
  DeleteGoalMutation,
  DeleteGoalMutationVariables
>
export const SyncAnonymousDataDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SyncAnonymousData' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SyncAnonymousDataInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'syncAnonymousData' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'syncedSessions' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'syncedLogs' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'syncedEntries' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'syncedGoals' } },
                { kind: 'Field', name: { kind: 'Name', value: 'errors' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type SyncAnonymousDataMutationFn = ApolloReactCommon.MutationFunction<
  SyncAnonymousDataMutation,
  SyncAnonymousDataMutationVariables
>

/**
 * __useSyncAnonymousDataMutation__
 *
 * To run a mutation, you first call `useSyncAnonymousDataMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncAnonymousDataMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncAnonymousDataMutation, { data, loading, error }] = useSyncAnonymousDataMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSyncAnonymousDataMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    SyncAnonymousDataMutation,
    SyncAnonymousDataMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    SyncAnonymousDataMutation,
    SyncAnonymousDataMutationVariables
  >(SyncAnonymousDataDocument, options)
}
export type SyncAnonymousDataMutationHookResult = ReturnType<
  typeof useSyncAnonymousDataMutation
>
export type SyncAnonymousDataMutationResult =
  ApolloReactCommon.MutationResult<SyncAnonymousDataMutation>
export type SyncAnonymousDataMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    SyncAnonymousDataMutation,
    SyncAnonymousDataMutationVariables
  >
export const GetCurrentUserDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetCurrentUser' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'me' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'primaryInstrument' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hasCloudStorage' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'preferences' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'theme' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'notationSize' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'practiceReminders' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'dailyGoalMinutes' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'customSettings' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stats' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'totalPracticeTime' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'consecutiveDays' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'piecesCompleted' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'accuracyAverage' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode

/**
 * __useGetCurrentUserQuery__
 *
 * To run a query within a React component, call `useGetCurrentUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCurrentUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCurrentUserQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetCurrentUserQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<
    GetCurrentUserQuery,
    GetCurrentUserQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useQuery<
    GetCurrentUserQuery,
    GetCurrentUserQueryVariables
  >(GetCurrentUserDocument, options)
}
export function useGetCurrentUserLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetCurrentUserQuery,
    GetCurrentUserQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useLazyQuery<
    GetCurrentUserQuery,
    GetCurrentUserQueryVariables
  >(GetCurrentUserDocument, options)
}
export function useGetCurrentUserSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetCurrentUserQuery,
        GetCurrentUserQueryVariables
      >
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useSuspenseQuery<
    GetCurrentUserQuery,
    GetCurrentUserQueryVariables
  >(GetCurrentUserDocument, options)
}
export type GetCurrentUserQueryHookResult = ReturnType<
  typeof useGetCurrentUserQuery
>
export type GetCurrentUserLazyQueryHookResult = ReturnType<
  typeof useGetCurrentUserLazyQuery
>
export type GetCurrentUserSuspenseQueryHookResult = ReturnType<
  typeof useGetCurrentUserSuspenseQuery
>
export type GetCurrentUserQueryResult = ApolloReactCommon.QueryResult<
  GetCurrentUserQuery,
  GetCurrentUserQueryVariables
>
export const UpdateUserProfileDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateUserProfile' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateUserInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateUser' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'primaryInstrument' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type UpdateUserProfileMutationFn = ApolloReactCommon.MutationFunction<
  UpdateUserProfileMutation,
  UpdateUserProfileMutationVariables
>

/**
 * __useUpdateUserProfileMutation__
 *
 * To run a mutation, you first call `useUpdateUserProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserProfileMutation, { data, loading, error }] = useUpdateUserProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserProfileMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    UpdateUserProfileMutation,
    UpdateUserProfileMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    UpdateUserProfileMutation,
    UpdateUserProfileMutationVariables
  >(UpdateUserProfileDocument, options)
}
export type UpdateUserProfileMutationHookResult = ReturnType<
  typeof useUpdateUserProfileMutation
>
export type UpdateUserProfileMutationResult =
  ApolloReactCommon.MutationResult<UpdateUserProfileMutation>
export type UpdateUserProfileMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    UpdateUserProfileMutation,
    UpdateUserProfileMutationVariables
  >
export const UpdateUserPreferencesDocument = /*#__PURE__*/ {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateUserPreferences' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'preferences' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UserPreferencesInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateUser' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'preferences' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'preferences' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'preferences' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'theme' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'notationSize' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'practiceReminders' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'dailyGoalMinutes' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'customSettings' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode
export type UpdateUserPreferencesMutationFn =
  ApolloReactCommon.MutationFunction<
    UpdateUserPreferencesMutation,
    UpdateUserPreferencesMutationVariables
  >

/**
 * __useUpdateUserPreferencesMutation__
 *
 * To run a mutation, you first call `useUpdateUserPreferencesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserPreferencesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserPreferencesMutation, { data, loading, error }] = useUpdateUserPreferencesMutation({
 *   variables: {
 *      preferences: // value for 'preferences'
 *   },
 * });
 */
export function useUpdateUserPreferencesMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    UpdateUserPreferencesMutation,
    UpdateUserPreferencesMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions }
  return ApolloReactHooks.useMutation<
    UpdateUserPreferencesMutation,
    UpdateUserPreferencesMutationVariables
  >(UpdateUserPreferencesDocument, options)
}
export type UpdateUserPreferencesMutationHookResult = ReturnType<
  typeof useUpdateUserPreferencesMutation
>
export type UpdateUserPreferencesMutationResult =
  ApolloReactCommon.MutationResult<UpdateUserPreferencesMutation>
export type UpdateUserPreferencesMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    UpdateUserPreferencesMutation,
    UpdateUserPreferencesMutationVariables
  >
