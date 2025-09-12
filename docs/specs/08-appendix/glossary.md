---
Spec-ID: SPEC-APP-003
Title: Technical Glossary
Status: ✅ Active
Owner: @pezware
Last-Reviewed: 2025-09-11
Version: 1.7.6
---

# Technical Glossary

Status: ✅ Active (expand as needed)

## What

Definitions of technical terms, acronyms, and domain-specific concepts used throughout Mirubato documentation.

## Why

- Ensure consistent terminology usage
- Onboard new developers quickly
- Clarify domain-specific concepts
- Reduce ambiguity in specifications

## How

Alphabetical listing of terms with concise definitions and context.

## Cloudflare Terms

**D1**: Cloudflare's edge SQL database service (SQLite-compatible) used for persistent data storage.

**Durable Objects**: Cloudflare primitive providing single-threaded, stateful coordination with strong consistency guarantees. Used for WebSocket connections.

**KV (Key-Value)**: Cloudflare's globally distributed key-value storage for caching and non-transactional data.

**R2**: Cloudflare's S3-compatible object storage used for PDFs, images, and large assets.

**Workers**: Cloudflare's edge compute platform running JavaScript/TypeScript in V8 isolates.

**Wrangler**: CLI tool for developing and deploying Cloudflare Workers.

## Mirubato Features

**Logbook**: Core feature for tracking practice sessions, including duration, pieces, mood, and notes.

**Repertoire**: User's collection of pieces being learned or mastered, with status tracking and goals.

**Scorebook**: Sheet music library system with PDF storage, AI metadata extraction, and organization features.

**Practice Timer**: Real-time session tracking tool with automatic logging capabilities.

**Goals**: User-defined practice objectives with progress tracking and analytics.

## Technical Concepts

**Edge Computing**: Running code close to users in distributed locations rather than centralized servers.

**Idempotency Key**: Client-generated unique identifier ensuring safe retry of write operations without duplication.

**JWT (JSON Web Token)**: Stateless authentication token used for API authorization.

**Last-Write-Wins (LWW)**: Conflict resolution strategy where the most recent timestamp determines the winning value.

**Magic Link**: Passwordless authentication method using email-delivered temporary tokens.

**Optimistic UI**: Updating interface immediately before server confirmation for better perceived performance.

**Service Worker**: Browser API for offline functionality, caching, and background sync.

**WebSocket**: Full-duplex communication protocol for real-time bidirectional data transfer.

## Music Domain Terms

**Composer Canonicalization**: Standardizing composer names across different sources and languages.

**IMSLP**: International Music Score Library Project - largest public domain sheet music repository.

**Opus**: Musical work numbering system used to catalog compositions.

**Sheet Music**: Written musical notation, typically in PDF format in Mirubato.

**Sight-Reading**: Playing music from written notation without prior practice.

## Data & Sync

**Entity Type**: Classification of synced data (e.g., logbook_entry, goal, user_preferences).

**Sync Token**: Timestamp-based marker for tracking synchronization state between client and server.

**Sync Queue**: Client-side buffer for pending changes when offline.

**Conflict Resolution**: Strategy for handling concurrent edits to the same data.

**Checksum**: Hash value used to detect data changes and prevent duplicates.

## Performance Terms

**Bundle Size**: Total JavaScript/CSS payload size after build optimization.

**Code Splitting**: Breaking application into smaller chunks loaded on demand.

**Core Web Vitals**: Google's metrics for user experience (LCP, FID, CLS).

**Lazy Loading**: Deferring resource loading until needed.

**Tree Shaking**: Removing unused code during build process.

## Development Terms

**Monorepo**: Single repository containing multiple related projects/services.

**pnpm**: Fast, disk-efficient package manager used by Mirubato.

**Workspace**: Independent package within the monorepo structure.

**Hot Module Replacement (HMR)**: Development feature for instant code updates without refresh.

**Migrations**: Versioned database schema changes applied sequentially.

## Acronyms

**AI**: Artificial Intelligence
**API**: Application Programming Interface
**CDN**: Content Delivery Network
**CORS**: Cross-Origin Resource Sharing
**CRUD**: Create, Read, Update, Delete
**DX**: Developer Experience
**GDPR**: General Data Protection Regulation
**HMR**: Hot Module Replacement
**HTTP**: Hypertext Transfer Protocol
**JSON**: JavaScript Object Notation
**JWT**: JSON Web Token
**LLM**: Large Language Model
**OCR**: Optical Character Recognition
**PDF**: Portable Document Format
**PII**: Personally Identifiable Information
**PWA**: Progressive Web App
**REST**: Representational State Transfer
**SLA**: Service Level Agreement
**SPA**: Single Page Application
**SQL**: Structured Query Language
**SSO**: Single Sign-On
**TTL**: Time To Live
**UI/UX**: User Interface/User Experience
**URL**: Uniform Resource Locator
**UUID**: Universally Unique Identifier
**WebSocket**: Web Socket Protocol
**XSS**: Cross-Site Scripting

## Related Documentation

- [Architecture Overview](../01-architecture/overview.md) - System design context
- [Database Schema](../02-database/schema.md) - Data model definitions
- [API Specification](../03-api/rest-api.md) - Endpoint documentation

---

Last updated: 2025-09-11 | Version 1.7.6
