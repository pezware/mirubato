# R2 Storage Cost Analysis: Public vs Private

## Assumptions

- **Total PDFs**: 10,000
- **Average PDF size**: 2MB (typical sheet music PDF)
- **Total storage**: 20GB
- **Monthly views per PDF**: 50 (average)
- **Total monthly requests**: 500,000
- **Cloudflare pricing as of 2024**

## Scenario 1: Private R2 with Worker (Current Setup)

### R2 Costs

- **Storage**: $0.015/GB/month
  - 20GB × $0.015 = **$0.30/month**
- **Class A operations** (writes/lists): Negligible for reads
- **Class B operations** (reads): $0.36/million
  - 500,000 reads × $0.36/1M = **$0.18/month**

### Worker Costs

- **Requests**: $0.15/million requests (after 10M free)
  - 500,000 requests = **$0/month** (within free tier)
- **Compute time**: 30ms average per request
  - 500,000 × 0.03s = 15,000 CPU seconds
  - Well within free tier (100,000 CPU-ms/day)

**Total Private R2: ~$0.48/month**

## Scenario 2: Public R2 (Direct Access)

### R2 Costs

- **Storage**: $0.015/GB/month
  - 20GB × $0.015 = **$0.30/month**
- **Class B operations**: $0.36/million
  - 500,000 reads × $0.36/1M = **$0.18/month**

### Bandwidth Costs (Public R2)

- **Egress**: First 10TB/month free
- At 2MB per PDF × 500,000 views = 1TB/month
- **$0/month** (within free tier)

**Total Public R2: ~$0.48/month**

## Cost Comparison

| Scenario            | Storage | Operations | Worker | Bandwidth | Total     |
| ------------------- | ------- | ---------- | ------ | --------- | --------- |
| Private R2 + Worker | $0.30   | $0.18      | $0     | $0        | **$0.48** |
| Public R2           | $0.30   | $0.18      | $0     | $0        | **$0.48** |

## Analysis

### At 10K PDFs (500K monthly views)

- **Cost difference**: Negligible ($0/month)
- Both scenarios stay within Cloudflare's generous free tiers

### Benefits of Public R2

1. **Performance**: Direct access, no worker latency (~200ms faster)
2. **Reliability**: No worker cold starts or execution limits
3. **Simplicity**: Less code to maintain
4. **Scalability**: No worker CPU limits
5. **Global edge caching**: Automatic via Cloudflare's network

### When costs would differ significantly

#### Scenario A: 100K PDFs, 5M monthly views

- Private R2: ~$2.28/month (hits worker request limits)
- Public R2: ~$1.98/month (no worker costs)

#### Scenario B: 1M PDFs, 50M monthly views

- Private R2: ~$25.48/month (significant worker costs)
- Public R2: ~$19.98/month (saves ~$5.50/month)

#### Break-even point

- Worker costs kick in after 10M requests/month
- At your current scale, you're well below this threshold

## Recommendation

**Switch to Public R2** for sheet music PDFs because:

1. **No cost difference** at current scale
2. **Better performance** (200-500ms faster per request)
3. **Simpler architecture** (no worker middleware)
4. **Future cost savings** as you scale
5. **No security concerns** (public domain sheet music)

### Implementation Steps

1. Create public R2 bucket
2. Set CORS policy for your domains
3. Migrate existing PDFs
4. Update frontend to use direct R2 URLs
5. Keep worker endpoints for:
   - Import/upload functionality
   - AI metadata extraction
   - Database operations

### Security Considerations

- ✅ Public domain sheet music only
- ✅ No user data in PDFs
- ✅ Import process still authenticated
- ✅ Can implement signed URLs later if needed
