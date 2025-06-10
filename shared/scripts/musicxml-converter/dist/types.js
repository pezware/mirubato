/**
 * Types for MusicXML to SheetMusic conversion
 * These mirror the types from our frontend but are standalone for the converter
 */
export var NoteDuration;
(function (NoteDuration) {
    NoteDuration["WHOLE"] = "w";
    NoteDuration["HALF"] = "h";
    NoteDuration["QUARTER"] = "q";
    NoteDuration["EIGHTH"] = "8";
    NoteDuration["SIXTEENTH"] = "16";
    NoteDuration["THIRTY_SECOND"] = "32";
})(NoteDuration || (NoteDuration = {}));
export var TimeSignature;
(function (TimeSignature) {
    TimeSignature["TWO_FOUR"] = "2/4";
    TimeSignature["THREE_FOUR"] = "3/4";
    TimeSignature["FOUR_FOUR"] = "4/4";
    TimeSignature["THREE_EIGHT"] = "3/8";
    TimeSignature["SIX_EIGHT"] = "6/8";
    TimeSignature["NINE_EIGHT"] = "9/8";
    TimeSignature["TWELVE_EIGHT"] = "12/8";
    TimeSignature["FIVE_FOUR"] = "5/4";
    TimeSignature["SEVEN_EIGHT"] = "7/8";
})(TimeSignature || (TimeSignature = {}));
export var KeySignature;
(function (KeySignature) {
    KeySignature["C_MAJOR"] = "C_MAJOR";
    KeySignature["G_MAJOR"] = "G_MAJOR";
    KeySignature["D_MAJOR"] = "D_MAJOR";
    KeySignature["A_MAJOR"] = "A_MAJOR";
    KeySignature["E_MAJOR"] = "E_MAJOR";
    KeySignature["B_MAJOR"] = "B_MAJOR";
    KeySignature["F_SHARP_MAJOR"] = "F_SHARP_MAJOR";
    KeySignature["C_SHARP_MAJOR"] = "C_SHARP_MAJOR";
    KeySignature["F_MAJOR"] = "F_MAJOR";
    KeySignature["B_FLAT_MAJOR"] = "B_FLAT_MAJOR";
    KeySignature["E_FLAT_MAJOR"] = "E_FLAT_MAJOR";
    KeySignature["A_FLAT_MAJOR"] = "A_FLAT_MAJOR";
    KeySignature["D_FLAT_MAJOR"] = "D_FLAT_MAJOR";
    KeySignature["G_FLAT_MAJOR"] = "G_FLAT_MAJOR";
    KeySignature["C_FLAT_MAJOR"] = "C_FLAT_MAJOR";
    // Minor keys
    KeySignature["A_MINOR"] = "A_MINOR";
    KeySignature["E_MINOR"] = "E_MINOR";
    KeySignature["B_MINOR"] = "B_MINOR";
    KeySignature["F_SHARP_MINOR"] = "F_SHARP_MINOR";
    KeySignature["C_SHARP_MINOR"] = "C_SHARP_MINOR";
    KeySignature["G_SHARP_MINOR"] = "G_SHARP_MINOR";
    KeySignature["D_SHARP_MINOR"] = "D_SHARP_MINOR";
    KeySignature["A_SHARP_MINOR"] = "A_SHARP_MINOR";
    KeySignature["D_MINOR"] = "D_MINOR";
    KeySignature["G_MINOR"] = "G_MINOR";
    KeySignature["C_MINOR"] = "C_MINOR";
    KeySignature["F_MINOR"] = "F_MINOR";
    KeySignature["B_FLAT_MINOR"] = "B_FLAT_MINOR";
    KeySignature["E_FLAT_MINOR"] = "E_FLAT_MINOR";
    KeySignature["A_FLAT_MINOR"] = "A_FLAT_MINOR";
})(KeySignature || (KeySignature = {}));
export var Clef;
(function (Clef) {
    Clef["TREBLE"] = "treble";
    Clef["BASS"] = "bass";
    Clef["ALTO"] = "alto";
    Clef["TENOR"] = "tenor";
    Clef["GRAND_STAFF"] = "grand_staff";
})(Clef || (Clef = {}));
//# sourceMappingURL=types.js.map