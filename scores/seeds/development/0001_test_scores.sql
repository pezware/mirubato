-- Development test data for local testing
-- These are minimal scores for testing various features

INSERT OR REPLACE INTO scores (
    id, slug, title, subtitle, composer, opus,
    instrument, difficulty, difficulty_level,
    year, style_period, tags, description,
    source, processing_status, pdf_url
) VALUES 
-- Test score 1: Simple piano piece (already has PDF)
(
    'test_piano_beginner',
    'test-piano-beginner',
    'Test Piano Piece',
    'For Testing Rendering',
    'Test Composer',
    'Op. 1',
    'PIANO',
    'BEGINNER',
    2,
    2024,
    'CONTEMPORARY',
    '["test", "piano", "beginner"]',
    'A test piece for development.',
    'manual',
    'completed',
    'https://scores-bucket.mirubato.com/test_piano_beginner.pdf'
),

-- Test score 2: Guitar piece (pending import)
(
    'test_guitar_intermediate',
    'test-guitar-intermediate',
    'Test Guitar Study',
    'Technical Exercise',
    'Test Composer',
    'Study No. 1',
    'GUITAR',
    'INTERMEDIATE',
    5,
    2024,
    'CONTEMPORARY',
    '["test", "guitar", "study"]',
    'A test study for guitar rendering.',
    'manual',
    'pending',
    NULL
),

-- Test score 3: Advanced piano (for testing difficulty filters)
(
    'test_piano_advanced',
    'test-piano-advanced',
    'Test Virtuoso Piece',
    'Extremely Difficult',
    'Test Composer',
    'Op. 99',
    'PIANO',
    'ADVANCED',
    9,
    2024,
    'CONTEMPORARY',
    '["test", "piano", "virtuoso"]',
    'For testing advanced difficulty rendering.',
    'manual',
    'pending',
    NULL
);

-- Add test scores to collections
UPDATE collections 
SET score_ids = json_array('test_piano_beginner')
WHERE slug = 'piano-for-beginners';

UPDATE collections 
SET score_ids = json_array('test_guitar_intermediate')
WHERE slug = 'guitar-first-steps';