import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql'
import { GraphQLContext } from '../context'
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
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  DateTime: { input: string; output: string }
  JSON: { input: Record<string, any>; output: Record<string, any> }
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

export type CompletePracticeSessionInput = {
  accuracy?: InputMaybe<Scalars['Float']['input']>
  notesAttempted?: InputMaybe<Scalars['Int']['input']>
  notesCorrect?: InputMaybe<Scalars['Int']['input']>
  sessionId: Scalars['ID']['input']
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

export type Difficulty = 'ADVANCED' | 'BEGINNER' | 'INTERMEDIATE'

export type Instrument = 'GUITAR' | 'PIANO'

export type Measure = {
  __typename?: 'Measure'
  clef?: Maybe<Scalars['String']['output']>
  keySignature?: Maybe<Scalars['String']['output']>
  notes: Array<Note>
  number: Scalars['Int']['output']
  tempo?: Maybe<Tempo>
  timeSignature?: Maybe<Scalars['String']['output']>
}

export type Mutation = {
  __typename?: 'Mutation'
  completePracticeSession: PracticeSession
  createPracticeLog: PracticeLog
  deleteAccount: AuthPayload
  logout: AuthPayload
  pausePracticeSession: PracticeSession
  refreshToken: TokenPayload
  requestMagicLink: AuthPayload
  resumePracticeSession: PracticeSession
  startPracticeSession: PracticeSession
  updateUser: User
  verifyMagicLink: TokenPayload
}

export type MutationCompletePracticeSessionArgs = {
  input: CompletePracticeSessionInput
}

export type MutationCreatePracticeLogArgs = {
  input: CreatePracticeLogInput
}

export type MutationPausePracticeSessionArgs = {
  sessionId: Scalars['ID']['input']
}

export type MutationRefreshTokenArgs = {
  refreshToken: Scalars['String']['input']
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
  listSheetMusic: SheetMusicConnection
  me?: Maybe<User>
  myPracticeSessions: PracticeSessionConnection
  practiceSession?: Maybe<PracticeSession>
  randomSheetMusic?: Maybe<SheetMusic>
  sheetMusic?: Maybe<SheetMusic>
  user?: Maybe<User>
}

export type QueryListSheetMusicArgs = {
  filter?: InputMaybe<SheetMusicFilterInput>
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

export type QueryUserArgs = {
  id: Scalars['ID']['input']
}

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
  id: Scalars['ID']['output']
  preferences: UserPreferences
  primaryInstrument: Instrument
  stats: UserStats
  updatedAt: Scalars['DateTime']['output']
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

export type WithIndex<TObject> = TObject & Record<string, any>
export type ResolversObject<TObject> = WithIndex<TObject>

export type ResolverTypeWrapper<T> = Promise<T> | T

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>
}
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {},
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>

export type NextResolverFn<T> = () => Promise<T>

export type DirectiveResolverFn<
  TResult = {},
  TParent = {},
  TContext = {},
  TArgs = {},
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  ActivityType: ActivityType
  AuthPayload: ResolverTypeWrapper<AuthPayload>
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>
  CompletePracticeSessionInput: CompletePracticeSessionInput
  CreatePracticeLogInput: CreatePracticeLogInput
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>
  Difficulty: Difficulty
  Float: ResolverTypeWrapper<Scalars['Float']['output']>
  ID: ResolverTypeWrapper<Scalars['ID']['output']>
  Instrument: Instrument
  Int: ResolverTypeWrapper<Scalars['Int']['output']>
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>
  Measure: ResolverTypeWrapper<Measure>
  Mutation: ResolverTypeWrapper<{}>
  NotationSize: NotationSize
  Note: ResolverTypeWrapper<Note>
  PageInfo: ResolverTypeWrapper<PageInfo>
  PracticeLog: ResolverTypeWrapper<PracticeLog>
  PracticeSession: ResolverTypeWrapper<PracticeSession>
  PracticeSessionConnection: ResolverTypeWrapper<PracticeSessionConnection>
  PracticeSessionEdge: ResolverTypeWrapper<PracticeSessionEdge>
  PracticeTempos: ResolverTypeWrapper<PracticeTempos>
  Query: ResolverTypeWrapper<{}>
  SessionType: SessionType
  SheetMusic: ResolverTypeWrapper<SheetMusic>
  SheetMusicConnection: ResolverTypeWrapper<SheetMusicConnection>
  SheetMusicEdge: ResolverTypeWrapper<SheetMusicEdge>
  SheetMusicFilterInput: SheetMusicFilterInput
  SheetMusicMetadata: ResolverTypeWrapper<SheetMusicMetadata>
  StartPracticeSessionInput: StartPracticeSessionInput
  String: ResolverTypeWrapper<Scalars['String']['output']>
  StylePeriod: StylePeriod
  Tempo: ResolverTypeWrapper<Tempo>
  Theme: Theme
  TokenPayload: ResolverTypeWrapper<TokenPayload>
  UpdateUserInput: UpdateUserInput
  User: ResolverTypeWrapper<User>
  UserPreferences: ResolverTypeWrapper<UserPreferences>
  UserPreferencesInput: UserPreferencesInput
  UserStats: ResolverTypeWrapper<UserStats>
}>

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AuthPayload: AuthPayload
  Boolean: Scalars['Boolean']['output']
  CompletePracticeSessionInput: CompletePracticeSessionInput
  CreatePracticeLogInput: CreatePracticeLogInput
  DateTime: Scalars['DateTime']['output']
  Float: Scalars['Float']['output']
  ID: Scalars['ID']['output']
  Int: Scalars['Int']['output']
  JSON: Scalars['JSON']['output']
  Measure: Measure
  Mutation: {}
  Note: Note
  PageInfo: PageInfo
  PracticeLog: PracticeLog
  PracticeSession: PracticeSession
  PracticeSessionConnection: PracticeSessionConnection
  PracticeSessionEdge: PracticeSessionEdge
  PracticeTempos: PracticeTempos
  Query: {}
  SheetMusic: SheetMusic
  SheetMusicConnection: SheetMusicConnection
  SheetMusicEdge: SheetMusicEdge
  SheetMusicFilterInput: SheetMusicFilterInput
  SheetMusicMetadata: SheetMusicMetadata
  StartPracticeSessionInput: StartPracticeSessionInput
  String: Scalars['String']['output']
  Tempo: Tempo
  TokenPayload: TokenPayload
  UpdateUserInput: UpdateUserInput
  User: User
  UserPreferences: UserPreferences
  UserPreferencesInput: UserPreferencesInput
  UserStats: UserStats
}>

