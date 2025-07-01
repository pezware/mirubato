-- Seed curated public domain scores from IMSLP
-- This adds our 10 carefully selected pieces with comprehensive metadata

-- Clear any existing curated scores (optional - comment out if you want to keep existing)
-- DELETE FROM scores WHERE source = 'imslp';

-- Insert piano pieces
INSERT OR REPLACE INTO scores (
    id, slug, title, subtitle, composer, opus, 
    instrument, difficulty, difficulty_level, 
    year, style_period, tags, description,
    source, imslp_url, file_name, metadata
) VALUES 
-- Bach - Prelude in C Major
(
    'bach-prelude-c-major',
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
    '["baroque", "prelude", "study", "harmony"]',
    'A masterclass in harmony and finger dexterity. Perfect for developing evenness of touch and finger independence.',
    'imslp',
    'https://imslp.org/wiki/The_Well-Tempered_Clavier_I,_BWV_846-869_(Bach,_Johann_Sebastian)',
    'piano/bach-prelude-c-major-bwv846.pdf',
    '{"pages": 2, "duration_minutes": 2}'
),

-- Beethoven - Für Elise
(
    'beethoven-fur-elise',
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
    '["romantic", "character-piece", "popular"]',
    'Excellent for teaching delicate melodic touch, pedal control, and contrasts between lyrical and agitated sections.',
    'imslp',
    'https://imslp.org/wiki/Für_Elise,_WoO_59_(Beethoven,_Ludwig_van)',
    'piano/beethoven-fur-elise.pdf',
    '{"pages": 4, "duration_minutes": 3}'
),

-- Chopin - Waltz in A minor
(
    'chopin-waltz-a-minor',
    'chopin-waltz-a-minor',
    'Waltz in A minor',
    '',
    'Frédéric Chopin',
    'B. 150, Op. posth.',
    'PIANO',
    'INTERMEDIATE',
    5,
    1847,
    'ROMANTIC',
    '["romantic", "waltz", "expressive", "rubato"]',
    'A perfect introduction to Chopin. Teaches waltz rhythm and the concept of rubato.',
    'imslp',
    'https://imslp.org/wiki/Waltz_in_A_minor,_B.150_(Chopin,_Frédéric)',
    'piano/chopin-waltz-a-minor.pdf',
    '{"pages": 2, "duration_minutes": 2}'
),

-- Mozart - Sonata No. 11 K.331 (1st movement)
(
    'mozart-sonata-11-k331',
    'mozart-sonata-11-k331-mov1',
    'Piano Sonata No. 11 in A Major',
    '1st Movement - Andante grazioso',
    'Wolfgang Amadeus Mozart',
    'K. 331',
    'PIANO',
    'INTERMEDIATE',
    5,
    1783,
    'CLASSICAL',
    '["classical", "sonata", "theme-variations"]',
    'A brilliant study in theme and variations. Develops precision, clarity, and articulation.',
    'imslp',
    'https://imslp.org/wiki/Piano_Sonata_No.11_in_A_major,_K.331/300i_(Mozart,_Wolfgang_Amadeus)',
    'piano/mozart-sonata-11-k331-mov1.pdf',
    '{"pages": 6, "duration_minutes": 6}'
),

-- Chopin - Nocturne Op. 9 No. 2
(
    'chopin-nocturne-op9-no2',
    'chopin-nocturne-op9-no2',
    'Nocturne in E-flat Major',
    '',
    'Frédéric Chopin',
    'Op. 9, No. 2',
    'PIANO',
    'ADVANCED',
    7,
    1832,
    'ROMANTIC',
    '["romantic", "nocturne", "lyrical", "expressive"]',
    'Teaches how to project a singing melody. Demands sophisticated pedaling and control of dynamics.',
    'imslp',
    'https://imslp.org/wiki/Nocturnes,_Op.9_(Chopin,_Frédéric)',
    'piano/chopin-nocturne-op9-no2.pdf',
    '{"pages": 4, "duration_minutes": 4}'
),

-- Guitar pieces
-- Tárrega - Lágrima
(
    'tarrega-lagrima',
    'tarrega-lagrima',
    'Lágrima',
    'Preludio',
    'Francisco Tárrega',
    '',
    'GUITAR',
    'BEGINNER',
    2,
    1899,
    'ROMANTIC',
    '["romantic", "prelude", "expressive", "short"]',
    'A foundational piece for developing tone and expressive playing on classical guitar.',
    'imslp',
    'https://imslp.org/wiki/Lágrima_(Tárrega,_Francisco)',
    'guitar/tarrega-lagrima.pdf',
    '{"pages": 1, "duration_minutes": 2}'
),

