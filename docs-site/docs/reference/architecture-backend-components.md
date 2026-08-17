---
id: architecture-backend-components
title: Architecture - Backend Components
description: C4 component view of the main responsibilities inside the JobOps orchestrator API.
sidebar_position: 4
---

import useBaseUrl from '@docusaurus/useBaseUrl';

## What it is

The backend component view groups the main responsibilities inside the Node.js orchestrator process.

<div className="architecture-diagram architecture-diagram--extra-wide">
  <a href={useBaseUrl('/img/architecture/jobops-backend-components.svg')} target="_blank" rel="noreferrer">
    <img src={useBaseUrl('/img/architecture/jobops-backend-components.svg')} alt="JobOps backend C4 components" />
  </a>
</div>

Scroll horizontally or open the diagram in a new tab for the full-resolution view.

| Component | Responsibility |
| --- | --- |
| API routes and transport | Express routing, validation, standard responses, SSE, and static delivery |
| Authentication and tenancy | JWTs, workspaces, request context, quotas, and private-data scoping |
| Pipeline orchestrator | Discovery, import, scoring, selection, tailoring, PDF generation, progress, cancellation, and notifications |
| Extractor registry and adapters | Manifest discovery, source execution, health checks, and normalization |
| AI generation services | Scoring, briefs, summary/skills tailoring, experience role selection and bullet generation, project selection, Ghostwriter, prompt templates, and structured-output handling |
| Resume and artifact services | Resume Studio, composition, rendering, uploads, tracer links, and PDF freshness |
| Application tracking services | Stages, tasks, notes, interviews, outcomes, and timelines |
| Post-application ingestion | Gmail OAuth/sync, AI routing, review, and automatic stage updates |
| Repositories and scoped storage | Database access, settings, files, assets, and backups |
| Queues and scheduled workers | PDF regeneration, email sync, backups, cleanup, sponsor refresh, and replay |
| Logging, analytics, and telemetry | Correlation-aware logs, product analytics, and optional Azure Monitor export |

## Why it exists

This view provides a placement guide for new backend work. It keeps API transport, domain orchestration, integration adapters, and persistence from becoming one undifferentiated service layer.

## How to use it

For a new feature:

1. Put request parsing and API response mapping in API routes.
2. Put workflow coordination in the relevant domain service or orchestrator.
3. Access external systems through an adapter or provider boundary.
4. Access SQLite and private files through scoped repositories/storage helpers.
5. Restore tenant/user context before background work reads settings or data.
6. Add observability through the shared logger and request context.

New generated artifact types should follow [Extending Generation](/docs/next/reference/extending-generation) rather than being added directly to PDF orchestration.

## Common problems

### API routes contain generation or integration logic

Routes should validate, authorize, invoke services, and map errors. Keep prompt construction, external calls, and persistence workflows in services.

### Extractor-specific behavior leaks into the pipeline

Source-specific execution belongs in extractor workspaces and manifests. The pipeline should operate on normalized jobs.

### Background state is global

Pipeline state, queues, caches, and dedupe keys must include the active tenant/user scope when they hold private data.

### Files are accessed with ad hoc paths

Use scoped storage helpers so hosted user isolation and local tenant isolation remain consistent.

## Related pages

- [Application Architecture](/docs/next/reference/application-architecture)
- [System Context](/docs/next/reference/architecture-system-context)
- [Containers](/docs/next/reference/architecture-containers)
- [Generation Architecture Overview](/docs/next/reference/generation-architecture)
- [Extending Generation](/docs/next/reference/extending-generation)
