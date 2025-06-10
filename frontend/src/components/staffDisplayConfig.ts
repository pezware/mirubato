import { StaffDisplayOptions } from './StaffDisplayOptions'

/**
 * Default display options
 */
export const defaultDisplayOptions: StaffDisplayOptions = {
  showTrebleStaff: true,
  showBassStaff: true,
  showAltoStaff: true,
  showTenorStaff: true,
  showVoiceColors: true,
  voiceOpacity: {},
  showMeasureNumbers: true,
  showNoteNames: false,
  staffSpacing: 1.0,
  showTempo: true,
  showDynamics: true,
  showFingerings: true,
  showGrandStaffBrace: true,
}

/**
 * Common display presets
 */
export const displayPresets = {
  /** Focus on treble staff only */
  trebleOnly: {
    ...defaultDisplayOptions,
    showBassStaff: false,
    showAltoStaff: false,
    showTenorStaff: false,
  },

  /** Focus on bass staff only */
  bassOnly: {
    ...defaultDisplayOptions,
    showTrebleStaff: false,
    showAltoStaff: false,
    showTenorStaff: false,
  },

  /** Piano grand staff */
  pianoGrandStaff: {
    ...defaultDisplayOptions,
    showAltoStaff: false,
    showTenorStaff: false,
    showGrandStaffBrace: true,
  },

  /** SATB choir layout */
  satbChoir: {
    ...defaultDisplayOptions,
    showVoiceColors: true,
    staffSpacing: 1.2,
  },

  /** Practice mode with aids */
  practiceMode: {
    ...defaultDisplayOptions,
    showNoteNames: true,
    showFingerings: true,
    showMeasureNumbers: true,
  },

  /** Performance mode - clean display */
  performanceMode: {
    ...defaultDisplayOptions,
    showNoteNames: false,
    showFingerings: false,
    showMeasureNumbers: false,
  },

  /** Analysis mode - all details */
  analysisMode: {
    ...defaultDisplayOptions,
    showNoteNames: true,
    showMeasureNumbers: true,
    showTempo: true,
    showDynamics: true,
    showFingerings: true,
    showVoiceColors: true,
  },
}