-- Anonymous - Romance
(
    'anonymous-romance',
    'anonymous-romance',
    'Romance',
    'Spanish Romance',
    'Anonymous',
    '',
    'GUITAR',
    'INTERMEDIATE',
    4,
    1900,
    'ROMANTIC',
    '["traditional", "romantic", "arpeggio", "popular"]',
    'The quintessential piece for developing right-hand arpeggio technique with thumb melody.',
    'imslp',
    'https://imslp.org/wiki/Romance_(Anonymous)',
    'guitar/anonymous-romance.pdf',
    '{"pages": 2, "duration_minutes": 3}'
),

-- Sor - Study in B minor
(
    'sor-study-b-minor',
    'sor-study-op35-no22',
    'Study in B minor',
    '',
    'Fernando Sor',
    'Op. 35, No. 22',
    'GUITAR',
    'INTERMEDIATE',
    5,
    1815,
    'CLASSICAL',
    '["classical", "study", "arpeggio", "melodic"]',
    'A masterclass in arpeggios, requiring the player to bring out a hidden melody within the pattern.',
    'imslp',
    'https://imslp.org/wiki/24_Studies,_Op.35_(Sor,_Fernando)',
    'guitar/sor-study-op35-no22.pdf',
    '{"pages": 2, "duration_minutes": 3}'
),

-- Villa-Lobos - Prelude No. 1
(
    'villa-lobos-prelude-1',
    'villa-lobos-prelude-1',
    'Prelude No. 1',
    'in E minor',
    'Heitor Villa-Lobos',
    '',
    'GUITAR',
    'INTERMEDIATE',
    6,
    1940,
    'MODERN',
    '["modern", "prelude", "brazilian", "expressive"]',
    'A cornerstone of modern repertoire. Develops powerful arpeggio and lyrical playing.',
    'imslp',
    'https://imslp.org/wiki/5_Preludes,_W419_(Villa-Lobos,_Heitor)',
    'guitar/villa-lobos-prelude-1.pdf',
    '{"pages": 3, "duration_minutes": 4}'
),

-- Tárrega - Recuerdos de la Alhambra
(
    'tarrega-recuerdos',
    'tarrega-recuerdos-alhambra',
    'Recuerdos de la Alhambra',
    '',
    'Francisco Tárrega',
    '',
    'GUITAR',
    'ADVANCED',
    8,
    1896,
    'ROMANTIC',
    '["romantic", "tremolo", "virtuosic", "spanish"]',
    'The definitive technical study for tremolo technique. Requires immense right-hand stamina.',
    'imslp',
    'https://imslp.org/wiki/Recuerdos_de_la_Alhambra_(Tárrega,_Francisco)',
    'guitar/tarrega-recuerdos-alhambra.pdf',
    '{"pages": 3, "duration_minutes": 5}'
);

-- Create analytics entries for all new scores
INSERT OR IGNORE INTO score_analytics (score_id, view_count, download_count, render_count)
SELECT id, 0, 0, 0 FROM scores
WHERE id NOT IN (SELECT score_id FROM score_analytics);

-- Update collections with these new scores
UPDATE collections 
SET score_ids = json_insert(
    COALESCE(score_ids, '[]'),
    '$[' || json_array_length(COALESCE(score_ids, '[]')) || ']',
    'bach-prelude-c-major'
)
WHERE slug = 'piano-for-beginners' 
AND score_ids NOT LIKE '%bach-prelude-c-major%';

UPDATE collections 
SET score_ids = json_array(
    'bach-prelude-c-major',
    'beethoven-fur-elise', 
    'chopin-waltz-a-minor',
    'mozart-sonata-11-k331',
    'chopin-nocturne-op9-no2'
)
WHERE slug = 'classical-piano-essentials';

UPDATE collections 
SET score_ids = json_array(
    'chopin-waltz-a-minor',
    'chopin-nocturne-op9-no2'
)
WHERE slug = 'romantic-period-gems';

UPDATE collections 
SET score_ids = json_array(
    'tarrega-lagrima',
    'anonymous-romance'
)
WHERE slug = 'guitar-first-steps';

UPDATE collections 
SET score_ids = json_array(
    'sor-study-b-minor',
    'villa-lobos-prelude-1'
)
WHERE slug = 'essential-guitar-studies';

-- Update monthly picks with a selection
UPDATE collections 
SET score_ids = json_array(
    'bach-prelude-c-major',
    'tarrega-lagrima',
    'beethoven-fur-elise',
    'anonymous-romance'
)
WHERE slug = 'monthly-staff-picks';

-- Update sight reading collection
UPDATE collections 
SET score_ids = json_array(
    'bach-prelude-c-major',
    'tarrega-lagrima',
    'sor-study-b-minor'
)
WHERE slug = 'sight-reading-practice';