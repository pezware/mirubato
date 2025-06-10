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

# Logbook Enums
enum LogbookEntryType {
  PRACTICE
  PERFORMANCE
  LESSON
  REHEARSAL
}

enum Mood {
  FRUSTRATED
  NEUTRAL
  SATISFIED
  EXCITED
}

enum GoalStatus {
  ACTIVE
  COMPLETED
  PAUSED
  CANCELLED
}

# Logbook Types
type LogbookEntry {
  id: ID!
  user: User!
  timestamp: DateTime!
  duration: Int!
  type: LogbookEntryType!
  instrument: Instrument!
  pieces: [PieceReference!]!
  techniques: [String!]!
  goalIds: [ID!]!
  notes: String
  mood: Mood
  tags: [String!]!
  sessionId: ID
  metadata: LogbookMetadata
  createdAt: DateTime!
  updatedAt: DateTime!
}

type LogbookMetadata {
  source: String!
  accuracy: Float
  notesPlayed: Int
  mistakeCount: Int
}

type PieceReference {
  id: ID!
  title: String!
  composer: String
  measures: String
  tempo: Int
}

type Goal {
  id: ID!
  user: User!
  title: String!
  description: String
  targetDate: DateTime
  progress: Float!
  milestones: [GoalMilestone!]!
  status: GoalStatus!
  linkedEntries: [ID!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  completedAt: DateTime
}

type GoalMilestone {
  id: ID!
  title: String!
  completed: Boolean!
  completedAt: DateTime
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

# Logbook Input Types
input CreateLogbookEntryInput {
  timestamp: DateTime!
  duration: Int!
  type: LogbookEntryType!
  instrument: Instrument!
  pieces: [PieceReferenceInput!]!
  techniques: [String!]
  goalIds: [ID!]
  notes: String
  mood: Mood
  tags: [String!]
  sessionId: ID
  metadata: LogbookMetadataInput
}

input UpdateLogbookEntryInput {
  timestamp: DateTime
  duration: Int
  type: LogbookEntryType
  instrument: Instrument
  pieces: [PieceReferenceInput!]
  techniques: [String!]
  goalIds: [ID!]
  notes: String
  mood: Mood
  tags: [String!]
}

input PieceReferenceInput {
  id: ID!
  title: String!
  composer: String
  measures: String
  tempo: Int
}

input LogbookMetadataInput {
  source: String!
  accuracy: Float
  notesPlayed: Int
  mistakeCount: Int
}

input LogbookFilterInput {
  userId: ID
  type: [LogbookEntryType!]
  instrument: Instrument
  startDate: DateTime
  endDate: DateTime
  mood: [Mood!]
  tags: [String!]
  search: String
}

input CreateGoalInput {
  title: String!
  description: String
  targetDate: DateTime
  milestones: [GoalMilestoneInput!]
}

input UpdateGoalInput {
  title: String
  description: String
  targetDate: DateTime
  progress: Float
  status: GoalStatus
}

input GoalMilestoneInput {
  id: ID
  title: String!
  completed: Boolean
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

  # Logbook queries
  logbookEntry(id: ID!): LogbookEntry
  myLogbookEntries(
    filter: LogbookFilterInput
    offset: Int
    limit: Int
  ): LogbookEntryConnection!
  
  # Goal queries
  goal(id: ID!): Goal
  myGoals(
    status: GoalStatus
    offset: Int
    limit: Int
  ): GoalConnection!
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
  
  # Logbook mutations
  createLogbookEntry(input: CreateLogbookEntryInput!): LogbookEntry!
  updateLogbookEntry(id: ID!, input: UpdateLogbookEntryInput!): LogbookEntry!
  deleteLogbookEntry(id: ID!): Boolean!
  
  # Goal mutations
  createGoal(input: CreateGoalInput!): Goal!
  updateGoal(id: ID!, input: UpdateGoalInput!): Goal!
  updateGoalMilestone(goalId: ID!, milestoneId: ID!, completed: Boolean!): Goal!
  deleteGoal(id: ID!): Boolean!
  linkEntryToGoal(entryId: ID!, goalId: ID!): Goal!
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

# Logbook Connection Types
type LogbookEntryConnection {
  edges: [LogbookEntryEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type LogbookEntryEdge {
  node: LogbookEntry!
  cursor: String!
}

type GoalConnection {
  edges: [GoalEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type GoalEdge {
  node: Goal!
  cursor: String!
}
`
