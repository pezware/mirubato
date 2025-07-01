-- Production initial catalog
-- These scores will be imported via the API after metadata is seeded
-- Source URLs are from IMSLP (public domain)

INSERT OR REPLACE INTO scores (
    id, slug, title, subtitle, composer, opus,
    instrument, difficulty, difficulty_level,
    year, style_period, tags, description,
    source, source_url, processing_status
) VALUES 
-- Piano Pieces
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
    'beethoven_fur_elise_woo59',
    'beethoven-fur-elise',
    'Für Elise',
    'Bagatelle No. 25 in A minor',
    'Ludwig van Beethoven',
    'WoO 59',
    'PIANO',
    'INTERMEDIATE',
    4,
    1810,
    'CLASSICAL',
    '["classical", "character-piece", "popular", "beethoven"]',
    'Excellent for teaching delicate melodic touch, pedal control, and contrasts between lyrical and agitated sections.',
    'imslp',
    'https://imslp.org/wiki/Special:ImagefromIndex/300406/wx4c',
    'pending'
),

(
    'chopin_waltz_a_minor_b150',
    'chopin-waltz-a-minor',
    'Waltz in A minor',
    'Op. posth.',
    'Frédéric Chopin',
    'B. 150',
    'PIANO',
    'INTERMEDIATE',
    5,
    1847,
    'ROMANTIC',
    '["romantic", "waltz", "expressive", "rubato", "chopin"]',
    'A perfect introduction to Chopin. Teaches waltz rhythm and the concept of rubato.',
    'imslp',
    'https://imslp.org/wiki/Special:ImagefromIndex/399256/xupd',
    'pending'
),

-- Guitar Pieces
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

(
    'sor_study_op35_no22',
    'sor-study-b-minor',
    'Study in B minor',
    'Op. 35, No. 22',
    'Fernando Sor',
    'Op. 35, No. 22',
    'GUITAR',
    'INTERMEDIATE',
    5,
    1815,
    'CLASSICAL',
    '["classical", "study", "arpeggio", "melodic", "sor", "guitar"]',
    'A masterclass in arpeggios, requiring the player to bring out a hidden melody within the pattern.',
    'imslp',
    'https://imslp.org/wiki/Special:ImagefromIndex/419968/gcml',
    'pending'
),

(
    'villa_lobos_prelude_1',
    'villa-lobos-prelude-1',
    'Prelude No. 1',
    'in E minor',
    'Heitor Villa-Lobos',
    NULL,
    'GUITAR',
    'ADVANCED',
    7,
    1940,
    'MODERN',
    '["modern", "prelude", "brazilian", "expressive", "villa-lobos", "guitar"]',
    'A cornerstone of modern guitar repertoire. Develops powerful arpeggio technique and expressive range.',
    'imslp',
    'https://imslp.org/wiki/Special:ImagefromIndex/419833/gcml',
    'pending'
);

-- Update collections with initial scores
UPDATE collections 
SET score_ids = json_array('bach_prelude_c_major_bwv846', 'beethoven_fur_elise_woo59')
WHERE slug = 'piano-for-beginners';

UPDATE collections 
SET score_ids = json_array('tarrega_lagrima_preludio', 'sor_study_op35_no22')
WHERE slug = 'guitar-first-steps';

UPDATE collections 
SET score_ids = json_array('bach_prelude_c_major_bwv846', 'beethoven_fur_elise_woo59', 'chopin_waltz_a_minor_b150')
WHERE slug = 'classical-piano-essentials';