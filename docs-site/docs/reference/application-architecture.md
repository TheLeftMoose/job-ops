---
id: application-architecture
title: Application Architecture
description: C4 architecture overview and navigation for the full JobOps application.
sidebar_position: 1
---

## What it is

This section documents the complete JobOps application using the C4 model.

The diagrams are generated from one Structurizr DSL workspace:

```text
docs-site/diagrams/architecture/workspace.dsl
```

The model provides five complementary views:

1. [System Context](/docs/next/reference/architecture-system-context) shows JobOps, its users, and external systems.
2. [Containers](/docs/next/reference/architecture-containers) shows the major deployable and persistent parts of JobOps.
3. [Backend Components](/docs/next/reference/architecture-backend-components) shows the major responsibilities inside the orchestrator API.
4. [CV Generation Flow](/docs/next/reference/architecture-generation-flow) shows the main runtime interactions for tailoring and producing a resume artifact.
5. [Deployment](/docs/next/reference/architecture-deployment) shows the processes, binaries, and volumes inside the standard Docker deployment.

## Why it exists

JobOps spans job-source integrations, AI generation, resume rendering, application tracking, email ingestion, multi-tenant storage, and observability. A shared model prevents feature documentation from describing those boundaries differently.

The C4 model is intended to answer:

- What is inside or outside JobOps?
- Which parts are independently built, served, or persisted?
- Where do extractors, AI providers, Gmail, and Reactive Resume connect?
- Which backend responsibility should own a new feature?
- Which relationships cross a tenant, network, or storage boundary?

## How to use it

Start at the system context and move inward only when more detail is required.

| Question | Best view |
| --- | --- |
| What is inside JobOps, and what is external? | System context |
| What are the main executable and persistence boundaries? | Containers |
| Which backend responsibility should own a change? | Backend components |
| What happens when a CV is generated? | CV generation flow |
| Which processes, binaries, and volumes exist at runtime? | Deployment |

The model is intentionally representative rather than an inventory of every source module, route, table, or third-party package. Add detail only when it clarifies an ownership, communication, persistence, trust, or deployment boundary.

When the architecture changes:

1. Update `docs-site/diagrams/architecture/workspace.dsl`.
2. Run:

   ```bash
   npm run architecture:generate
   ```

3. Review the generated SVG files under `docs-site/static/img/architecture`.
4. Update the explanatory page when a responsibility or boundary changes.
5. Build the docs with `npm run docs:build`.

Java 17 or newer is required to regenerate diagrams. The first generation run downloads pinned official Structurizr CLI and PlantUML releases into the ignored `.cache/architecture-tools` directory.

## Common problems

### The SVG and DSL disagree

Regenerate the diagrams and commit the updated SVG files with the DSL change.

### A module is missing from the container diagram

Extractor packages and most service modules run inside the orchestrator API process. Show them as components rather than separate containers unless deployment changes.

### A runtime binary is shown as an external system

Logical and deployment views answer different questions. For example, AI providers form one logical integration boundary, while Codex, Claude, or Gemini CLI processes may run inside the application container. Use the deployment view to show their physical location.

### The diagram becomes unreadable

Keep the system context and container views broad. Add a focused component or dynamic view instead of putting implementation classes into a high-level diagram.

## Related pages

- [System Context](/docs/next/reference/architecture-system-context)
- [Containers](/docs/next/reference/architecture-containers)
- [Backend Components](/docs/next/reference/architecture-backend-components)
- [CV Generation Flow](/docs/next/reference/architecture-generation-flow)
- [Deployment](/docs/next/reference/architecture-deployment)
- [Generation Architecture Overview](/docs/next/reference/generation-architecture)
- [Self-Hosting](/docs/next/getting-started/self-hosting)
