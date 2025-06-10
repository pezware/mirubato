/**
 * MusicXML to SheetMusic converter
 * Converts MusicXML files to our internal SheetMusic format
 */
import { SheetMusic } from './types.js';
export declare class MusicXMLConverter {
    private xmlParser;
    constructor();
    /**
     * Convert a MusicXML file (.xml or .mxl) to SheetMusic format
     */
    convertFile(filePath: string): Promise<SheetMusic>;
    /**
     * Convert compressed MusicXML (.mxl) file
     */
    private convertMXL;
    /**
     * Convert uncompressed MusicXML (.xml) file
     */
    private convertXML;
    /**
     * Parse XML content and convert to SheetMusic
     */
    private parseXMLContent;
    /**
     * Convert MusicXML score to SheetMusic
     */
    private convertScore;
    /**
     * Convert a MusicXML part to measures
     */
    private convertPart;
    /**
     * Convert a MusicXML measure to our format
     */
    private convertMeasure;
    /**
     * Convert a MusicXML note to our format
     */
    private convertNote;
    /**
     * Helper methods for conversion
     */
    private extractTitle;
    private extractComposer;
    private extractTempo;
    private extractYear;
    private convertKeySignature;
    private convertTimeSignature;
    private convertClef;
    private convertNoteDuration;
    private getDurationValue;
    private detectInstrument;
    private estimateDifficulty;
    private calculateDifficultyLevel;
    private estimateDuration;
    private estimateStylePeriod;
    private getTimeSignatureString;
    private getKeySignatureString;
    private generateId;
    private titleCase;
}
//# sourceMappingURL=converter.d.ts.map