import { generateMagicLinkToken, createJWT, createRefreshToken, verifyRefreshToken as verifyToken, } from '../utils/auth';
export class AuthService {
    magicLinksKV;
    jwtSecret;
    MAGIC_LINK_TTL = 600; // 10 minutes
    MAGIC_LINK_PREFIX = 'magic_link:';
    constructor(magicLinksKV, jwtSecret) {
        this.magicLinksKV = magicLinksKV;
        this.jwtSecret = jwtSecret;
    }
    async createMagicLink(email) {
        const token = generateMagicLinkToken();
        const key = `${this.MAGIC_LINK_PREFIX}${token}`;
        // Store email with token in KV
        await this.magicLinksKV.put(key, email, {
            expirationTtl: this.MAGIC_LINK_TTL,
        });
        return token;
    }
    async verifyMagicLink(token) {
        const key = `${this.MAGIC_LINK_PREFIX}${token}`;
        const email = await this.magicLinksKV.get(key);
        if (!email) {
            return null;
        }
        // Delete the token after use
        await this.magicLinksKV.delete(key);
        return email;
    }
    async generateTokens(user) {
        const [accessToken, refreshToken] = await Promise.all([
            createJWT(user, this.jwtSecret),
            createRefreshToken(user.id, this.jwtSecret),
        ]);
        return { accessToken, refreshToken };
    }
    async verifyRefreshToken(token) {
        const payload = await verifyToken(token, this.jwtSecret);
        return payload.sub;
    }
}
//# sourceMappingURL=auth.js.map