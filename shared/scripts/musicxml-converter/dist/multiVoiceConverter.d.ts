/**
 * Multi-Voice MusicXML Converter
 *
 * Converts MusicXML files to the new multi-voice Score format
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
    clef: string;
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
    duration: string;
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
    timeSignature?: string;
    keySignature?: string;
    tempo?: number;
    barLine?: string;
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
export declare function convertMusicXMLToMultiVoice(inputPath: string, outputPath?: string): Promise<Score>;
export {};
