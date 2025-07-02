-- Update the general collection with all public platform scores
UPDATE user_collections 
SET score_ids = '["score_bach_invention_1","score_bach_minuet_g","score_mozart_sonata_16","score_chopin_prelude_4","score_sor_study_1","score_tarrega_lagrima","test_aire_sureno","test_romance_anonimo","score_mckziolw_1xqjcv28qkl","score_mclbt5mn_ou5dnmo5q8o","score_mclbwvlo_kimgfx4mroj","score_mclc0f39_7f6qdbnsu53","score_mclcfsmr_76multure58","score_mclcuawn_ofgelxaqsmp","score_mclfc0zh_wew8ta7659","score_mclfdwm3_lhxi2zfis9g"]'
WHERE id = 'general-collection';

-- Also add them to collection_members table
INSERT OR IGNORE INTO collection_members (id, collection_id, score_id) VALUES
('cm_1', 'general-collection', 'score_bach_invention_1'),
('cm_2', 'general-collection', 'score_bach_minuet_g'),
('cm_3', 'general-collection', 'score_mozart_sonata_16'),
('cm_4', 'general-collection', 'score_chopin_prelude_4'),
('cm_5', 'general-collection', 'score_sor_study_1'),
('cm_6', 'general-collection', 'score_tarrega_lagrima'),
('cm_7', 'general-collection', 'test_aire_sureno'),
('cm_8', 'general-collection', 'test_romance_anonimo'),
('cm_9', 'general-collection', 'score_mckziolw_1xqjcv28qkl'),
('cm_10', 'general-collection', 'score_mclbt5mn_ou5dnmo5q8o'),
('cm_11', 'general-collection', 'score_mclbwvlo_kimgfx4mroj'),
('cm_12', 'general-collection', 'score_mclc0f39_7f6qdbnsu53'),
('cm_13', 'general-collection', 'score_mclcfsmr_76multure58'),
('cm_14', 'general-collection', 'score_mclcuawn_ofgelxaqsmp'),
('cm_15', 'general-collection', 'score_mclfc0zh_wew8ta7659'),
('cm_16', 'general-collection', 'score_mclfdwm3_lhxi2zfis9g');