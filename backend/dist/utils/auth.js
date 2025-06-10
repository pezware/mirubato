import * as jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
// Generate a magic link token
export function generateMagicLinkToken() {
    return nanoid(32);
}
// Create a JWT token
export async function createJWT(user, secret, expiresIn = '15m') {
    const payload = {
        sub: user.id,
        email: user.email,
        user,
    };
    // @ts-expect-error - JWT library type definitions have compatibility issues
    return jwt.sign(payload, secret, {
        expiresIn,
        issuer: 'mirubato',
    });
}
// Create a refresh token
export async function createRefreshToken(userId, secret) {
    return jwt.sign({
        sub: userId,
        type: 'refresh',
    }, secret, {
        expiresIn: '30d',
        issuer: 'mirubato',
    });
}
// Verify a JWT token
export async function verifyJWT(token, secret) {
    try {
        const payload = jwt.verify(token, secret, {
            issuer: 'mirubato',
        });
        return payload;
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
}
// Verify a refresh token
export async function verifyRefreshToken(token, secret) {
    try {
        const payload = jwt.verify(token, secret, {
            issuer: 'mirubato',
        });
        if (payload.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return { sub: payload.sub };
    }
    catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
}
// Hash email for privacy
export function hashEmail(email) {
    return Buffer.from(email).toString('base64');
}
// Validate email format
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
//# sourceMappingURL=auth.js.map