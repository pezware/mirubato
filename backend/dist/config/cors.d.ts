/**
 * CORS configuration for the backend API
 * Uses the unified configuration system
 */
export interface CorsConfig {
    production: {
        domains: string[];
        patterns: string[];
    };
    development: {
        origins: string[];
    };
}
/**
 * Get CORS configuration based on the unified config
 * This is kept for backward compatibility but uses the new system internally
 */
export declare function getCorsConfig(environment?: 'production' | 'development'): CorsConfig;
export declare const corsConfig: CorsConfig;
/**
 * Check if an origin matches any of the configured patterns
 * Delegates to the unified configuration system
 */
export declare function isOriginAllowed(origin: string, environment: 'production' | 'development'): boolean;
//# sourceMappingURL=cors.d.ts.map