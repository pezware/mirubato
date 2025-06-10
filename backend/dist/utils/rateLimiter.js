export function createRateLimiter(_namespace, _identifier) {
    // For now, return a simple implementation that always allows
    // In production, this would interact with a Durable Object
    return {
        async checkLimit() {
            // TODO: Implement actual rate limiting with Durable Objects
            return true;
        },
    };
}
// Durable Object class for rate limiting (to be deployed separately)
export class RateLimiterDurableObject {
    requests = new Map();
    windowMs = 60000; // 1 minute
    maxRequests = 120; // 120 requests per minute for authenticated users
    async fetch(request) {
        const url = new URL(request.url);
        const identifier = url.searchParams.get('id') || 'anonymous';
        const now = Date.now();
        const requests = this.requests.get(identifier) || [];
        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < this.windowMs);
        if (validRequests.length >= this.maxRequests) {
            return new Response(JSON.stringify({ allowed: false }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        validRequests.push(now);
        this.requests.set(identifier, validRequests);
        return new Response(JSON.stringify({ allowed: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
//# sourceMappingURL=rateLimiter.js.map