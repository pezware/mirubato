-- Insert some initial curated collections
-- These will be populated with scores as they are imported

INSERT INTO collections (id, name, slug, description, instrument, difficulty, score_ids, display_order, is_featured) VALUES
-- Piano collections
('coll_piano_beginner', 'Piano for Beginners', 'piano-for-beginners', 
 'Essential pieces for starting your piano journey. Includes simple melodies and basic chord progressions.', 
 'PIANO', 'BEGINNER', '[]', 1, 1),

('coll_piano_classical', 'Classical Piano Essentials', 'classical-piano-essentials', 
 'Core classical repertoire every pianist should know, from Bach to Chopin.', 
 'PIANO', NULL, '[]', 2, 1),

('coll_piano_romantic', 'Romantic Period Gems', 'romantic-period-gems', 
 'Beautiful romantic pieces perfect for intermediate players.', 
 'PIANO', 'INTERMEDIATE', '[]', 3, 0),

-- Guitar collections  
('coll_guitar_beginner', 'Guitar First Steps', 'guitar-first-steps', 
 'Start your classical guitar journey with these carefully selected pieces.', 
 'GUITAR', 'BEGINNER', '[]', 4, 1),

('coll_guitar_studies', 'Essential Guitar Studies', 'essential-guitar-studies', 
 'Technical studies and etudes for developing guitar technique.', 
 'GUITAR', NULL, '[]', 5, 0),

-- Mixed collections
('coll_sight_reading', 'Sight Reading Practice', 'sight-reading-practice', 
 'Progressive exercises for improving sight reading skills.', 
 NULL, NULL, '[]', 6, 0),

('coll_monthly_picks', 'Monthly Staff Picks', 'monthly-staff-picks', 
 'Our curated selection of pieces for this month.', 
 NULL, NULL, '[]', 0, 1);

-- Create placeholder entries for some classical pieces
-- These would normally be imported from IMSLP or uploaded
INSERT INTO scores (
  id, title, composer, instrument, difficulty, difficulty_level, 
  style_period, source, tags, metadata
) VALUES 
-- Bach
('score_bach_invention_1', 'Invention No. 1 in C Major, BWV 772', 'Johann Sebastian Bach', 
 'PIANO', 'INTERMEDIATE', 5, 'BAROQUE', 'manual', 
 '["bach", "invention", "baroque", "counterpoint"]',
 '{"catalog": "BWV 772", "year": 1723}'),

('score_bach_minuet_g', 'Minuet in G Major, BWV Anh. 114', 'Johann Sebastian Bach', 
 'PIANO', 'BEGINNER', 2, 'BAROQUE', 'manual', 
 '["bach", "minuet", "baroque", "dance"]',
 '{"catalog": "BWV Anh. 114", "year": 1725}'),

-- Mozart
('score_mozart_sonata_16', 'Piano Sonata No. 16 in C Major, K. 545', 'Wolfgang Amadeus Mozart', 
 'PIANO', 'INTERMEDIATE', 6, 'CLASSICAL', 'manual', 
 '["mozart", "sonata", "classical", "sonata-form"]',
 '{"catalog": "K. 545", "year": 1788, "movements": 3}'),

-- Chopin
('score_chopin_prelude_4', 'Prelude Op. 28, No. 4 in E Minor', 'Frédéric Chopin', 
 'PIANO', 'INTERMEDIATE', 5, 'ROMANTIC', 'manual', 
 '["chopin", "prelude", "romantic"]',
 '{"catalog": "Op. 28, No. 4", "year": 1839}'),

-- Guitar pieces
('score_sor_study_1', 'Study No. 1, Op. 60', 'Fernando Sor', 
 'GUITAR', 'BEGINNER', 2, 'CLASSICAL', 'manual', 
 '["sor", "study", "classical", "guitar"]',
 '{"catalog": "Op. 60, No. 1", "year": 1820}'),

('score_tarrega_lagrima', 'Lágrima', 'Francisco Tárrega', 
 'GUITAR', 'INTERMEDIATE', 4, 'ROMANTIC', 'manual', 
 '["tarrega", "romantic", "guitar", "spanish"]',
 '{"year": 1891}');

-- Update collections with these scores
UPDATE collections SET score_ids = '["score_bach_minuet_g", "score_sor_study_1"]' 
WHERE id = 'coll_piano_beginner';

UPDATE collections SET score_ids = '["score_bach_invention_1", "score_mozart_sonata_16", "score_chopin_prelude_4"]' 
WHERE id = 'coll_piano_classical';

UPDATE collections SET score_ids = '["score_sor_study_1", "score_tarrega_lagrima"]' 
WHERE id = 'coll_guitar_beginner';