export type AuthPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export interface DateTimeScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime'
}

export interface JsonScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON'
}

export type MeasureResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Measure'] = ResolversParentTypes['Measure'],
> = ResolversObject<{
  clef?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  keySignature?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  notes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>
  number?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  tempo?: Resolver<Maybe<ResolversTypes['Tempo']>, ParentType, ContextType>
  timeSignature?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type MutationResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation'],
> = ResolversObject<{
  completePracticeSession?: Resolver<
    ResolversTypes['PracticeSession'],
    ParentType,
    ContextType,
    RequireFields<MutationCompletePracticeSessionArgs, 'input'>
  >
  createPracticeLog?: Resolver<
    ResolversTypes['PracticeLog'],
    ParentType,
    ContextType,
    RequireFields<MutationCreatePracticeLogArgs, 'input'>
  >
  deleteAccount?: Resolver<
    ResolversTypes['AuthPayload'],
    ParentType,
    ContextType
  >
  logout?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType>
  pausePracticeSession?: Resolver<
    ResolversTypes['PracticeSession'],
    ParentType,
    ContextType,
    RequireFields<MutationPausePracticeSessionArgs, 'sessionId'>
  >
  refreshToken?: Resolver<
    ResolversTypes['TokenPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationRefreshTokenArgs, 'refreshToken'>
  >
  requestMagicLink?: Resolver<
    ResolversTypes['AuthPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationRequestMagicLinkArgs, 'email'>
  >
  resumePracticeSession?: Resolver<
    ResolversTypes['PracticeSession'],
    ParentType,
    ContextType,
    RequireFields<MutationResumePracticeSessionArgs, 'sessionId'>
  >
  startPracticeSession?: Resolver<
    ResolversTypes['PracticeSession'],
    ParentType,
    ContextType,
    RequireFields<MutationStartPracticeSessionArgs, 'input'>
  >
  updateUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateUserArgs, 'input'>
  >
  verifyMagicLink?: Resolver<
    ResolversTypes['TokenPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationVerifyMagicLinkArgs, 'token'>
  >
}>

export type NoteResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Note'] = ResolversParentTypes['Note'],
> = ResolversObject<{
  duration?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  keys?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>
  time?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type PageInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo'],
> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  startCursor?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type PracticeLogResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['PracticeLog'] = ResolversParentTypes['PracticeLog'],
> = ResolversObject<{
  activityType?: Resolver<
    ResolversTypes['ActivityType'],
    ParentType,
    ContextType
  >
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  durationSeconds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  focusAreas?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  selfRating?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  session?: Resolver<ResolversTypes['PracticeSession'], ParentType, ContextType>
  targetTempo?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  tempoPracticed?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type PracticeSessionResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['PracticeSession'] = ResolversParentTypes['PracticeSession'],
> = ResolversObject<{
  accuracy?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>
  completedAt?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  instrument?: Resolver<ResolversTypes['Instrument'], ParentType, ContextType>
  logs?: Resolver<Array<ResolversTypes['PracticeLog']>, ParentType, ContextType>
  notesAttempted?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  notesCorrect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  pausedDuration?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  sessionType?: Resolver<ResolversTypes['SessionType'], ParentType, ContextType>
  sheetMusic?: Resolver<
    Maybe<ResolversTypes['SheetMusic']>,
    ParentType,
    ContextType
  >
  startedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type PracticeSessionConnectionResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['PracticeSessionConnection'] = ResolversParentTypes['PracticeSessionConnection'],
> = ResolversObject<{
  edges?: Resolver<
    Array<ResolversTypes['PracticeSessionEdge']>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type PracticeSessionEdgeResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['PracticeSessionEdge'] = ResolversParentTypes['PracticeSessionEdge'],
> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<ResolversTypes['PracticeSession'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type PracticeTemposResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['PracticeTempos'] = ResolversParentTypes['PracticeTempos'],
> = ResolversObject<{
  medium?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  performance?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  slow?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  target?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type QueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = ResolversObject<{
  listSheetMusic?: Resolver<
    ResolversTypes['SheetMusicConnection'],
    ParentType,
    ContextType,
    Partial<QueryListSheetMusicArgs>
  >
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>
  myPracticeSessions?: Resolver<
    ResolversTypes['PracticeSessionConnection'],
    ParentType,
    ContextType,
    Partial<QueryMyPracticeSessionsArgs>
  >
  practiceSession?: Resolver<
    Maybe<ResolversTypes['PracticeSession']>,
    ParentType,
    ContextType,
    RequireFields<QueryPracticeSessionArgs, 'id'>
  >
  randomSheetMusic?: Resolver<
    Maybe<ResolversTypes['SheetMusic']>,
    ParentType,
    ContextType,
    RequireFields<QueryRandomSheetMusicArgs, 'instrument'>
  >
  sheetMusic?: Resolver<
    Maybe<ResolversTypes['SheetMusic']>,
    ParentType,
    ContextType,
    RequireFields<QuerySheetMusicArgs, 'id'>
  >
  user?: Resolver<
    Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserArgs, 'id'>
  >
}>

export type SheetMusicResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SheetMusic'] = ResolversParentTypes['SheetMusic'],
> = ResolversObject<{
  composer?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  difficulty?: Resolver<ResolversTypes['Difficulty'], ParentType, ContextType>
  difficultyLevel?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  durationSeconds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  gradeLevel?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  instrument?: Resolver<ResolversTypes['Instrument'], ParentType, ContextType>
  keySignature?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  measures?: Resolver<Array<ResolversTypes['Measure']>, ParentType, ContextType>
  metadata?: Resolver<
    Maybe<ResolversTypes['SheetMusicMetadata']>,
    ParentType,
    ContextType
  >
  movement?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  opus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  stylePeriod?: Resolver<ResolversTypes['StylePeriod'], ParentType, ContextType>
  suggestedTempo?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>
  tempoMarking?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  thumbnail?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  timeSignature?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type SheetMusicConnectionResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SheetMusicConnection'] = ResolversParentTypes['SheetMusicConnection'],
> = ResolversObject<{
  edges?: Resolver<
    Array<ResolversTypes['SheetMusicEdge']>,
    ParentType,
    ContextType
  >
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type SheetMusicEdgeResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SheetMusicEdge'] = ResolversParentTypes['SheetMusicEdge'],
> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  node?: Resolver<ResolversTypes['SheetMusic'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type SheetMusicMetadataResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SheetMusicMetadata'] = ResolversParentTypes['SheetMusicMetadata'],
> = ResolversObject<{
  arrangedBy?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  license?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  source?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  year?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type TempoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Tempo'] = ResolversParentTypes['Tempo'],
> = ResolversObject<{
  bpm?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  marking?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  originalMarking?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  practiceTempos?: Resolver<
    Maybe<ResolversTypes['PracticeTempos']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type TokenPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['TokenPayload'] = ResolversParentTypes['TokenPayload'],
> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  expiresIn?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type UserResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  displayName?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  preferences?: Resolver<
    ResolversTypes['UserPreferences'],
    ParentType,
    ContextType
  >
  primaryInstrument?: Resolver<
    ResolversTypes['Instrument'],
    ParentType,
    ContextType
  >
  stats?: Resolver<ResolversTypes['UserStats'], ParentType, ContextType>
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type UserPreferencesResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UserPreferences'] = ResolversParentTypes['UserPreferences'],
> = ResolversObject<{
  customSettings?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType
  >
  dailyGoalMinutes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  notationSize?: Resolver<
    ResolversTypes['NotationSize'],
    ParentType,
    ContextType
  >
  practiceReminders?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  theme?: Resolver<ResolversTypes['Theme'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type UserStatsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UserStats'] = ResolversParentTypes['UserStats'],
> = ResolversObject<{
  accuracyAverage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  consecutiveDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  piecesCompleted?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  totalPracticeTime?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  AuthPayload?: AuthPayloadResolvers<ContextType>
  DateTime?: GraphQLScalarType
  JSON?: GraphQLScalarType
  Measure?: MeasureResolvers<ContextType>
  Mutation?: MutationResolvers<ContextType>
  Note?: NoteResolvers<ContextType>
  PageInfo?: PageInfoResolvers<ContextType>
  PracticeLog?: PracticeLogResolvers<ContextType>
  PracticeSession?: PracticeSessionResolvers<ContextType>
  PracticeSessionConnection?: PracticeSessionConnectionResolvers<ContextType>
  PracticeSessionEdge?: PracticeSessionEdgeResolvers<ContextType>
  PracticeTempos?: PracticeTemposResolvers<ContextType>
  Query?: QueryResolvers<ContextType>
  SheetMusic?: SheetMusicResolvers<ContextType>
  SheetMusicConnection?: SheetMusicConnectionResolvers<ContextType>
  SheetMusicEdge?: SheetMusicEdgeResolvers<ContextType>
  SheetMusicMetadata?: SheetMusicMetadataResolvers<ContextType>
  Tempo?: TempoResolvers<ContextType>
  TokenPayload?: TokenPayloadResolvers<ContextType>
  User?: UserResolvers<ContextType>
  UserPreferences?: UserPreferencesResolvers<ContextType>
  UserStats?: UserStatsResolvers<ContextType>
}>
