# Documentation Updates Required

## Overview
This document identifies all outdated references that need updating based on the recent migration from Cloudflare Pages to Cloudflare Workers and the domain change from rubato.app to mirubato.com. This document has been superseded by the actual updates made to the documentation.

## Files Requiring Updates

### 1. README.md

#### Line 4 - Project Overview
**Current:**
```
An open-source progressive web application focused on sight-reading practice for classical guitar and piano, featuring email authentication, deployable to Cloudflare Pages with Cloudflare Workers for backend functionality.
```

**Should be:**
```
An open-source progressive web application focused on sight-reading practice for classical guitar and piano, featuring email authentication, deployable as a full-stack application on Cloudflare Workers.
```

#### Lines 327-340 - Cloudflare Pages Setup Section
**Current:** Entire section about "Cloudflare Pages Setup"

**Should be:** Replace with "Cloudflare Workers Setup" section focusing on Workers deployment

#### Lines 862, 288 (multiple occurrences) - API URLs
**Current:** `https://api.rubato.app`

**Should be:** `https://api.mirubato.com`

### 2. DEVELOPMENT_GUIDELINES.md

#### Package Manager Consistency
- Lines 1652, 1708, 1730, 1734: Updated `npm` references for consistency

#### Line 1580 - API URL
**Current:** `https://api.rubato.app`

**Should be:** `https://api.mirubato.com`

### 3. INFRASTRUCTURE.md

#### Line 116 - GitHub Actions Workflow
**Current:**
```yaml
command: pages deploy dist --project-name=rubato-staging
```

**Should be:**
```yaml
command: deploy --name=rubato-staging
```

#### Lines 165-188 - Cloudflare Pages Configuration
**Current:** Entire section about "Cloudflare Pages Configuration"

**Should be:** Replace with "Cloudflare Workers Configuration" section

#### Line 288 - Environment Variable
**Current:** `VITE_API_BASE_URL=https://api.rubato.app`

**Should be:** `VITE_API_BASE_URL=https://api.mirubato.com`

#### Line 574 - Headers Configuration Comment
**Current:** `// Headers configuration for Cloudflare Pages`

**Should be:** `// Headers configuration for Cloudflare Workers`

#### Lines 662-697 - Deployment Architecture
**Current:** References to Pages deployment and rubato.app domain

**Should be:** Update to Workers deployment and mirubato.com domain

### 4. CLAUDE.md

#### Line 15 - Deployment
**Current:** `Deployment: Cloudflare Pages with automated CI/CD`

**Should be:** `Deployment: Cloudflare Workers with automated CI/CD`

### 5. ROADMAP.md

#### Line 28 - Authentication System
**Current:** `Set up Cloudflare Workers for backend API`

**Should be:** `Set up Cloudflare Workers for full-stack application`

## Additional Considerations

1. **Wrangler Configuration**: All wrangler.toml examples should be updated to reflect Workers deployment instead of Pages
2. **Build Commands**: Update any build/deploy commands from Pages-specific to Workers-specific
3. **Domain References**: All references to rubato.app should be updated to mirubato.com
4. **Architecture Diagrams**: Any diagrams showing Pages + Workers should be updated to show Workers-only architecture

## Implementation Priority

1. **High Priority**: Update deployment instructions and domain references
2. **Medium Priority**: Update build commands and configuration files
3. **Low Priority**: Update conceptual references and examples

## Testing After Updates

After making these updates, verify:
- All deployment instructions work with the new Workers setup
- All domain references point to mirubato.com
- Build and deploy commands execute successfully
- Documentation is internally consistent