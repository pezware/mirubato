export const typeDefs = `
scalar DateTime
scalar JSON

# Core Types
type User {
  id: ID!
  email: String!
  displayName: String
  primaryInstrument: Instrument!
  preferences: UserPreferences!
  stats: UserStats!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type UserPreferences {
  theme: Theme!
  notationSize: NotationSize!
  practiceReminders: Boolean!
  dailyGoalMinutes: Int!
  customSettings: JSON
}

type UserStats {
  totalPracticeTime: Int!
  consecutiveDays: Int!
  piecesCompleted: Int!
  accuracyAverage: Float!
}

type SheetMusic {
  id: ID!
  title: String!
  composer: String!
  opus: String
  movement: String
  instrument: Instrument!
  difficulty: Difficulty!
  difficultyLevel: Int!
  gradeLevel: String
  durationSeconds: Int!
  timeSignature: String!
  keySignature: String!
  tempoMarking: String
  suggestedTempo: Int!
  stylePeriod: StylePeriod!
  tags: [String!]!
  measures: [Measure!]!
  metadata: SheetMusicMetadata
  thumbnail: String
}

type SheetMusicMetadata {
  source: String
  license: String
  arrangedBy: String
  year: Int
}

type Measure {
  number: Int!
  notes: [Note!]!
  timeSignature: String
  keySignature: String
  clef: String
  tempo: Tempo
}

type Note {
  keys: [String!]!
  duration: String!
  time: Float!
}

type Tempo {
  bpm: Int!
  marking: String
  originalMarking: String
  practiceTempos: PracticeTempos
}

type PracticeTempos {
  slow: Int!
  medium: Int!
  target: Int!
  performance: Int!
}

type PracticeSession {
  id: ID!
  user: User!
  instrument: Instrument!
  sheetMusic: SheetMusic
  sessionType: SessionType!
  startedAt: DateTime!
  completedAt: DateTime
  pausedDuration: Int!
  accuracy: Float
  notesAttempted: Int!
  notesCorrect: Int!
  logs: [PracticeLog!]!
}

type PracticeLog {
  id: ID!
  session: PracticeSession!
  activityType: ActivityType!
  durationSeconds: Int!
  tempoPracticed: Int
  targetTempo: Int
  focusAreas: [String!]!
  selfRating: Int
  notes: String
  createdAt: DateTime!
}

type AuthPayload {
  success: Boolean!
  message: String!
}

type TokenPayload {
  accessToken: String!
  refreshToken: String!
  expiresIn: Int!
  user: User!
}

# Enums
enum Instrument {
  PIANO
  GUITAR
}

enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum Theme {
  LIGHT
  DARK
  AUTO
}

enum NotationSize {
  SMALL
  MEDIUM
  LARGE
}

enum StylePeriod {
  BAROQUE
  CLASSICAL
  ROMANTIC
  MODERN
  CONTEMPORARY
}

enum SessionType {
  FREE_PRACTICE
  GUIDED_PRACTICE
  ASSESSMENT
}

enum ActivityType {
  SIGHT_READING
  SCALES
  REPERTOIRE
  ETUDES
  TECHNIQUE
  OTHER
}

# Input Types
input UserPreferencesInput {
  theme: Theme
  notationSize: NotationSize
  practiceReminders: Boolean
  dailyGoalMinutes: Int
  customSettings: JSON
}

input UpdateUserInput {
  displayName: String
  primaryInstrument: Instrument
  preferences: UserPreferencesInput
}

input SheetMusicFilterInput {
  instrument: Instrument
  difficulty: Difficulty
  minDifficultyLevel: Int
  maxDifficultyLevel: Int
  stylePeriod: StylePeriod
  maxDuration: Int
  tags: [String!]
  search: String
}

input StartPracticeSessionInput {
  sessionType: SessionType!
  instrument: Instrument!
  sheetMusicId: ID
}

input CompletePracticeSessionInput {
  sessionId: ID!
  accuracy: Float
  notesAttempted: Int
  notesCorrect: Int
}

input CreatePracticeLogInput {
  sessionId: ID!
  activityType: ActivityType!
  durationSeconds: Int!
  tempoPracticed: Int
  targetTempo: Int
  focusAreas: [String!]
  selfRating: Int
  notes: String
}

# Queries
type Query {
  # User queries
  me: User
  user(id: ID!): User

  # Sheet music queries
  sheetMusic(id: ID!): SheetMusic
  listSheetMusic(
    filter: SheetMusicFilterInput
    offset: Int
    limit: Int
  ): SheetMusicConnection!
  randomSheetMusic(
    instrument: Instrument!
    difficulty: Difficulty
    maxDuration: Int
  ): SheetMusic

  # Practice session queries
  practiceSession(id: ID!): PracticeSession
  myPracticeSessions(
    instrument: Instrument
    offset: Int
    limit: Int
  ): PracticeSessionConnection!
}

# Mutations
type Mutation {
  # Authentication mutations
  requestMagicLink(email: String!): AuthPayload!
  verifyMagicLink(token: String!): TokenPayload!
  refreshToken(refreshToken: String!): TokenPayload!
  logout: AuthPayload!

  # User mutations
  updateUser(input: UpdateUserInput!): User!
  deleteAccount: AuthPayload!

  # Practice session mutations
  startPracticeSession(input: StartPracticeSessionInput!): PracticeSession!
  pausePracticeSession(sessionId: ID!): PracticeSession!
  resumePracticeSession(sessionId: ID!): PracticeSession!
  completePracticeSession(input: CompletePracticeSessionInput!): PracticeSession!
  
  # Practice log mutations
  createPracticeLog(input: CreatePracticeLogInput!): PracticeLog!
}

# Connection types for pagination
type SheetMusicConnection {
  edges: [SheetMusicEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type SheetMusicEdge {
  node: SheetMusic!
  cursor: String!
}

type PracticeSessionConnection {
  edges: [PracticeSessionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PracticeSessionEdge {
  node: PracticeSession!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
`;
//# sourceMappingURL=index.js.map