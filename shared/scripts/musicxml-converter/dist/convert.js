#!/usr/bin/env node
/**
 * MusicXML Conversion Script
 *
 * Usage:
 *   npm run convert -- <input-file> [output-file]
 *   node convert.js <input-file> [output-file]
 *
 * Examples:
 *   npm run convert -- ./Bach_Minuet_in_G_Major_BWV_Anh._114.mxl
 *   npm run convert -- ./Bach_Minuet_in_G_Major_BWV_Anh._114.mxl ./bach-minuet.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { MusicXMLConverter } from './converter.js';
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: npm run convert -- <input-file> [output-file]');
        console.error('');
        console.error('Examples:');
        console.error('  npm run convert -- ./Bach_Minuet_in_G_Major_BWV_Anh._114.mxl');
        console.error('  npm run convert -- ./Bach_Minuet_in_G_Major_BWV_Anh._114.mxl ./bach-minuet.ts');
        process.exit(1);
    }
    const inputFile = args[0];
    const outputFile = args[1];
    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file does not exist: ${inputFile}`);
        process.exit(1);
    }
    try {
        console.log(`Converting ${inputFile}...`);
        const converter = new MusicXMLConverter();
        const sheetMusic = await converter.convertFile(inputFile);
        console.log(`✓ Conversion successful!`);
        console.log(`  Title: ${sheetMusic.title}`);
        console.log(`  Composer: ${sheetMusic.composer}`);
        console.log(`  Instrument: ${sheetMusic.instrument}`);
        console.log(`  Difficulty: ${sheetMusic.difficulty} (Level ${sheetMusic.difficultyLevel})`);
        console.log(`  Measures: ${sheetMusic.measures.length}`);
        console.log(`  Duration: ${sheetMusic.durationSeconds}s`);
        console.log(`  Key: ${sheetMusic.keySignature}`);
        console.log(`  Time: ${sheetMusic.timeSignature}`);
        console.log(`  Tempo: ${sheetMusic.suggestedTempo} BPM`);
        // Generate output
        if (outputFile) {
            writeTypeScriptFile(sheetMusic, outputFile);
            console.log(`✓ TypeScript file written to: ${outputFile}`);
        }
        else {
            // Default output based on input filename
            const baseName = path.basename(inputFile, path.extname(inputFile));
            const defaultOutput = `./${sheetMusic.id}.ts`;
            writeTypeScriptFile(sheetMusic, defaultOutput);
            console.log(`✓ TypeScript file written to: ${defaultOutput}`);
        }
        // Also write JSON for inspection
        const jsonOutput = outputFile
            ? outputFile.replace(/\.ts$/, '.json')
            : `./${sheetMusic.id}.json`;
        fs.writeFileSync(jsonOutput, JSON.stringify(sheetMusic, null, 2));
        console.log(`✓ JSON file written to: ${jsonOutput}`);
    }
    catch (error) {
        console.error('Conversion failed:', error);
        process.exit(1);
    }
}
function writeTypeScriptFile(sheetMusic, outputPath) {
    const variableName = sheetMusic.id.replace(/-/g, '_');
    const content = `/**
 * ${sheetMusic.title}
 * Composer: ${sheetMusic.composer}
 * Converted from MusicXML
 */

import type { SheetMusic } from '../../modules/sheetMusic/types'
import { NoteDuration, TimeSignature, KeySignature, Clef, TechnicalElement } from '../../modules/sheetMusic/types'

export const ${variableName}: SheetMusic = ${JSON.stringify(sheetMusic, null, 2)}
`;
    // Replace string literals with enum references where appropriate
    let processedContent = content
        .replace(/"WHOLE"/g, 'NoteDuration.WHOLE')
        .replace(/"HALF"/g, 'NoteDuration.HALF')
        .replace(/"QUARTER"/g, 'NoteDuration.QUARTER')
        .replace(/"EIGHTH"/g, 'NoteDuration.EIGHTH')
        .replace(/"SIXTEENTH"/g, 'NoteDuration.SIXTEENTH')
        .replace(/"THIRTY_SECOND"/g, 'NoteDuration.THIRTY_SECOND')
        .replace(/"2\/4"/g, 'TimeSignature.TWO_FOUR')
        .replace(/"3\/4"/g, 'TimeSignature.THREE_FOUR')
        .replace(/"4\/4"/g, 'TimeSignature.FOUR_FOUR')
        .replace(/"3\/8"/g, 'TimeSignature.THREE_EIGHT')
        .replace(/"6\/8"/g, 'TimeSignature.SIX_EIGHT')
        .replace(/"treble"/g, 'Clef.TREBLE')
        .replace(/"bass"/g, 'Clef.BASS')
        .replace(/"alto"/g, 'Clef.ALTO');
    // Replace key signature enum values
    Object.values({
        'C_MAJOR': 'C_MAJOR',
        'G_MAJOR': 'G_MAJOR',
        'D_MAJOR': 'D_MAJOR',
        'A_MAJOR': 'A_MAJOR',
        'E_MAJOR': 'E_MAJOR',
        'F_MAJOR': 'F_MAJOR',
        'B_FLAT_MAJOR': 'B_FLAT_MAJOR',
        'A_MINOR': 'A_MINOR',
        'E_MINOR': 'E_MINOR',
        'B_MINOR': 'B_MINOR',
        'D_MINOR': 'D_MINOR',
        'G_MINOR': 'G_MINOR'
    }).forEach(key => {
        processedContent = processedContent.replace(new RegExp(`"${key}"`, 'g'), `KeySignature.${key}`);
    });
    fs.writeFileSync(outputPath, processedContent);
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
//# sourceMappingURL=convert.js.map