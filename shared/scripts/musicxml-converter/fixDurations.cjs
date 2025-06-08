#!/usr/bin/env node

/**
 * Fix duration enums in converted TypeScript files
 * Converts NoteDuration.8 -> NoteDuration.EIGHTH, etc.
 */

const fs = require('fs');
const path = require('path');

const durationMap = {
  'NoteDuration.w': 'NoteDuration.WHOLE',
  'NoteDuration.h': 'NoteDuration.HALF',
  'NoteDuration.q': 'NoteDuration.QUARTER',
  'NoteDuration.8': 'NoteDuration.EIGHTH',
  'NoteDuration.16': 'NoteDuration.SIXTEENTH',
  'NoteDuration.32': 'NoteDuration.THIRTY_SECOND',
};

const timeSignatureMap = {
  'TimeSignature."4/4"': 'TimeSignature.FOUR_FOUR',
  'TimeSignature."3/4"': 'TimeSignature.THREE_FOUR',
  'TimeSignature."2/4"': 'TimeSignature.TWO_FOUR',
  'TimeSignature."6/8"': 'TimeSignature.SIX_EIGHT',
  'TimeSignature."12/8"': 'TimeSignature.TWELVE_EIGHT',
  'TimeSignature."C"': 'TimeSignature.COMMON_TIME',
  'TimeSignature."2/2"': 'TimeSignature.CUT_TIME',
};

const keySignatureMap = {
  'KeySignature."C major"': 'KeySignature.C_MAJOR',
  'KeySignature."G major"': 'KeySignature.G_MAJOR',
  'KeySignature."D major"': 'KeySignature.D_MAJOR',
  'KeySignature."A major"': 'KeySignature.A_MAJOR',
  'KeySignature."E major"': 'KeySignature.E_MAJOR',
  'KeySignature."B major"': 'KeySignature.B_MAJOR',
  'KeySignature."F# major"': 'KeySignature.F_SHARP_MAJOR',
  'KeySignature."C# major"': 'KeySignature.C_SHARP_MAJOR',
  'KeySignature."F major"': 'KeySignature.F_MAJOR',
  'KeySignature."Bb major"': 'KeySignature.B_FLAT_MAJOR',
  'KeySignature."Eb major"': 'KeySignature.E_FLAT_MAJOR',
  'KeySignature."Ab major"': 'KeySignature.A_FLAT_MAJOR',
  'KeySignature."Db major"': 'KeySignature.D_FLAT_MAJOR',
  'KeySignature."Gb major"': 'KeySignature.G_FLAT_MAJOR',
  'KeySignature."E minor"': 'KeySignature.E_MINOR',
  'KeySignature."B minor"': 'KeySignature.B_MINOR',
  'KeySignature."F# minor"': 'KeySignature.F_SHARP_MINOR',
  'KeySignature."C# minor"': 'KeySignature.C_SHARP_MINOR',
  'KeySignature."G# minor"': 'KeySignature.G_SHARP_MINOR',
  'KeySignature."D# minor"': 'KeySignature.D_SHARP_MINOR',
  'KeySignature."A minor"': 'KeySignature.A_MINOR',
  'KeySignature."D minor"': 'KeySignature.D_MINOR',
  'KeySignature."G minor"': 'KeySignature.G_MINOR',
  'KeySignature."C minor"': 'KeySignature.C_MINOR',
  'KeySignature."F minor"': 'KeySignature.F_MINOR',
  'KeySignature."Bb minor"': 'KeySignature.B_FLAT_MINOR',
};

const clefMap = {
  'Clef."treble"': 'Clef.TREBLE',
  'Clef."bass"': 'Clef.BASS',
  'Clef."alto"': 'Clef.ALTO',
  'Clef."tenor"': 'Clef.TENOR',
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace durations
  Object.entries(durationMap).forEach(([from, to]) => {
    content = content.replace(new RegExp(from.replace('.', '\\.'), 'g'), to);
  });
  
  // Replace time signatures
  Object.entries(timeSignatureMap).forEach(([from, to]) => {
    content = content.replace(new RegExp(from.replace(/[."/]/g, '\\$&'), 'g'), to);
  });
  
  // Replace key signatures
  Object.entries(keySignatureMap).forEach(([from, to]) => {
    content = content.replace(new RegExp(from.replace(/[."/]/g, '\\$&'), 'g'), to);
  });
  
  // Replace clefs
  Object.entries(clefMap).forEach(([from, to]) => {
    content = content.replace(new RegExp(from.replace(/[."/]/g, '\\$&'), 'g'), to);
  });
  
  // Remove unused import
  content = content.replace(/,\s*DynamicMarking\s*(?=\s*\})/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${path.basename(filePath)}`);
}

// Process all TypeScript files in the output directory
const outputDir = path.join(__dirname, 'output');
const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(outputDir, file);
  fixFile(filePath);
});

console.log(`\n✨ Fixed ${files.length} files`);