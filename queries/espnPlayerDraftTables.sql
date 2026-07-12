
model espn_players {
  id                 Int                          @id @default(autoincrement())
  espn_id            String                       @unique(map: "espn_id") @db.VarChar(50)
  first_name         String                       @db.VarChar(100)
  last_name          String                       @db.VarChar(100)
  display_name       String                       @db.VarChar(200)
  short_name         String                       @db.VarChar(100)
  position           espn_players_position
  jersey_number      Int?                         @db.UnsignedTinyInt
  team_espn_id       String?                      @db.VarChar(50)
  height             Int?                         @db.UnsignedSmallInt
  weight             Int?                         @db.UnsignedSmallInt
  age                Int?                         @db.UnsignedTinyInt
  date_of_birth      DateTime?                    @db.Date
  college            String?                      @db.VarChar(200)
  experience         Int?                         @db.UnsignedTinyInt
  is_active          Boolean                      @default(true)
  is_rookie          Boolean                      @default(false)
  injury_status      espn_players_injury_status   @default(HEALTHY)
  injury_description String?                      @db.Text
  contract_status    espn_players_contract_status @default(UNKNOWN)
  salary             BigInt?
  created_at         DateTime?                    @default(now()) @db.Timestamp(0)
  updated_at         DateTime?                    @default(now()) @db.Timestamp(0)
  last_sync_at       DateTime?                    @db.Timestamp(0)
  player_draft_info  player_draft_info?
  player_headshots   player_headshots[]
  player_metadata    player_metadata[]
  player_statistics  player_statistics[]

  @@index([is_active], map: "idx_espn_players_active")
  @@index([espn_id], map: "idx_espn_players_espn_id")
  @@index([last_name, first_name], map: "idx_espn_players_name")
  @@index([position], map: "idx_espn_players_position")
  @@index([last_sync_at], map: "idx_espn_players_sync")
  @@index([team_espn_id], map: "idx_espn_players_team")
}

/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments
model espn_teams {
  id              Int       @id @default(autoincrement())
  espn_id         String    @unique(map: "espn_id") @db.VarChar(50)
  name            String    @db.VarChar(100)
  display_name    String    @db.VarChar(200)
  abbreviation    String    @db.VarChar(10)
  nickname        String?   @db.VarChar(100)
  city            String    @db.VarChar(100)
  state           String?   @db.VarChar(50)
  conference      String?   @db.VarChar(50)
  division        String?   @db.VarChar(50)
  color           String?   @db.VarChar(20)
  alternate_color String?   @db.VarChar(20)
  logo_url        String?   @db.Text
  is_active       Boolean   @default(true)
  created_at      DateTime? @default(now()) @db.Timestamp(0)
  updated_at      DateTime? @default(now()) @db.Timestamp(0)
  last_sync_at    DateTime? @db.Timestamp(0)

  @@index([abbreviation], map: "idx_espn_teams_abbreviation")
  @@index([conference, division], map: "idx_espn_teams_conference_division")
  @@index([espn_id], map: "idx_espn_teams_espn_id")
  @@index([last_sync_at], map: "idx_espn_teams_sync")
}

model player_draft_info {
  id             Int          @id @default(autoincrement())
  espn_player_id Int          @unique(map: "unique_player_draft")
  year           Int          @db.Year
  round          Int          @db.UnsignedTinyInt
  pick           Int          @db.UnsignedTinyInt
  team           String       @db.VarChar(100)
  overall        Int?         @db.UnsignedSmallInt
  created_at     DateTime?    @default(now()) @db.Timestamp(0)
  updated_at     DateTime?    @default(now()) @db.Timestamp(0)
  espn_players   espn_players @relation(fields: [espn_player_id], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "player_draft_info_ibfk_1")

  @@index([espn_player_id], map: "idx_draft_info_player")
  @@index([year], map: "idx_draft_info_year")
}

