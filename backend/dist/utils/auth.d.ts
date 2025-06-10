import type { User } from '../types/shared';
export interface JWTPayload {
    sub: string;
    email: string;
    user: User;
    iat: number;
    exp: number;
}
export interface MagicLinkPayload {
    email: string;
    token: string;
    exp: number;
}
export declare function generateMagicLinkToken(): string;
export declare function createJWT(user: User, secret: string, expiresIn?: string | number): Promise<string>;
export declare function createRefreshToken(userId: string, secret: string): Promise<string>;
export declare function verifyJWT(token: string, secret: string): Promise<JWTPayload>;
export declare function verifyRefreshToken(token: string, secret: string): Promise<{
    sub: string;
}>;
export declare function hashEmail(email: string): string;
export declare function isValidEmail(email: string): boolean;
//# sourceMappingURL=auth.d.ts.map