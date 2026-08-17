---
id: architecture-containers
title: Architecture - Containers
description: C4 container view for the JobOps web app, API, documentation, database, and private file storage.
sidebar_position: 3
---

import useBaseUrl from '@docusaurus/useBaseUrl';

## What it is

The container view shows the major executable, build, and persistence boundaries.

<div className="architecture-diagram architecture-diagram--wide">
  <a href={useBaseUrl('/img/architecture/jobops-containers.svg')} target="_blank" rel="noreferrer">
    <img src={useBaseUrl('/img/architecture/jobops-containers.svg')} alt="JobOps C4 containers" />
  </a>
</div>

Scroll horizontally or open the diagram in a new tab for the full-resolution view.

| Container | Responsibility |
| --- | --- |
| Web application | React/Vite browser UI for jobs, pipelines, Resume Studio, application tracking, settings, and administration |
| Orchestrator API | Node.js/Express process that serves APIs and assets, coordinates workflows, and invokes integrations |
| Documentation site | Docusaurus static content built separately and served below `/docs` |
| Application database | SQLite data accessed through scoped Drizzle repositories |
| Private file storage | Tenant/user-scoped PDFs, resume assets, job documents, backups, cookies, and extractor state |

## Why it exists

The source repository contains many workspaces and modules, but the normal Docker deployment is intentionally consolidated:

- one application container
- one SQLite database file in the mounted data directory
- one mounted private-data directory
- browser-delivered web and documentation assets

Extractor and provider packages are plugins loaded by the orchestrator process, not independently deployed services.

## How to use it

Use this view when:

- changing Docker or deployment packaging
- deciding whether a feature needs a new process
- reviewing data persistence and backup coverage
- evaluating horizontal scaling constraints
- tracing browser, API, database, and file-storage communication

The current architecture relies on local persistent storage. Running multiple orchestrator replicas requires a deliberate shared database, shared file storage, queue, and locking design rather than simply adding replicas.

## Common problems

### Every npm workspace is modeled as a container

An npm workspace is a source/package boundary. It is a C4 container only when it is independently executable, deployable, or a distinct data store.

### SQLite is shown outside JobOps

SQLite is an internal application container. It is persisted through the deployment's data volume.

### Documentation is assumed to use a separate production server

Docusaurus builds static files that are copied into the production image and served by the JobOps server.

## Related pages

- [Application Architecture](/docs/next/reference/application-architecture)
- [System Context](/docs/next/reference/architecture-system-context)
- [Backend Components](/docs/next/reference/architecture-backend-components)
- [Self-Hosting](/docs/next/getting-started/self-hosting)