model Player {
  id                Int            @id @default(autoincrement())
  espnAthleteId     String?        @unique(map: "espnAthleteId") @db.VarChar(50)
  firstName         String         @db.VarChar(45)
  lastName          String         @db.VarChar(45)
  age               Int
  height            Float?         @db.Float
  weight            Float?         @db.Float
  handSize          Float?         @db.Float
  armLength         Float?         @db.Float
  homeCity          String?        @db.VarChar(45)
  homeState         String?        @db.VarChar(45)
  university        String?        @db.VarChar(75)
  status            String?        @db.VarChar(45)
  position          String?        @db.VarChar(75)
  pickId            Int?
  combineScoreId    Int?
  prospectId        Int?
  yearEnteredLeague Int?           @db.Year
  CombineScore      CombineScore[]
  DraftPick         DraftPick[]
  Prospect          Prospect?      @relation(fields: [prospectId], references: [id], map: "fk_Player_Prospect")
  PlayerAward       PlayerAward[]
  PlayerTeam        PlayerTeam[]

  @@index([prospectId], map: "fk_Player_Prospect")
  @@index([espnAthleteId], map: "idx_Player_espnAthleteId")
}
model Prospect {
  id                                        Int                         @id @default(autoincrement())
  firstName                                 String                      @db.VarChar(45)
  lastName                                  String                      @db.VarChar(45)
  position                                  String                      @db.VarChar(10)
  college                                   String                      @db.VarChar(75)
  height                                    Float                       @db.Float
  weight                                    Float                       @db.Float
  handSize                                  Float?                      @db.Float
  armLength                                 Float?                      @db.Float
  homeCity                                  String?                     @db.VarChar(45)
  homeState                                 String?                     @db.VarChar(45)
  fortyTime                                 Float?                      @db.Float
  tenYardSplit                              Float?                      @db.Float
  verticalLeap                              Float?                      @db.Float
  broadJump                                 Float?                      @db.Float
  threeCone                                 Float?                      @db.Float
  twentyYardShuttle                         Float?                      @db.Float
  benchPress                                Int?
  drafted                                   Boolean                     @default(false)
  draftYear                                 Int?                        @db.Year
  teamId                                    Int?
  draftPickId                               Int?
  createdAt                                 DateTime?                   @default(now()) @db.Timestamp(0)
  updatedAt                                 DateTime?                   @default(now()) @db.Timestamp(0)
  B4MeProspectRvaEvaluation                 B4MeProspectRvaEvaluation[]
  B4MeWRMetrics                             B4MeWRMetrics?
  DraftPick_DraftPick_prospectIdToProspect  DraftPick[]                 @relation("DraftPick_prospectIdToProspect")
  DraftSimulationPick                       DraftSimulationPick[]
  Player                                    Player[]
  DraftPick_Prospect_draftPickIdToDraftPick DraftPick?                  @relation("Prospect_draftPickIdToDraftPick", fields: [draftPickId], references: [id], map: "fk_Prospect_DraftPick")
  Team                                      Team?                       @relation(fields: [teamId], references: [id], map: "fk_Prospect_Team")
  ProspectRanking                           ProspectRanking[]

  @@index([draftPickId], map: "fk_Prospect_DraftPick")
  @@index([teamId], map: "fk_Prospect_Team_idx")
  @@index([college], map: "idx_prospect_college")
  @@index([drafted], map: "idx_prospect_drafted")
  @@index([lastName, firstName], map: "idx_prospect_name")
  @@index([position], map: "idx_prospect_position")
}

model Team {
  id                                                           Int                    @id @default(autoincrement())
  name                                                         String                 @unique(map: "uq_team_name") @db.VarChar(45)
  city                                                         String?                @db.VarChar(45)
  state                                                        String?                @db.VarChar(45)
  conference                                                   String?                @db.VarChar(35)
  division                                                     String?                @db.VarChar(20)
  stadium                                                      String?                @db.VarChar(45)
  scheduleId                                                   Int?
  abbreviation                                                 String?                @unique(map: "abbreviation") @db.VarChar(255)
  espnTeamId                                                   Int?                   @unique(map: "espnTeamId")
  DraftOrderEntry                                              DraftOrderEntry[]
  DraftPick                                                    DraftPick[]
  DraftSimulationPick_DraftSimulationPick_currentTeamIdToTeam  DraftSimulationPick[]  @relation("DraftSimulationPick_currentTeamIdToTeam")
  DraftSimulationPick_DraftSimulationPick_originalTeamIdToTeam DraftSimulationPick[]  @relation("DraftSimulationPick_originalTeamIdToTeam")
  DraftSimulationTeam                                          DraftSimulationTeam[]
  DraftTeamScorecard                                           DraftTeamScorecard[]
  Game_Game_homeTeamIdToTeam                                   Game[]                 @relation("Game_homeTeamIdToTeam")
  Game_Game_awayTeamIdToTeam                                   Game[]                 @relation("Game_awayTeamIdToTeam")
  PlayerTeam                                                   PlayerTeam[]
  PostSeasonResult                                             PostSeasonResult[]
  Prospect                                                     Prospect[]
  Schedule_Schedule_teamIdToTeam                               Schedule[]             @relation("Schedule_teamIdToTeam")
  Schedule_Schedule_oppTeamIdToTeam                            Schedule[]             @relation("Schedule_oppTeamIdToTeam")
  TeamNeed                                                     TeamNeed[]
  draftPredictions                                             draftPredictions[]
  historicalDraftPicks                                         historicalDraftPicks[]
  liveDraftPicks_liveDraftPicks_originalTeamIdToTeam           liveDraftPicks[]       @relation("liveDraftPicks_originalTeamIdToTeam")
  liveDraftPicks_liveDraftPicks_teamIdToTeam                   liveDraftPicks[]       @relation("liveDraftPicks_teamIdToTeam")
  rosterPlayers                                                rosterPlayers[]
  teamDraftPatterns                                            teamDraftPatterns?
}

