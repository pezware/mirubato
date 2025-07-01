-- Staging demo data
-- A subset of production data plus some test scores for QA

-- Copy essential production scores for testing
INSERT OR REPLACE INTO scores (
    id, slug, title, subtitle, composer, opus,
    instrument, difficulty, difficulty_level,
    year, style_period, tags, description,
    source, source_url, processing_status
) VALUES 
-- Include a few production pieces
(
    'bach_prelude_c_major_bwv846',
    'bach-prelude-c-major-bwv846',
    'Prelude in C Major',
    'from The Well-Tempered Clavier, Book I',
    'Johann Sebastian Bach',
    'BWV 846',
    'PIANO',
    'BEGINNER',
    3,
    1722,
    'BAROQUE',
    '["baroque", "prelude", "study", "harmony", "bach"]',
    'A masterclass in harmony and finger dexterity. Perfect for developing evenness of touch and finger independence.',
    'imslp',
    'https://imslp.org/wiki/Special:ImagefromIndex/02085/wxcv',
    'pending'
),

(
    'tarrega_lagrima_preludio',
    'tarrega-lagrima',
    'Lágrima',
    'Preludio',
    'Francisco Tárrega',
    NULL,
    'GUITAR',
    'BEGINNER',
    3,
    1899,
    'ROMANTIC',
    '["romantic", "prelude", "expressive", "spanish", "tarrega", "guitar"]',
    'A foundational piece for developing tone and expressive playing on classical guitar.',
    'imslp',
    'https://imslp.org/wiki/Special:ImagefromIndex/170099/dzzd',
    'pending'
),

-- Add staging-specific test scores
(
    'staging_test_import',
    'staging-test-import',
    'Test Import Score',
    'For Testing Import Feature',
    'QA Test Composer',
    'Test Op. 1',
    'PIANO',
    'INTERMEDIATE',
    5,
    2024,
    'CONTEMPORARY',
    '["staging", "test", "import"]',
    'Used for testing the import functionality in staging.',
    'manual',
    'pending',
    NULL
),

(
    'staging_test_rendering',
    'staging-test-rendering',
    'Test Rendering Score',
    'For Testing PDF Rendering',
    'QA Test Composer',
    'Test Op. 2',
    'GUITAR',
    'ADVANCED',
    8,
    2024,
    'CONTEMPORARY',
    '["staging", "test", "rendering"]',
    'Used for testing PDF rendering and display features.',
    'manual',
    'pending',
    NULL
);

-- Update collections for staging
UPDATE collections 
SET score_ids = json_array('bach_prelude_c_major_bwv846', 'staging_test_import')
WHERE slug = 'piano-for-beginners';

UPDATE collections 
SET score_ids = json_array('tarrega_lagrima_preludio', 'staging_test_rendering')
WHERE slug = 'guitar-first-steps';