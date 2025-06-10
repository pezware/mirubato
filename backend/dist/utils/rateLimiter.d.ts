import type { DurableObjectNamespace } from '@cloudflare/workers-types';
export interface RateLimiter {
    checkLimit(): Promise<boolean>;
}
export declare function createRateLimiter(_namespace: DurableObjectNamespace, _identifier?: string): RateLimiter;
export declare class RateLimiterDurableObject {
    private requests;
    private readonly windowMs;
    private readonly maxRequests;
    fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=rateLimiter.d.ts.map