model Game {
  id                Int                     @id @default(autoincrement())
  seasonYear        String                  @db.VarChar(4)
  gameWeek          Int?                    @db.TinyInt
  gameDate          DateTime?               @db.DateTime(0)
  homeTeamId        Int
  awayTeamId        Int
  gameLocation      String?                 @db.VarChar(255)
  gameCity          String?                 @db.VarChar(100)
  gameStateProvince String?                 @db.VarChar(100)
  gameCountry       String                  @default("USA") @db.VarChar(50)
  homeScore         Int?                    @default(0)
  awayScore         Int?                    @default(0)
  gameStatus        Game_gameStatus         @default(scheduled)
  isPlayoff         Boolean                 @default(false)
  playoffRound      Game_playoffRound?
  playoffConference Game_playoffConference?
  homeSeed          Int?
  awaySeed          Int?
  createdAt         DateTime?               @default(now()) @db.Timestamp(0)
  updatedAt         DateTime?               @default(now()) @db.Timestamp(0)
  espnEventId       String?                 @unique @db.VarChar(255)
  espnCompetitionId String?                 @unique @db.VarChar(255)
  seasonType        Int?                    @default(2) @db.TinyInt
  homeTeam          Team                    @relation("Game_homeTeamIdToTeam", fields: [homeTeamId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "Game_ibfk_1")
  awayTeam          Team                    @relation("Game_awayTeamIdToTeam", fields: [awayTeamId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "Game_ibfk_2")

  @@unique([seasonYear, gameDate, homeTeamId, awayTeamId], map: "unique_game")
  @@index([awayTeamId], map: "awayTeamId")
  @@index([homeTeamId], map: "homeTeamId")
  @@index([espnCompetitionId], map: "idx_game_competitionId")
  @@index([gameStatus], map: "idx_game_status")
  @@index([seasonYear, gameWeek], map: "idx_game_year_week")
  @@index([seasonYear, seasonType, gameStatus, gameWeek], map: "idx_game_year_type_status_week")
}
model Job {
  id                 Int                  @id @default(autoincrement())
  type               String               @db.VarChar(100)
  payload            Json?
  status             Job_status           @default(pending)
  createdAt          DateTime             @default(now())
  startedAt          DateTime?
  finishedAt         DateTime?
  cancelAt           DateTime?
  cancelReason       String?              @db.VarChar(255)
  resultCode         String?              @db.VarChar(50)
  resultJson         Json?
  DraftOrderSnapshot DraftOrderSnapshot[]
  logs               JobLog[]

  @@index([status])
}

model JobLog {
  id        Int      @id @default(autoincrement())
  jobId     Int
  level     String   @db.VarChar(10)
  message   String   @db.Text
  createdAt DateTime @default(now())
  Job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([jobId])
}

/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments
model Jobs {
  id             Int       @id @default(autoincrement())
  type           String    @db.VarChar(50)
  status         String    @default("PENDING") @db.VarChar(20)
  progress       Int?      @default(0)
  totalItems     Int?      @default(0)
  processedItems Int?      @default(0)
  parameters     Json?
  result         Json?
  error          String?   @db.Text
  createdBy      String?   @db.VarChar(100)
  createdAt      DateTime  @default(now()) @db.DateTime(0)
  startedAt      DateTime? @db.DateTime(0)
  completedAt    DateTime? @db.DateTime(0)
  updatedAt      DateTime  @default(now()) @db.DateTime(0)

  @@index([createdAt], map: "idx_created_at")
  @@index([status], map: "idx_status")
  @@index([type], map: "idx_type")
  @@index([type, status], map: "idx_type_status")
}

model espn_draft_picks {
  id                    Int       @id @default(autoincrement())
  espn_id               String    @unique(map: "espn_id") @db.VarChar(255)
  year                  Int
  round                 Int
  overall_pick          Int
  team_espn_id          String    @db.VarChar(255)
  player_espn_id        String?   @db.VarChar(255)
  player_name           String    @db.VarChar(255)
  position              String    @db.VarChar(10)
  college               String?   @db.VarChar(255)
  is_compensatory       Boolean?  @default(false)
  is_forfeited          Boolean?  @default(false)
  original_team_espn_id String?   @db.VarChar(255)
  notes                 String?   @db.Text
  is_active             Boolean?  @default(true)
  last_sync_at          DateTime? @db.DateTime(0)
  created_at            DateTime? @default(now()) @db.DateTime(0)
  updated_at            DateTime? @default(now()) @db.DateTime(0)

  @@index([player_espn_id], map: "idx_player")
  @@index([team_espn_id], map: "idx_team")
  @@index([year, round, overall_pick], map: "idx_year_round_pick")
}


enum data_processing_jobs_job_type {
  PLAYER_SYNC
  TEAM_SYNC
  FULL_SYNC
  VALIDATION
  ENRICHMENT
}

enum Job_status {
  pending
  in_progress
  completed
  failed
  canceled
}

enum data_processing_jobs_status {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum data_quality_reports_entity_type {
  PLAYER
  TEAM
}

enum espn_players_position {
  QB
  RB
  FB
  WR
  TE
  OL
  C
  G
  T
  DL
  DE
  DT
  NT
  LB
  MLB
  OLB
  DB
  CB
  S
  FS
  SS
  K
  P
  LS
}

enum Game_gameStatus {
  scheduled
  in_progress
  postponed
  canceled
  final
}

enum workflow_executions_status {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum workflow_step_results_status {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  SKIPPED
}

