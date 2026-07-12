-- ============================================================================
-- DRAFT ANALYSIS MODULE - DATABASE SCHEMA (Updated for Team table)
-- MySQL Native Scripts with camelCase table names
-- Team table uses INT auto_increment primary key
-- ============================================================================

-- ============================================================================
-- TABLE: historicalDraftPicks
-- Stores historical draft pick data for pattern analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS historicalDraftPicks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    year INT NOT NULL,
    round INT NOT NULL,
    pick INT NOT NULL,
    overallPick INT NOT NULL,
    teamId INT NOT NULL COMMENT 'References Team.id',
    playerName VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    positionGroup VARCHAR(10) NOT NULL,
    college VARCHAR(255) DEFAULT NULL,
    careerGrade ENUM('Elite', 'Starter', 'Backup', 'Bust', 'TBD') NOT NULL DEFAULT 'TBD',
    yearsWithTeam INT NOT NULL DEFAULT 0,
    proBowls INT NOT NULL DEFAULT 0,
    allPros INT NOT NULL DEFAULT 0,
    gamesPlayed INT NOT NULL DEFAULT 0,
    gamesStarted INT NOT NULL DEFAULT 0,
    notes TEXT DEFAULT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_historicalDraftPicks_teamId 
        FOREIGN KEY (teamId) REFERENCES Team(id) ON DELETE CASCADE,
    
    -- Unique Constraint
    UNIQUE KEY uk_historicalDraftPicks_yearRoundPick (year, round, pick),
    
    -- Indexes for performance
    INDEX idx_historicalDraftPicks_teamYear (teamId, year),
    INDEX idx_historicalDraftPicks_positionGroup (positionGroup),
    INDEX idx_historicalDraftPicks_year (year),
    INDEX idx_historicalDraftPicks_careerGrade (careerGrade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: teamDraftPatterns
-- Stores analyzed draft patterns for each team/regime
-- ============================================================================

CREATE TABLE IF NOT EXISTS teamDraftPatterns (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teamId INT NOT NULL UNIQUE COMMENT 'References Team.id',
    regimeStartYear INT NOT NULL,
    regimeEndYear INT DEFAULT NULL,
    generalManager VARCHAR(255) NOT NULL,
    headCoach VARCHAR(255) NOT NULL,
    totalPicks INT NOT NULL DEFAULT 0,
    successfulPicks INT NOT NULL DEFAULT 0,
    overallSuccessRate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    lastAnalyzedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_teamDraftPatterns_teamId 
        FOREIGN KEY (teamId) REFERENCES Team(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_teamDraftPatterns_teamId (teamId),
    INDEX idx_teamDraftPatterns_generalManager (generalManager),
    INDEX idx_teamDraftPatterns_headCoach (headCoach),
    INDEX idx_teamDraftPatterns_regimeYears (regimeStartYear, regimeEndYear)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: positionGroupMetrics
-- Position-specific draft performance metrics for each team pattern
-- ============================================================================

CREATE TABLE IF NOT EXISTS positionGroupMetrics (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patternId VARCHAR(36) NOT NULL,
    position VARCHAR(10) NOT NULL,
    totalPicks INT NOT NULL DEFAULT 0,
    successfulPicks INT NOT NULL DEFAULT 0,
    successRate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    averageRound DECIMAL(3,1) NOT NULL DEFAULT 0.0,
    preferredRounds JSON NOT NULL COMMENT 'JSON array of preferred draft rounds',
    competencyLevel ENUM('Elite', 'Good', 'Average', 'Poor', 'Terrible') NOT NULL,
    systemFitBias BOOLEAN NOT NULL DEFAULT FALSE,
    recentDrafts INT NOT NULL DEFAULT 0 COMMENT 'Picks in last 3 years',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_positionGroupMetrics_patternId 
        FOREIGN KEY (patternId) REFERENCES teamDraftPatterns(id) ON DELETE CASCADE,
    
    -- Unique Constraint
    UNIQUE KEY uk_positionGroupMetrics_patternPosition (patternId, position),
    
    -- Indexes
    INDEX idx_positionGroupMetrics_patternId (patternId),
    INDEX idx_positionGroupMetrics_position (position),
    INDEX idx_positionGroupMetrics_competency (competencyLevel),
    INDEX idx_positionGroupMetrics_systemBias (systemFitBias)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: liveDraftPicks
-- Real-time tracking of draft picks during live draft events
-- ============================================================================

CREATE TABLE IF NOT EXISTS liveDraftPicks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    year INT NOT NULL,
    round INT NOT NULL,
    pick INT NOT NULL,
    overallPick INT NOT NULL,
    teamId INT NOT NULL COMMENT 'References Team.id - current owner',
    originalTeamId INT NOT NULL COMMENT 'References Team.id - original owner before trades',
    status ENUM('upcoming', 'current', 'completed', 'traded') NOT NULL DEFAULT 'upcoming',
    playerName VARCHAR(255) DEFAULT NULL,
    position VARCHAR(10) DEFAULT NULL,
    college VARCHAR(255) DEFAULT NULL,
    consensusRank INT DEFAULT NULL COMMENT 'Player consensus ranking from draft boards',
    gradeValue VARCHAR(2) DEFAULT NULL COMMENT 'Letter grade: A+, A, B, C, D, F',
    gradeScore DECIMAL(5,2) DEFAULT NULL COMMENT 'Numeric grade score 0-100',
    expectedSuccess DECIMAL(5,2) DEFAULT NULL COMMENT 'Expected success percentage',
    pickedAt DATETIME DEFAULT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_liveDraftPicks_teamId 
        FOREIGN KEY (teamId) REFERENCES Team(id) ON DELETE CASCADE,
    CONSTRAINT fk_liveDraftPicks_originalTeamId 
        FOREIGN KEY (originalTeamId) REFERENCES Team(id) ON DELETE RESTRICT,
    
    -- Unique Constraint
    UNIQUE KEY uk_liveDraftPicks_yearRoundPick (year, round, pick),
    
    -- Indexes
    INDEX idx_liveDraftPicks_yearTeam (year, teamId),
    INDEX idx_liveDraftPicks_yearStatus (year, status),
    INDEX idx_liveDraftPicks_status (status),
    INDEX idx_liveDraftPicks_pickedAt (pickedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: rosterPlayers
-- Current roster composition for team needs analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS rosterPlayers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teamId INT NOT NULL COMMENT 'References Team.id',
    playerId VARCHAR(36) DEFAULT NULL COMMENT 'Reference to external players table if exists',
    playerName VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    positionGroup VARCHAR(10) NOT NULL,
    depthChartOrder INT NOT NULL DEFAULT 99 COMMENT 'Order on depth chart, lower = higher',
    age INT NOT NULL,
    yearsExperience INT NOT NULL,
    performanceGrade DECIMAL(5,2) NOT NULL DEFAULT 50.00 COMMENT '0-100 performance scale',
    isStarter BOOLEAN NOT NULL DEFAULT FALSE,
    contractYearsRemaining INT NOT NULL DEFAULT 0,
    injuryStatus VARCHAR(50) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_rosterPlayers_teamId 
        FOREIGN KEY (teamId) REFERENCES Team(id) ON DELETE CASCADE,
    
    -- Unique Constraint (if playerId exists)
    UNIQUE KEY uk_rosterPlayers_teamPlayer (teamId, playerId),
    
    -- Indexes
    INDEX idx_rosterPlayers_teamPosition (teamId, positionGroup),
    INDEX idx_rosterPlayers_teamStarter (teamId, isStarter),
    INDEX idx_rosterPlayers_depthChart (teamId, positionGroup, depthChartOrder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: draftPredictions
-- Stored predictions for upcoming draft picks
-- ============================================================================

CREATE TABLE IF NOT EXISTS draftPredictions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teamId INT NOT NULL COMMENT 'References Team.id',
    year INT NOT NULL,
    round INT NOT NULL,
    pick INT NOT NULL,
    predictedPosition VARCHAR(10) NOT NULL,
    probability DECIMAL(5,2) NOT NULL COMMENT 'Probability percentage 0-100',
    reasoning TEXT NOT NULL,
    teamNeedScore DECIMAL(5,2) NOT NULL,
    historicalTendencyScore DECIMAL(5,2) NOT NULL,
    confidenceLevel ENUM('High', 'Medium', 'Low') NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_draftPredictions_teamId 
        FOREIGN KEY (teamId) REFERENCES Team(id) ON DELETE CASCADE,
    
    -- Unique Constraint (one prediction per pick per position)
    UNIQUE KEY uk_draftPredictions_teamYearRoundPickPosition (teamId, year, round, pick, predictedPosition),
    
    -- Indexes
    INDEX idx_draftPredictions_teamYear (teamId, year),
    INDEX idx_draftPredictions_yearRoundPick (year, round, pick)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;