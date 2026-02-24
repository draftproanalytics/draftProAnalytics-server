-- seeds/analyze_kc_pattern.sql
-- Analyze KC Chiefs draft patterns and populate team_draft_patterns table

USE draftproanalytics;

-- Get KC team_id
SET @kc_team_id = (SELECT id FROM teams WHERE abbreviation = 'KC' LIMIT 1);

-- Clear existing pattern
DELETE FROM team_draft_patterns WHERE team_id = @kc_team_id;

-- Calculate overall statistics
SET @total_picks = (
    SELECT COUNT(*) 
    FROM historical_draft_picks 
    WHERE team_id = @kc_team_id
);

SET @successful_picks = (
    SELECT COUNT(*) 
    FROM historical_draft_picks 
    WHERE team_id = @kc_team_id
    AND (
        (round = 1 AND career_grade IN ('Elite', 'Starter'))
        OR (round <= 3 AND career_grade != 'Bust')
        OR (round > 3 AND career_grade IN ('Elite', 'Starter'))
    )
    AND career_grade != 'TBD'
);

SET @success_rate = (@successful_picks / @total_picks) * 100;

-- Insert team draft pattern
INSERT INTO team_draft_patterns 
(id, team_id, regime_start_year, regime_end_year, general_manager, head_coach, 
 total_picks, successful_picks, overall_success_rate, last_analyzed_at)
VALUES
(UUID(), @kc_team_id, 2017, NULL, 'Brett Veach', 'Andy Reid', 
 @total_picks, @successful_picks, @success_rate, CURRENT_TIMESTAMP);

-- Get pattern_id for position metrics
SET @pattern_id = (SELECT id FROM team_draft_patterns WHERE team_id = @kc_team_id);

-- Insert position group metrics
INSERT INTO position_group_metrics 
(id, pattern_id, position, total_picks, successful_picks, success_rate, 
 average_round, preferred_rounds, competency_level, system_fit_bias, recent_drafts)
SELECT 
    UUID() as id,
    @pattern_id as pattern_id,
    position_group as position,
    COUNT(*) as total_picks,
    SUM(CASE 
        WHEN career_grade != 'TBD' AND (
            (round = 1 AND career_grade IN ('Elite', 'Starter'))
            OR (round <= 3 AND career_grade != 'Bust')
            OR (round > 3 AND career_grade IN ('Elite', 'Starter'))
        ) THEN 1 
        ELSE 0 
    END) as successful_picks,
    ROUND(
        (SUM(CASE 
            WHEN career_grade != 'TBD' AND (
                (round = 1 AND career_grade IN ('Elite', 'Starter'))
                OR (round <= 3 AND career_grade != 'Bust')
                OR (round > 3 AND career_grade IN ('Elite', 'Starter'))
            ) THEN 1 
            ELSE 0 
        END) / COUNT(*)) * 100,
        2
    ) as success_rate,
    ROUND(AVG(round), 2) as average_round,
    JSON_ARRAY() as preferred_rounds, -- Will be updated separately
    CASE 
        WHEN (SUM(CASE 
            WHEN career_grade != 'TBD' AND (
                (round = 1 AND career_grade IN ('Elite', 'Starter'))
                OR (round <= 3 AND career_grade != 'Bust')
                OR (round > 3 AND career_grade IN ('Elite', 'Starter'))
            ) THEN 1 
            ELSE 0 
        END) / COUNT(*)) * 100 >= 60 THEN 'Elite'
        WHEN (SUM(CASE 
            WHEN career_grade != 'TBD' AND (
                (round = 1 AND career_grade IN ('Elite', 'Starter'))
                OR (round <= 3 AND career_grade != 'Bust')
                OR (round > 3 AND career_grade IN ('Elite', 'Starter'))
            ) THEN 1 
            ELSE 0 
        END) / COUNT(*)) * 100 >= 40 THEN 'Good'
        WHEN (SUM(CASE 
            WHEN career_grade != 'TBD' AND (
                (round = 1 AND career_grade IN ('Elite', 'Starter'))
                OR (round <= 3 AND career_grade != 'Bust')
                OR (round > 3 AND career_grade IN ('Elite', 'Starter'))
            ) THEN 1 
            ELSE 0 
        END) / COUNT(*)) * 100 >= 25 THEN 'Average'
        WHEN (SUM(CASE 
            WHEN career_grade != 'TBD' AND (
                (round = 1 AND career_grade IN ('Elite', 'Starter'))
                OR (round <= 3 AND career_grade != 'Bust')
                OR (round > 3 AND career_grade IN ('Elite', 'Starter'))
            ) THEN 1 
            ELSE 0 
        END) / COUNT(*)) * 100 >= 15 THEN 'Poor'
        ELSE 'Terrible'
    END as competency_level,
    CASE 
        WHEN COUNT(*) >= 8 AND 
             (SUM(CASE 
                WHEN career_grade != 'TBD' AND (
                    (round = 1 AND career_grade IN ('Elite', 'Starter'))
                    OR (round <= 3 AND career_grade != 'Bust')
                    OR (round > 3 AND career_grade IN ('Elite', 'Starter'))
                ) THEN 1 
                ELSE 0 
            END) / COUNT(*)) * 100 < 30 
        THEN TRUE 
        ELSE FALSE 
    END as system_fit_bias,
    SUM(CASE WHEN year >= 2022 THEN 1 ELSE 0 END) as recent_drafts
FROM historical_draft_picks
WHERE team_id = @kc_team_id
GROUP BY position_group;

-- Display results
SELECT 
    p.position,
    p.total_picks,
    p.successful_picks,
    p.success_rate,
    p.competency_level,
    p.system_fit_bias,
    p.average_round
FROM position_group_metrics p
WHERE p.pattern_id = @pattern_id
ORDER BY p.success_rate DESC;

COMMIT;