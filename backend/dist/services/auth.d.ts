import type { KVNamespace } from '@cloudflare/workers-types';
import type { User } from '../types/shared';
export declare class AuthService {
    private magicLinksKV;
    private jwtSecret;
    private readonly MAGIC_LINK_TTL;
    private readonly MAGIC_LINK_PREFIX;
    constructor(magicLinksKV: KVNamespace, jwtSecret: string);
    createMagicLink(email: string): Promise<string>;
    verifyMagicLink(token: string): Promise<string | null>;
    generateTokens(user: User): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    verifyRefreshToken(token: string): Promise<string>;
}
//# sourceMappingURL=auth.d.ts.map