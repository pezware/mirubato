import type { D1Database } from '@cloudflare/workers-types';
export declare class MockD1Database implements Partial<D1Database> {
    private data;
    prepare(query: string): {
        bind(...values: any[]): /*elided*/ any;
        first(colName?: string): Promise<any>;
        all(): Promise<{
            results: any[];
            success: true;
            meta: {
                duration: number;
                size_after: number;
                rows_read: number;
                rows_written: number;
                changed_db: boolean;
                last_row_id: number;
                changes: number;
            };
        }>;
        run(): Promise<{
            success: true;
            results: any[];
            meta: {
                changes: number;
                last_row_id: number;
                duration: number;
                size_after: number;
                rows_read: number;
                rows_written: number;
                changed_db: boolean;
            };
        }>;
        raw(): Promise<[string[], ...any[]]>;
    };
    batch(statements: any[]): Promise<any[]>;
    exec(_query: string): Promise<{
        count: number;
        duration: number;
    }>;
    private extractTableName;
    setMockData(tableName: string, data: any[]): void;
    clearMockData(): void;
}
export declare function createMockDB(): D1Database;
//# sourceMappingURL=db.d.ts.map