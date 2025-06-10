/**
 * Types for MusicXML to SheetMusic conversion
 * These mirror the types from our frontend but are standalone for the converter
 */
export interface Note {
    keys: string[];
    duration: NoteDuration;
    time: number;
    accidental?: string;
    dots?: number;
    stem?: 'up' | 'down' | 'auto';
    beam?: boolean;
    articulation?: string;
    dynamic?: string;
    fingering?: string;
    rest?: boolean;
    tie?: 'start' | 'stop' | 'continue';
}
export interface Measure {
    number: number;
    notes: Note[];
    timeSignature?: TimeSignature;
    keySignature?: KeySignature;
    clef?: Clef;
    tempo?: number;
    dynamics?: string;
    rehearsalMark?: string;
    barLine?: 'single' | 'double' | 'end' | 'repeat-start' | 'repeat-end';
    repeatCount?: number;
}
export interface SheetMusic {
    id: string;
    title: string;
    composer: string;
    opus?: string;
    movement?: string;
    instrument: 'PIANO' | 'GUITAR';
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    difficultyLevel: number;
    gradeLevel?: string;
    durationSeconds: number;
    timeSignature: string;
    keySignature: string;
    tempoMarking?: string;
    suggestedTempo: number;
    stylePeriod: 'BAROQUE' | 'CLASSICAL' | 'ROMANTIC' | 'MODERN' | 'CONTEMPORARY';
    tags: string[];
    measures: Measure[];
    metadata?: SheetMusicMetadata;
    thumbnail?: string;
}
export interface SheetMusicMetadata {
    source?: string;
    license?: string;
    arrangedBy?: string;
    year?: number;
    musicalForm?: string;
    technicalFocus?: string[];
}
export declare enum NoteDuration {
    WHOLE = "w",
    HALF = "h",
    QUARTER = "q",
    EIGHTH = "8",
    SIXTEENTH = "16",
    THIRTY_SECOND = "32"
}
export declare enum TimeSignature {
    TWO_FOUR = "2/4",
    THREE_FOUR = "3/4",
    FOUR_FOUR = "4/4",
    THREE_EIGHT = "3/8",
    SIX_EIGHT = "6/8",
    NINE_EIGHT = "9/8",
    TWELVE_EIGHT = "12/8",
    FIVE_FOUR = "5/4",
    SEVEN_EIGHT = "7/8"
}
export declare enum KeySignature {
    C_MAJOR = "C_MAJOR",
    G_MAJOR = "G_MAJOR",
    D_MAJOR = "D_MAJOR",
    A_MAJOR = "A_MAJOR",
    E_MAJOR = "E_MAJOR",
    B_MAJOR = "B_MAJOR",
    F_SHARP_MAJOR = "F_SHARP_MAJOR",
    C_SHARP_MAJOR = "C_SHARP_MAJOR",
    F_MAJOR = "F_MAJOR",
    B_FLAT_MAJOR = "B_FLAT_MAJOR",
    E_FLAT_MAJOR = "E_FLAT_MAJOR",
    A_FLAT_MAJOR = "A_FLAT_MAJOR",
    D_FLAT_MAJOR = "D_FLAT_MAJOR",
    G_FLAT_MAJOR = "G_FLAT_MAJOR",
    C_FLAT_MAJOR = "C_FLAT_MAJOR",
    A_MINOR = "A_MINOR",
    E_MINOR = "E_MINOR",
    B_MINOR = "B_MINOR",
    F_SHARP_MINOR = "F_SHARP_MINOR",
    C_SHARP_MINOR = "C_SHARP_MINOR",
    G_SHARP_MINOR = "G_SHARP_MINOR",
    D_SHARP_MINOR = "D_SHARP_MINOR",
    A_SHARP_MINOR = "A_SHARP_MINOR",
    D_MINOR = "D_MINOR",
    G_MINOR = "G_MINOR",
    C_MINOR = "C_MINOR",
    F_MINOR = "F_MINOR",
    B_FLAT_MINOR = "B_FLAT_MINOR",
    E_FLAT_MINOR = "E_FLAT_MINOR",
    A_FLAT_MINOR = "A_FLAT_MINOR"
}
export declare enum Clef {
    TREBLE = "treble",
    BASS = "bass",
    ALTO = "alto",
    TENOR = "tenor",
    GRAND_STAFF = "grand_staff"
}
export interface MusicXMLDocument {
    'score-partwise'?: MusicXMLScore;
    'score-timewise'?: MusicXMLScore;
}
export interface MusicXMLScore {
    '@_version'?: string;
    identification?: {
        creator?: Array<{
            '@_type': string;
            '#text': string;
        }> | {
            '@_type': string;
            '#text': string;
        };
        encoding?: any;
    };
    'part-list'?: {
        'score-part': Array<{
            '@_id': string;
            'part-name': string;
            'score-instrument'?: any;
        }> | {
            '@_id': string;
            'part-name': string;
            'score-instrument'?: any;
        };
    };
    part?: Array<MusicXMLPart> | MusicXMLPart;
}
export interface MusicXMLPart {
    '@_id': string;
    measure: Array<MusicXMLMeasure> | MusicXMLMeasure;
}
export interface MusicXMLMeasure {
    '@_number': string | number;
    attributes?: {
        divisions?: number;
        key?: {
            fifths: number;
            mode?: string;
        };
        time?: {
            beats: number;
            'beat-type': number;
        };
        clef?: {
            sign: string;
            line?: number;
        };
    };
    note?: Array<MusicXMLNote> | MusicXMLNote;
    direction?: any;
    sound?: {
        '@_tempo'?: number;
    };
}
export interface MusicXMLNote {
    pitch?: {
        step: string;
        alter?: number;
        octave: number;
    };
    rest?: {};
    duration: number;
    voice?: number;
    type?: string;
    dot?: any;
    stem?: string;
    beam?: Array<{
        '@_number': number;
        '#text': string;
    }> | {
        '@_number': number;
        '#text': string;
    };
    tie?: Array<{
        '@_type': string;
    }> | {
        '@_type': string;
    };
    accidental?: string;
}
//# sourceMappingURL=types.d.ts.map