export const practiceResolvers = {
    Query: {
        practiceSession: async (_parent, { id: _id }, _context) => {
            // TODO: Implement practice session fetching
            return null;
        },
        myPracticeSessions: async (_parent, { instrument: _instrument, offset: _offset = 0, limit: _limit = 20 }, _context) => {
            // TODO: Implement practice session listing
            return {
                edges: [],
                pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: false,
                    startCursor: null,
                    endCursor: null,
                },
                totalCount: 0,
            };
        },
    },
    Mutation: {
        startPracticeSession: async (_parent, { input: _input }, _context) => {
            // TODO: Implement practice session creation
            throw new Error('Not implemented');
        },
        pausePracticeSession: async (_parent, { sessionId: _sessionId }, _context) => {
            // TODO: Implement practice session pausing
            throw new Error('Not implemented');
        },
        resumePracticeSession: async (_parent, { sessionId: _sessionId }, _context) => {
            // TODO: Implement practice session resuming
            throw new Error('Not implemented');
        },
        completePracticeSession: async (_parent, { input: _input }, _context) => {
            // TODO: Implement practice session completion
            throw new Error('Not implemented');
        },
        createPracticeLog: async (_parent, { input: _input }, _context) => {
            // TODO: Implement practice log creation
            throw new Error('Not implemented');
        },
    },
    PracticeSession: {
        user: async (_parent, _args, _context) => {
            // TODO: Implement user fetching for practice session
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return null;
        },
        sheetMusic: async (_parent, _args, _context) => {
            // TODO: Implement sheet music fetching for practice session
            return null;
        },
        logs: async (_parent, _args, _context) => {
            // TODO: Implement logs fetching for practice session
            return [];
        },
    },
};
//# sourceMappingURL=practice.js.map