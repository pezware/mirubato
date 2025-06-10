import type { D1Database } from '@cloudflare/workers-types';
import type { User, UserStats } from '../types/shared';
import type { UpdateUserInput } from '../types/generated/graphql';
export declare class UserService {
    private db;
    constructor(db: D1Database);
    getUserById(id: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    createUser(data: {
        email: string;
        displayName?: string;
    }): Promise<User>;
    updateUser(id: string, input: UpdateUserInput): Promise<User>;
    deleteUser(id: string): Promise<void>;
    getUserStats(userId: string): Promise<UserStats>;
    private mapToUser;
    private getDefaultPreferences;
    private getDefaultStats;
    private calculateConsecutiveDays;
}
//# sourceMappingURL=user.d.ts.map