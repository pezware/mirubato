import { createMockDB } from './db';
import { nanoid } from 'nanoid';
export function createMockContext(overrides) {
    const defaultEnv = {
        DB: createMockDB(),
        MIRUBATO_MAGIC_LINKS: createMockKV(),
        RATE_LIMITER: {},
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'development',
    };
    return {
        env: {
            ...defaultEnv,
            ...(overrides?.env || {}),
        },
        requestId: nanoid(),
        ...overrides,
    };
}
export function createMockKV() {
    const store = new Map();
    return {
        async get(key) {
            return store.get(key) || null;
        },
        async put(key, value, _options) {
            store.set(key, value);
        },
        async delete(key) {
            store.delete(key);
        },
        async list(_options) {
            return {
                keys: Array.from(store.keys()).map(name => ({ name })),
            };
        },
    };
}
export async function executeGraphQLQuery(server, query, variables, context) {
    const result = await server.executeOperation({
        query,
        variables,
    }, {
        contextValue: createMockContext(context),
    });
    return result;
}
export const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    displayName: 'Test User',
    primaryInstrument: 'PIANO',
    preferences: {
        theme: 'LIGHT',
        notationSize: 'MEDIUM',
        practiceReminders: true,
        dailyGoalMinutes: 30,
    },
    stats: {
        totalPracticeTime: 0,
        consecutiveDays: 0,
        piecesCompleted: 0,
        accuracyAverage: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};
//# sourceMappingURL=graphql.js.map