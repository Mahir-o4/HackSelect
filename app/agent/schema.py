DB_SCHEMA = """
You have read-only access to a PostgreSQL database for a hackathon management system.
You can query the following tables:

-- ---------------------------------------------------------------
-- hackathon
-- ---------------------------------------------------------------
-- Stores each hackathon event.
-- id          TEXT PRIMARY KEY  — unique hackathon identifier
-- name        TEXT              — hackathon display name
-- createdAt   TIMESTAMP

-- ---------------------------------------------------------------
-- team
-- ---------------------------------------------------------------
-- A team participating in a hackathon.
-- teamId      TEXT PRIMARY KEY
-- teamName    TEXT
-- hackathonId TEXT              — FK → hackathon.id
-- createdAt   TIMESTAMP

-- ---------------------------------------------------------------
-- participant
-- ---------------------------------------------------------------
-- An individual member belonging to a team.
-- participantId   SERIAL PRIMARY KEY
-- name            TEXT
-- githubUsername  TEXT UNIQUE
-- linkedInURL     TEXT
-- resumeURL       TEXT
-- phNumber        TEXT
-- email           TEXT UNIQUE
-- teamId          TEXT          — FK → team.teamId
-- createdAt       TIMESTAMP

-- ---------------------------------------------------------------
-- "githubProfile"
-- ---------------------------------------------------------------
-- GitHub metrics computed for a participant.
-- participantId   INT PRIMARY KEY  — FK → participant.participantId
-- totalRepos      INT
-- originalRepos   INT
-- totalStars      INT
-- totalForks      INT
-- uniqueLanguages INT
-- pushEvents      INT
-- prEvents        INT
-- issueEvents     INT
-- createEvents    INT
-- recentUpdates   INT
-- activityRaw     FLOAT
-- activityScore   FLOAT           — normalised 0–1
-- fetchedAt       TIMESTAMP

-- ---------------------------------------------------------------
-- "githubRepo"
-- ---------------------------------------------------------------
-- Individual GitHub repos for a participant.
-- repoId          BIGINT PRIMARY KEY
-- name            TEXT
-- isFork          BOOLEAN
-- stars           INT
-- forks           INT
-- language        TEXT
-- pushedAt        TIMESTAMP
-- participantId   INT              — FK → participant.participantId

-- ---------------------------------------------------------------
-- resume
-- ---------------------------------------------------------------
-- Parsed resume data for a participant.
-- participantId   INT PRIMARY KEY  — FK → participant.participantId
-- rawText         TEXT             — full extracted resume text
-- resumeScore     FLOAT            — normalised 0–1
-- parsedJSON      JSONB            — structured extraction
-- processedAt     TIMESTAMP

-- ---------------------------------------------------------------
-- "memberScore"
-- ---------------------------------------------------------------
-- Composite scores computed per participant.
-- participantId   INT PRIMARY KEY  — FK → participant.participantId
-- "gI"            FLOAT            — GitHub score (0–1)
-- "rI"            FLOAT            — Resume score (0–1)
-- "cI"            FLOAT            — Composite score (0–1)
-- computedAt      TIMESTAMP

-- ---------------------------------------------------------------
-- "teamFeature"
-- ---------------------------------------------------------------
-- ML feature vector computed per team (17 features).
-- teamId          TEXT PRIMARY KEY — FK → team.teamId
-- f1–f17          FLOAT            — feature values
-- computedAt      TIMESTAMP

-- ---------------------------------------------------------------
-- "teamSummary"
-- ---------------------------------------------------------------
-- LLM-generated summary stored as JSON string.
-- teamId          TEXT PRIMARY KEY — FK → team.teamId
-- summaryText     TEXT             — JSON string with full analysis
-- generatedAt     TIMESTAMP

-- ---------------------------------------------------------------
-- IMPORTANT RULES
-- ---------------------------------------------------------------
-- 1. Table names with capital letters MUST be quoted: "githubProfile", "githubRepo", "memberScore", "teamFeature", "teamSummary"
-- 2. Column names with capital letters MUST be quoted: "gI", "rI", "cI", "teamId", "teamName", "hackathonId", "participantId", "githubUsername", "totalRepos", "originalRepos", "totalStars", "totalForks", "uniqueLanguages", "activityRaw", "activityScore", "resumeScore", "parsedJSON", "isFork", "pushedAt", "repoId", "teamScore", "clusterLabel", "phNumber", "linkedInURL", "resumeURL", "createdAt", "fetchedAt", "processedAt", "computedAt", "generatedAt", "summaryText"
-- 3. NEVER use UPDATE, INSERT, DELETE, DROP, ALTER or any write operation
-- 4. ALWAYS use SELECT only
-- 5. summaryText is a JSON string — use ::jsonb cast to query inside it
-- 6. Use ILIKE for case-insensitive name searches
-- 7. LIMIT results to 50 rows maximum unless asked for more
"""