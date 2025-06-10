/**
 * MusicXML to SheetMusic converter
 * Converts MusicXML files to our internal SheetMusic format
 */
import { XMLParser } from 'fast-xml-parser';
import * as yauzl from 'yauzl';
import * as fs from 'fs';
import * as path from 'path';
import { NoteDuration, TimeSignature, KeySignature, Clef } from './types.js';
export class MusicXMLConverter {
    xmlParser;
    constructor() {
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true
        });
    }
    /**
     * Convert a MusicXML file (.xml or .mxl) to SheetMusic format
     */
    async convertFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.mxl') {
            return this.convertMXL(filePath);
        }
        else if (ext === '.xml') {
            return this.convertXML(filePath);
        }
        else {
            throw new Error(`Unsupported file format: ${ext}`);
        }
    }
    /**
     * Convert compressed MusicXML (.mxl) file
     */
    async convertMXL(filePath) {
        return new Promise((resolve, reject) => {
            yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!zipfile) {
                    reject(new Error('Failed to open MXL file'));
                    return;
                }
                let xmlContent = '';
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    // Look for the main XML file (usually largest .xml file)
                    if (entry.fileName.endsWith('.xml') && !entry.fileName.includes('META-INF')) {
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            if (!readStream) {
                                reject(new Error('Failed to read XML stream'));
                                return;
                            }
                            const chunks = [];
                            readStream.on('data', (chunk) => {
                                chunks.push(chunk);
                            });
                            readStream.on('end', () => {
                                xmlContent = Buffer.concat(chunks).toString('utf-8');
                                try {
                                    const sheetMusic = this.parseXMLContent(xmlContent, path.basename(filePath, '.mxl'));
                                    resolve(sheetMusic);
                                }
                                catch (parseErr) {
                                    reject(parseErr);
                                }
                            });
                            readStream.on('error', reject);
                        });
                    }
                    else {
                        zipfile.readEntry();
                    }
                });
                zipfile.on('end', () => {
                    if (!xmlContent) {
                        reject(new Error('No XML content found in MXL file'));
                    }
                });
                zipfile.on('error', reject);
            });
        });
    }
    /**
     * Convert uncompressed MusicXML (.xml) file
     */
    async convertXML(filePath) {
        const xmlContent = fs.readFileSync(filePath, 'utf-8');
        return this.parseXMLContent(xmlContent, path.basename(filePath, '.xml'));
    }
    /**
     * Parse XML content and convert to SheetMusic
     */
    parseXMLContent(xmlContent, baseFilename) {
        const musicXML = this.xmlParser.parse(xmlContent);
        // Handle both partwise and timewise formats
        const score = musicXML['score-partwise'] || musicXML['score-timewise'];
        if (!score) {
            throw new Error('Invalid MusicXML: No score found');
        }
        return this.convertScore(score, baseFilename);
    }
    /**
     * Convert MusicXML score to SheetMusic
     */
    convertScore(score, baseFilename) {
        // Extract metadata
        const title = this.extractTitle(score, baseFilename);
        const composer = this.extractComposer(score);
        // Process the first part (for now, we'll focus on single-part pieces)
        const parts = Array.isArray(score.part) ? score.part : [score.part];
        const firstPart = parts[0];
        if (!firstPart) {
            throw new Error('No musical parts found in score');
        }
        const measures = this.convertPart(firstPart);
        // Extract global properties from first measure
        const firstMeasure = measures[0];
        const timeSignature = this.getTimeSignatureString(firstMeasure);
        const keySignature = this.getKeySignatureString(firstMeasure);
        // Create SheetMusic object
        const sheetMusic = {
            id: this.generateId(baseFilename),
            title,
            composer,
            instrument: this.detectInstrument(score),
            difficulty: this.estimateDifficulty(measures),
            difficultyLevel: this.calculateDifficultyLevel(measures),
            durationSeconds: this.estimateDuration(measures),
            timeSignature,
            keySignature,
            suggestedTempo: this.extractTempo(firstPart) || 120,
            stylePeriod: this.estimateStylePeriod(composer),
            tags: ['converted', 'musicxml', 'public-domain'],
            measures,
            metadata: {
                source: 'MusicXML Conversion',
                license: 'Public Domain',
                year: this.extractYear(score)
            }
        };
        return sheetMusic;
    }
    /**
     * Convert a MusicXML part to measures
     */
    convertPart(part) {
        const measures = Array.isArray(part.measure) ? part.measure : [part.measure];
        return measures.map((xmlMeasure, index) => {
            return this.convertMeasure(xmlMeasure, index + 1);
        });
    }
    /**
     * Convert a MusicXML measure to our format
     */
    convertMeasure(xmlMeasure, measureNumber) {
        const measure = {
            number: measureNumber,
            notes: []
        };
        // Set measure attributes
        if (xmlMeasure.attributes) {
            const attrs = xmlMeasure.attributes;
            if (attrs.key) {
                measure.keySignature = this.convertKeySignature(attrs.key.fifths, attrs.key.mode);
            }
            if (attrs.time) {
                measure.timeSignature = this.convertTimeSignature(attrs.time.beats, attrs.time['beat-type']);
            }
            if (attrs.clef && attrs.clef.sign) {
                measure.clef = this.convertClef(attrs.clef.sign, attrs.clef.line);
            }
        }
        // Extract tempo from sound element
        if (xmlMeasure.sound && xmlMeasure.sound['@_tempo']) {
            measure.tempo = xmlMeasure.sound['@_tempo'];
        }
        // Convert notes
        if (xmlMeasure.note) {
            const notes = Array.isArray(xmlMeasure.note) ? xmlMeasure.note : [xmlMeasure.note];
            const divisions = xmlMeasure.attributes?.divisions || 1;
            let currentTime = 0;
            for (const xmlNote of notes) {
                const note = this.convertNote(xmlNote, divisions, currentTime);
                measure.notes.push(note);
                currentTime += note.duration === NoteDuration.QUARTER ? 1 : this.getDurationValue(note.duration);
            }
        }
        return measure;
    }
    /**
     * Convert a MusicXML note to our format
     */
    convertNote(xmlNote, divisions, time) {
        const note = {
            keys: [],
            duration: NoteDuration.QUARTER,
            time
        };
        // Handle rest
        if (xmlNote.rest) {
            note.rest = true;
            note.keys = ['r'];
        }
        else if (xmlNote.pitch) {
            // Convert pitch to VexFlow format
            const pitch = xmlNote.pitch;
            const noteName = pitch.step.toLowerCase();
            const octave = pitch.octave;
            let key = `${noteName}/${octave}`;
            // Handle accidentals
            if (pitch.alter) {
                if (pitch.alter > 0) {
                    key = `${noteName}#/${octave}`;
                }
                else if (pitch.alter < 0) {
                    key = `${noteName}b/${octave}`;
                }
            }
            note.keys = [key];
        }
        // Convert duration
        if (xmlNote.type) {
            note.duration = this.convertNoteDuration(xmlNote.type);
        }
        // Handle dots
        if (xmlNote.dot) {
            note.dots = Array.isArray(xmlNote.dot) ? xmlNote.dot.length : 1;
        }
        // Handle stem direction
        if (xmlNote.stem) {
            note.stem = xmlNote.stem === 'up' ? 'up' : xmlNote.stem === 'down' ? 'down' : 'auto';
        }
        // Handle accidentals
        if (xmlNote.accidental) {
            note.accidental = xmlNote.accidental;
        }
        return note;
    }
    /**
     * Helper methods for conversion
     */
    extractTitle(score, fallback) {
        // Try to extract title from identification
        if (score.identification?.creator) {
            const creators = Array.isArray(score.identification.creator)
                ? score.identification.creator
                : [score.identification.creator];
            const title = creators.find(c => c['@_type'] === 'title');
            if (title && title['#text']) {
                return title['#text'];
            }
        }
        // Fallback to filename
        return this.titleCase(fallback.replace(/[-_]/g, ' '));
    }
    extractComposer(score) {
        if (score.identification?.creator) {
            const creators = Array.isArray(score.identification.creator)
                ? score.identification.creator
                : [score.identification.creator];
            const composer = creators.find(c => c['@_type'] === 'composer');
            if (composer && composer['#text']) {
                return composer['#text'];
            }
        }
        return 'Unknown Composer';
    }
    extractTempo(part) {
        const measures = Array.isArray(part.measure) ? part.measure : [part.measure];
        for (const measure of measures) {
            if (measure.sound && measure.sound['@_tempo']) {
                return measure.sound['@_tempo'];
            }
        }
        return undefined;
    }
    extractYear(score) {
        // This would require more sophisticated parsing of the encoding section
        return undefined;
    }
    convertKeySignature(fifths, mode) {
        const isMinor = mode === 'minor';
        // Circle of fifths mapping
        const majorKeys = [
            KeySignature.C_FLAT_MAJOR, KeySignature.G_FLAT_MAJOR, KeySignature.D_FLAT_MAJOR,
            KeySignature.A_FLAT_MAJOR, KeySignature.E_FLAT_MAJOR, KeySignature.B_FLAT_MAJOR,
            KeySignature.F_MAJOR, KeySignature.C_MAJOR, KeySignature.G_MAJOR,
            KeySignature.D_MAJOR, KeySignature.A_MAJOR, KeySignature.E_MAJOR,
            KeySignature.B_MAJOR, KeySignature.F_SHARP_MAJOR, KeySignature.C_SHARP_MAJOR
        ];
        const minorKeys = [
            KeySignature.A_FLAT_MINOR, KeySignature.E_FLAT_MINOR, KeySignature.B_FLAT_MINOR,
            KeySignature.F_MINOR, KeySignature.C_MINOR, KeySignature.G_MINOR,
            KeySignature.D_MINOR, KeySignature.A_MINOR, KeySignature.E_MINOR,
            KeySignature.B_MINOR, KeySignature.F_SHARP_MINOR, KeySignature.C_SHARP_MINOR,
            KeySignature.G_SHARP_MINOR, KeySignature.D_SHARP_MINOR, KeySignature.A_SHARP_MINOR
        ];
        const index = fifths + 7; // Offset to handle negative values
        const keyArray = isMinor ? minorKeys : majorKeys;
        return keyArray[index] || KeySignature.C_MAJOR;
    }
    convertTimeSignature(beats, beatType) {
        const signature = `${beats}/${beatType}`;
        switch (signature) {
            case '2/4': return TimeSignature.TWO_FOUR;
            case '3/4': return TimeSignature.THREE_FOUR;
            case '4/4': return TimeSignature.FOUR_FOUR;
            case '3/8': return TimeSignature.THREE_EIGHT;
            case '6/8': return TimeSignature.SIX_EIGHT;
            case '9/8': return TimeSignature.NINE_EIGHT;
            case '12/8': return TimeSignature.TWELVE_EIGHT;
            case '5/4': return TimeSignature.FIVE_FOUR;
            case '7/8': return TimeSignature.SEVEN_EIGHT;
            default: return TimeSignature.FOUR_FOUR;
        }
    }
    convertClef(sign, line) {
        if (!sign || typeof sign !== 'string') {
            return Clef.TREBLE;
        }
        switch (sign.toLowerCase()) {
            case 'g': return Clef.TREBLE;
            case 'f': return Clef.BASS;
            case 'c':
                if (line === 3)
                    return Clef.ALTO;
                if (line === 4)
                    return Clef.TENOR;
                return Clef.ALTO;
            default: return Clef.TREBLE;
        }
    }
    convertNoteDuration(type) {
        if (!type || typeof type !== 'string') {
            return NoteDuration.QUARTER;
        }
        switch (type.toLowerCase()) {
            case 'whole': return NoteDuration.WHOLE;
            case 'half': return NoteDuration.HALF;
            case 'quarter': return NoteDuration.QUARTER;
            case 'eighth': return NoteDuration.EIGHTH;
            case '16th':
            case 'sixteenth': return NoteDuration.SIXTEENTH;
            case '32nd':
            case 'thirty-second': return NoteDuration.THIRTY_SECOND;
            default: return NoteDuration.QUARTER;
        }
    }
    getDurationValue(duration) {
        switch (duration) {
            case NoteDuration.WHOLE: return 4;
            case NoteDuration.HALF: return 2;
            case NoteDuration.QUARTER: return 1;
            case NoteDuration.EIGHTH: return 0.5;
            case NoteDuration.SIXTEENTH: return 0.25;
            case NoteDuration.THIRTY_SECOND: return 0.125;
            default: return 1;
        }
    }
    detectInstrument(score) {
        // Simple heuristic - check part names or default to PIANO
        if (score['part-list']?.['score-part']) {
            const parts = Array.isArray(score['part-list']['score-part'])
                ? score['part-list']['score-part']
                : [score['part-list']['score-part']];
            for (const part of parts) {
                const partName = (part['part-name'] || '').toString().toLowerCase();
                if (partName.includes('guitar') || partName.includes('gtr')) {
                    return 'GUITAR';
                }
            }
        }
        return 'PIANO';
    }
    estimateDifficulty(measures) {
        // Simple heuristic based on note density and rhythm complexity
        let totalNotes = 0;
        let shortNotes = 0;
        for (const measure of measures) {
            totalNotes += measure.notes.length;
            shortNotes += measure.notes.filter(note => note.duration === NoteDuration.SIXTEENTH ||
                note.duration === NoteDuration.THIRTY_SECOND).length;
        }
        const avgNotesPerMeasure = totalNotes / measures.length;
        const shortNoteRatio = shortNotes / totalNotes;
        if (avgNotesPerMeasure > 8 || shortNoteRatio > 0.3) {
            return 'ADVANCED';
        }
        else if (avgNotesPerMeasure > 4 || shortNoteRatio > 0.1) {
            return 'INTERMEDIATE';
        }
        else {
            return 'BEGINNER';
        }
    }
    calculateDifficultyLevel(measures) {
        const difficulty = this.estimateDifficulty(measures);
        switch (difficulty) {
            case 'BEGINNER': return Math.floor(Math.random() * 3) + 1; // 1-3
            case 'INTERMEDIATE': return Math.floor(Math.random() * 3) + 4; // 4-6
            case 'ADVANCED': return Math.floor(Math.random() * 4) + 7; // 7-10
            default: return 5;
        }
    }
    estimateDuration(measures) {
        // Estimate based on number of measures and average tempo
        const measuresCount = measures.length;
        const assumedTempo = 120; // BPM
        const assumedTimeSignature = 4; // beats per measure
        const totalBeats = measuresCount * assumedTimeSignature;
        const secondsPerBeat = 60 / assumedTempo;
        return Math.round(totalBeats * secondsPerBeat);
    }
    estimateStylePeriod(composer) {
        const composerLower = composer.toLowerCase();
        if (composerLower.includes('bach') || composerLower.includes('handel') || composerLower.includes('vivaldi')) {
            return 'BAROQUE';
        }
        else if (composerLower.includes('mozart') || composerLower.includes('haydn') || composerLower.includes('beethoven') ||
            composerLower.includes('clementi')) {
            return 'CLASSICAL';
        }
        else if (composerLower.includes('chopin') || composerLower.includes('schumann') || composerLower.includes('brahms') ||
            composerLower.includes('liszt')) {
            return 'ROMANTIC';
        }
        else {
            return 'CLASSICAL'; // Default fallback
        }
    }
    getTimeSignatureString(measure) {
        if (measure.timeSignature) {
            return measure.timeSignature;
        }
        return '4/4'; // Default
    }
    getKeySignatureString(measure) {
        if (measure.keySignature) {
            // Convert enum to human-readable string
            return measure.keySignature.replace('_', ' ').toLowerCase()
                .replace(/\b\w/g, l => l.toUpperCase());
        }
        return 'C major'; // Default
    }
    generateId(filename) {
        return filename.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    titleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
}
//# sourceMappingURL=converter.js.map