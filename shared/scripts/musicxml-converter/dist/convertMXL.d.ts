#!/usr/bin/env node
/**
 * MXL to Multi-Voice Score Converter
 *
 * Converts MXL (compressed MusicXML) files to TypeScript Score format
 * using the multi-voice data model.
 */
interface Score {
    title: string;
    composer: string;
    arranger?: string;
    copyright?: string;
    parts: Part[];
    measures: MultiVoiceMeasure[];
    metadata: ScoreMetadata;
}
interface Part {
    id: string;
    name: string;
    instrument: string;
    staves: string[];
    midiProgram?: number;
    volume?: number;
    pan?: number;
}
interface Staff {
    id: string;
    clef: Clef;
    voices: Voice[];
    name?: string;
}
interface Voice {
    id: string;
    name?: string;
    stemDirection?: 'up' | 'down' | 'auto';
    notes: MultiVoiceNote[];
}
interface MultiVoiceNote {
    keys: string[];
    duration: NoteDuration;
    time: number;
    voiceId: string;
    staffId?: string;
    accidental?: string;
    dots?: number;
    stem?: 'up' | 'down' | 'auto';
    rest?: boolean;
    tie?: 'start' | 'stop' | 'continue';
}
interface MultiVoiceMeasure {
    number: number;
    staves: Staff[];
    timeSignature?: TimeSignature;
    keySignature?: KeySignature;
    tempo?: number;
    dynamics?: DynamicMarking;
    rehearsalMark?: string;
    barLine?: BarLineType;
    repeatCount?: number;
    volta?: VoltaInfo;
}
interface ScoreMetadata {
    createdAt: Date;
    modifiedAt: Date;
    source: string;
    originalFilename?: string;
    encodingSoftware?: string;
    tags: string[];
    performanceNotes?: string;
    difficulty?: number;
    duration?: number;
}
interface VoltaInfo {
    number: number;
    endings: number[];
}
declare enum Clef {
    TREBLE = "treble",
    BASS = "bass",
    ALTO = "alto",
    TENOR = "tenor"
}
declare enum NoteDuration {
    WHOLE = "w",
    HALF = "h",
    QUARTER = "q",
    EIGHTH = "8",
    SIXTEENTH = "16",
    THIRTY_SECOND = "32"
}
declare enum TimeSignature {
    FOUR_FOUR = "4/4",
    THREE_FOUR = "3/4",
    TWO_FOUR = "2/4",
    SIX_EIGHT = "6/8",
    TWELVE_EIGHT = "12/8",
    THREE_EIGHT = "3/8",
    FIVE_FOUR = "5/4",
    SEVEN_EIGHT = "7/8",
    CUT_TIME = "2/2",
    COMMON_TIME = "C"
}
declare enum KeySignature {
    C_MAJOR = "C",
    G_MAJOR = "G",
    D_MAJOR = "D",
    A_MAJOR = "A",
    E_MAJOR = "E",
    B_MAJOR = "B",
    F_SHARP_MAJOR = "F#",
    C_SHARP_MAJOR = "C#",
    F_MAJOR = "F",
    B_FLAT_MAJOR = "Bb",
    E_FLAT_MAJOR = "Eb",
    A_FLAT_MAJOR = "Ab",
    D_FLAT_MAJOR = "Db",
    G_FLAT_MAJOR = "Gb",
    C_FLAT_MAJOR = "Cb",
    A_MINOR = "Am",
    E_MINOR = "Em",
    B_MINOR = "Bm",
    F_SHARP_MINOR = "F#m",
    C_SHARP_MINOR = "C#m",
    G_SHARP_MINOR = "G#m",
    D_SHARP_MINOR = "D#m",
    A_SHARP_MINOR = "A#m",
    D_MINOR = "Dm",
    G_MINOR = "Gm",
    C_MINOR = "Cm",
    F_MINOR = "Fm",
    B_FLAT_MINOR = "Bbm",
    E_FLAT_MINOR = "Ebm",
    A_FLAT_MINOR = "Abm"
}
declare enum DynamicMarking {
    pppp = "pppp",
    ppp = "ppp",
    pp = "pp",
    p = "p",
    mp = "mp",
    mf = "mf",
    f = "f",
    ff = "ff",
    fff = "fff",
    ffff = "ffff",
    sfz = "sfz",
    fp = "fp"
}
type BarLineType = 'single' | 'double' | 'end' | 'repeat-start' | 'repeat-end' | 'repeat-both';
/**
 * MusicXML to Score Converter
 * Based on the frontend converter but adapted for Node.js
 */
declare class MusicXMLToScoreConverter {
    private xmlData;
    private divisions;
    private currentTime;
    private parser;
    constructor(xmlString: string);
    /**
     * Convert score-timewise format to score-partwise format
     */
    private convertTimewiseToPartwise;
    convert(): Score;
    private extractTitle;
    private extractComposer;
    private extractArranger;
    private extractCopyright;
    private extractParts;
    private extractInstrumentFromPart;
    private extractStavesForPart;
    private extractMeasures;
    private extractMeasure;
    private extractStavesFromMeasure;
    private extractClefForStaff;
    private extractStemDirection;
    private convertNote;
    private extractDuration;
    private extractMeasureAttributes;
    private fifthsToKeySignature;
    private extractMetadata;
}
declare function convertMXLFile(inputPath: string, outputDir: string): Promise<void>;
export { convertMXLFile, MusicXMLToScoreConverter };
