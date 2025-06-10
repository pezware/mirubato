export declare const logbookResolvers: {
    Query: {
        logbookEntry: (_: any, { id }: any, context: any) => Promise<{
            id: string;
            user: any;
            timestamp: string;
            duration: number;
            type: any;
            instrument: any;
            pieces: any;
            techniques: any;
            goalIds: any;
            goals: any[];
            notes: any;
            mood: any;
            tags: any;
            sessionId: any;
            session: any;
            metadata: any;
            createdAt: string;
            updatedAt: string;
        }>;
        myLogbookEntries: (_: any, { filter, offset, limit }: any, context: any) => Promise<{
            edges: any;
            pageInfo: {
                hasNextPage: boolean;
                hasPreviousPage: boolean;
                startCursor: any;
                endCursor: any;
            };
            totalCount: number;
        }>;
        goal: (_: any, { id }: any, context: any) => Promise<{
            id: string;
            user: any;
            title: any;
            description: any;
            targetDate: string;
            progress: number;
            milestones: any;
            status: any;
            linkedEntryIds: any;
            linkedEntries: any[];
            createdAt: string;
            updatedAt: string;
            completedAt: string;
        }>;
        myGoals: (_: any, { status, offset, limit }: any, context: any) => Promise<{
            edges: any;
            pageInfo: {
                hasNextPage: boolean;
                hasPreviousPage: boolean;
                startCursor: any;
                endCursor: any;
            };
            totalCount: number;
        }>;
    };
    Mutation: {
        createLogbookEntry: (_: any, { input }: any, context: any) => Promise<{
            id: string;
            user: any;
            timestamp: any;
            duration: any;
            type: any;
            instrument: any;
            pieces: any;
            techniques: any;
            goalIds: any;
            goals: any[];
            notes: any;
            mood: any;
            tags: any;
            sessionId: any;
            session: any;
            metadata: any;
            createdAt: string;
            updatedAt: string;
        }>;
        updateLogbookEntry: (_: any, { input }: any, context: any) => Promise<{
            id: string;
            user: any;
            timestamp: string;
            duration: number;
            type: any;
            instrument: any;
            pieces: any;
            techniques: any;
            goalIds: any;
            goals: any[];
            notes: any;
            mood: any;
            tags: any;
            sessionId: any;
            session: any;
            metadata: any;
            createdAt: string;
            updatedAt: string;
        }>;
        deleteLogbookEntry: (_: any, { id }: any, context: any) => Promise<boolean>;
        createGoal: (_: any, { input }: any, context: any) => Promise<{
            id: string;
            user: any;
            title: any;
            description: any;
            targetDate: any;
            progress: number;
            milestones: any;
            status: string;
            linkedEntryIds: any[];
            linkedEntries: any[];
            createdAt: string;
            updatedAt: string;
            completedAt: any;
        }>;
        updateGoal: (_: any, { input }: any, context: any) => Promise<{
            id: string;
            user: any;
            title: any;
            description: any;
            targetDate: string;
            progress: number;
            milestones: any;
            status: any;
            linkedEntryIds: any;
            linkedEntries: any[];
            createdAt: string;
            updatedAt: string;
            completedAt: string;
        }>;
        deleteGoal: (_: any, { id }: any, context: any) => Promise<boolean>;
        linkLogbookEntryToGoal: (_: any, { entryId, goalId }: any, context: any) => Promise<{
            id: string;
            user: any;
            title: any;
            description: any;
            targetDate: string;
            progress: number;
            milestones: any;
            status: any;
            linkedEntryIds: any;
            linkedEntries: any[];
            createdAt: string;
            updatedAt: string;
            completedAt: string;
        }>;
        unlinkLogbookEntryFromGoal: (_: any, { entryId, goalId }: any, context: any) => Promise<{
            id: string;
            user: any;
            title: any;
            description: any;
            targetDate: string;
            progress: number;
            milestones: any;
            status: any;
            linkedEntryIds: any;
            linkedEntries: any[];
            createdAt: string;
            updatedAt: string;
            completedAt: string;
        }>;
    };
    LogbookEntry: {
        goals: (parent: any, _: any, context: any) => Promise<any>;
        session: (parent: any, _: any, context: any) => Promise<{
            id: any;
            user: any;
            instrument: any;
            sheetMusic: any;
            sessionType: any;
            startedAt: string;
            completedAt: string;
            pausedDuration: number;
            accuracy: number;
            notesAttempted: number;
            notesCorrect: number;
            logs: any[];
        }>;
    };
    Goal: {
        linkedEntries: (parent: any, _: any, context: any) => Promise<any>;
    };
};
//# sourceMappingURL=logbook.d.ts.map