/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core'
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
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  DateTime: { input: any; output: any }
  JSON: { input: any; output: any }
}

export enum ActivityType {
  Etudes = 'ETUDES',
  Other = 'OTHER',
  Repertoire = 'REPERTOIRE',
  Scales = 'SCALES',
  SightReading = 'SIGHT_READING',
  Technique = 'TECHNIQUE',
}

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

export enum Difficulty {
  Advanced = 'ADVANCED',
  Beginner = 'BEGINNER',
  Intermediate = 'INTERMEDIATE',
}

export enum Instrument {
  Guitar = 'GUITAR',
  Piano = 'PIANO',
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

export enum NotationSize {
  Large = 'LARGE',
  Medium = 'MEDIUM',
  Small = 'SMALL',
}

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

export enum SessionType {
  Assessment = 'ASSESSMENT',
  FreePractice = 'FREE_PRACTICE',
  GuidedPractice = 'GUIDED_PRACTICE',
}

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

export enum StylePeriod {
  Baroque = 'BAROQUE',
  Classical = 'CLASSICAL',
  Contemporary = 'CONTEMPORARY',
  Modern = 'MODERN',
  Romantic = 'ROMANTIC',
}

export type Tempo = {
  __typename?: 'Tempo'
  bpm: Scalars['Int']['output']
  marking?: Maybe<Scalars['String']['output']>
  originalMarking?: Maybe<Scalars['String']['output']>
  practiceTempos?: Maybe<PracticeTempos>
}

export enum Theme {
  Auto = 'AUTO',
  Dark = 'DARK',
  Light = 'LIGHT',
}

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
    __typename?: 'TokenPayload'
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: {
      __typename?: 'User'
      id: string
      email: string
      displayName?: string | null
      primaryInstrument: Instrument
    }
  }
}

export type RefreshTokenMutationVariables = Exact<{
  refreshToken: Scalars['String']['input']
}>

export type RefreshTokenMutation = {
  __typename?: 'Mutation'
  refreshToken: {
    __typename?: 'TokenPayload'
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: {
      __typename?: 'User'
      id: string
      email: string
      displayName?: string | null
      primaryInstrument: Instrument
    }
  }
}

export type LogoutMutationVariables = Exact<{ [key: string]: never }>

export type LogoutMutation = {
  __typename?: 'Mutation'
  logout: { __typename?: 'AuthPayload'; success: boolean; message: string }
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
    createdAt: any
    updatedAt: any
    preferences: {
      __typename?: 'UserPreferences'
      theme: Theme
      notationSize: NotationSize
      practiceReminders: boolean
      dailyGoalMinutes: number
      customSettings?: any | null
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
    updatedAt: any
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
      customSettings?: any | null
    }
  }
}

export type StartPracticeSessionMutationVariables = Exact<{
  input: StartPracticeSessionInput
}>

export type StartPracticeSessionMutation = {
  __typename?: 'Mutation'
  startPracticeSession: {
    __typename?: 'PracticeSession'
    id: string
    instrument: Instrument
    sessionType: SessionType
    startedAt: any
    user: { __typename?: 'User'; id: string }
  }
}

export type CompletePracticeSessionMutationVariables = Exact<{
  input: CompletePracticeSessionInput
}>

export type CompletePracticeSessionMutation = {
  __typename?: 'Mutation'
  completePracticeSession: {
    __typename?: 'PracticeSession'
    id: string
    completedAt?: any | null
    accuracy?: number | null
    notesAttempted: number
    notesCorrect: number
  }
}

export type CreatePracticeLogMutationVariables = Exact<{
  input: CreatePracticeLogInput
}>

export type CreatePracticeLogMutation = {
  __typename?: 'Mutation'
  createPracticeLog: {
    __typename?: 'PracticeLog'
    id: string
    activityType: ActivityType
    durationSeconds: number
    createdAt: any
    session: { __typename?: 'PracticeSession'; id: string }
  }
}

export type UpdateUserMutationVariables = Exact<{
  input: UpdateUserInput
}>

export type UpdateUserMutation = {
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
      customSettings?: any | null
    }
  }
}

export const RequestMagicLinkDocument = {
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
} as unknown as DocumentNode<
  RequestMagicLinkMutation,
  RequestMagicLinkMutationVariables
>
export const VerifyMagicLinkDocument = {
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
                { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'refreshToken' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresIn' } },
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
} as unknown as DocumentNode<
  VerifyMagicLinkMutation,
  VerifyMagicLinkMutationVariables
>
export const RefreshTokenDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RefreshToken' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'refreshToken' },
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
            name: { kind: 'Name', value: 'refreshToken' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'refreshToken' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'refreshToken' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'refreshToken' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresIn' } },
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
} as unknown as DocumentNode<
  RefreshTokenMutation,
  RefreshTokenMutationVariables
>
export const LogoutDocument = {
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
} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>
export const GetCurrentUserDocument = {
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
} as unknown as DocumentNode<GetCurrentUserQuery, GetCurrentUserQueryVariables>
export const UpdateUserProfileDocument = {
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
} as unknown as DocumentNode<
  UpdateUserProfileMutation,
  UpdateUserProfileMutationVariables
>
export const UpdateUserPreferencesDocument = {
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
} as unknown as DocumentNode<
  UpdateUserPreferencesMutation,
  UpdateUserPreferencesMutationVariables
>
export const StartPracticeSessionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'StartPracticeSession' },
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
              name: { kind: 'Name', value: 'StartPracticeSessionInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'startPracticeSession' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'instrument' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sessionType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  StartPracticeSessionMutation,
  StartPracticeSessionMutationVariables
>
export const CompletePracticeSessionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CompletePracticeSession' },
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
              name: { kind: 'Name', value: 'CompletePracticeSessionInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'completePracticeSession' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'accuracy' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'notesAttempted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'notesCorrect' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CompletePracticeSessionMutation,
  CompletePracticeSessionMutationVariables
>
export const CreatePracticeLogDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreatePracticeLog' },
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
              name: { kind: 'Name', value: 'CreatePracticeLogInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createPracticeLog' },
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
                  name: { kind: 'Name', value: 'session' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'activityType' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'durationSeconds' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreatePracticeLogMutation,
  CreatePracticeLogMutationVariables
>
export const UpdateUserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateUser' },
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
} as unknown as DocumentNode<UpdateUserMutation, UpdateUserMutationVariables>
