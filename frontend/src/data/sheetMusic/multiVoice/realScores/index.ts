/**
 * Real Multi-Voice Scores from MusicXML Conversions
 *
 * This module exports all real sheet music scores that have been
 * converted from MusicXML files using the multi-voice converter.
 * These replace the fake/simplified scores used during development.
 */

// Import the scores first
import { bach_minuet_in_g_major_bwv_anh_114 } from './bach_minuet_in_g_major_bwv_anh_114'
import { mozart_piano_sonata_no_16_allegro } from './mozart_piano_sonata_no_16_allegro'
import { prlude_opus_28_no_4_in_e_minor_chopin } from './prlude_opus_28_no_4_in_e_minor_chopin'
import { fur_elise_easy_piano } from './fur_elise_easy_piano'
import { erik_satie_gymnopedie_no_1 } from './erik_satie_gymnopedie_no_1'
import { greensleeves_for_piano_easy_and_beautiful } from './greensleeves_for_piano_easy_and_beautiful'

// Re-export them
export {
  bach_minuet_in_g_major_bwv_anh_114,
  mozart_piano_sonata_no_16_allegro,
  prlude_opus_28_no_4_in_e_minor_chopin,
  fur_elise_easy_piano,
  erik_satie_gymnopedie_no_1,
  greensleeves_for_piano_easy_and_beautiful,
}

// Re-export with cleaner names
export {
  bach_minuet_in_g_major_bwv_anh_114 as bachMinuetMultiVoice,
  mozart_piano_sonata_no_16_allegro as mozartSonataK545MultiVoice,
  prlude_opus_28_no_4_in_e_minor_chopin as chopinPreludeOp28No4MultiVoice,
  fur_elise_easy_piano as furEliseEasyMultiVoice,
  erik_satie_gymnopedie_no_1 as satieGymnopedie1MultiVoice,
  greensleeves_for_piano_easy_and_beautiful as greensleevesPianoMultiVoice,
}

// Collection of all real multi-voice scores
export const realMultiVoiceScores = [
  bach_minuet_in_g_major_bwv_anh_114,
  mozart_piano_sonata_no_16_allegro,
  prlude_opus_28_no_4_in_e_minor_chopin,
  fur_elise_easy_piano,
  erik_satie_gymnopedie_no_1,
  greensleeves_for_piano_easy_and_beautiful,
]
