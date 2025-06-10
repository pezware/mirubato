import { ApolloServer } from '@apollo/server';
import type { GraphQLContext } from '../types/context';
export declare function createMockContext(overrides?: Partial<GraphQLContext>): GraphQLContext;
export declare function createMockKV(): any;
export declare function executeGraphQLQuery(server: ApolloServer<GraphQLContext>, query: string, variables?: any, context?: Partial<GraphQLContext>): Promise<import("@apollo/server").GraphQLResponse<Record<string, unknown>>>;
export declare const mockUser: {
    id: string;
    email: string;
    displayName: string;
    primaryInstrument: "PIANO";
    preferences: {
        theme: "LIGHT";
        notationSize: "MEDIUM";
        practiceReminders: boolean;
        dailyGoalMinutes: number;
    };
    stats: {
        totalPracticeTime: number;
        consecutiveDays: number;
        piecesCompleted: number;
        accuracyAverage: number;
    };
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=graphql.d.ts.map