---
id: architecture-generation-flow
title: Architecture - CV Generation Flow
description: C4 dynamic view of resume tailoring, rendering, scoped persistence, and finalization.
sidebar_position: 2
---

import useBaseUrl from '@docusaurus/useBaseUrl';

## What it is

This dynamic view connects the structural C4 model to the end-to-end CV generation workflow.

<div className="architecture-diagram architecture-diagram--extra-wide">
  <a href={useBaseUrl('/img/architecture/jobops-cv-generation.svg')} target="_blank" rel="noreferrer">
    <img src={useBaseUrl('/img/architecture/jobops-cv-generation.svg')} alt="JobOps CV generation dynamic flow" />
  </a>
</div>

Scroll horizontally or open the diagram in a new tab for the full-resolution view.

The numbered relationships show the main collaboration path:

1. An API route starts tailoring or PDF generation.
2. The pipeline loads the scoped job and records workflow state.
3. AI services assemble minimized context and request structured summary/skills tailoring, optional experience role selection, and project selection.
4. The experience service validates source role IDs and persists 3-5 bullets per selected role.
5. Resume services compose the selected resume source and invoke the configured renderer.
6. Repositories commit tailoring and artifact metadata to SQLite and write the PDF to scoped file storage.

The diagram shows responsibility boundaries, not every internal function call or response message.

## Why it exists

The context, container, component, and deployment views are structural. They explain where responsibilities live, but not how those responsibilities collaborate during one important use case.

This view makes it easier to identify where a new generation type should reuse existing behavior and where resume-specific behavior should remain isolated.

## How to use it

Use this view together with [CV Generation Architecture](/docs/next/reference/cv-generation-architecture):

- use the diagram to locate ownership and integration boundaries
- use the detailed page for status transitions, fingerprints, conflict handling, storage paths, and code locations
- use [Extending Generation](/docs/next/reference/extending-generation) before introducing a new artifact lifecycle

The Reactive Resume interaction is optional. Local LaTeX and Typst rendering stays inside resume services and appears as runtime infrastructure in the deployment view. The standard Docker image supplies both binaries; native development must install them or configure their executable paths.

## Common problems

### The arrows are read as synchronous calls only

The view summarizes ordered collaboration. Some work can run through queues or child processes, and analytics are intentionally omitted.

### The database appears to store the PDF

SQLite stores artifact metadata. The PDF bytes are written to private file storage.

### Every generator is added to this resume flow

This flow documents current CV behavior. Independent outputs such as cover letters or interview packs should use a generic artifact lifecycle rather than extending PDF orchestration.

## Related pages

- [Application Architecture](/docs/next/reference/application-architecture)
- [Backend Components](/docs/next/reference/architecture-backend-components)
- [Deployment](/docs/next/reference/architecture-deployment)
- [CV Generation Architecture](/docs/next/reference/cv-generation-architecture)
- [Extending Generation](/docs/next/reference/extending-generation)
