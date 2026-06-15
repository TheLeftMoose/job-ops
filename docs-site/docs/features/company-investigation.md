---
id: company-investigation
title: Company Investigation
description: Research companies before applying by fetching official registry data and enrichment details from pluggable providers.
sidebar_position: 15
---

# Company Investigation

## What it is

Company Investigation is a pipeline that fetches structured information about employers
directly from official public registries and enrichment sources. For each company
profile, the pipeline can retrieve:

- Official registered name and registration number(s)
- Country of registration
- Industry classification
- Total employee count
- Founded date
- Website / domain

Results are stored per company profile (scoped to your workspace) and displayed on a
dedicated **Companies** page alongside your job board.

The first supported provider is **Danish CVR** (Centrale Virksomhedsregister), which
returns authoritative data for companies registered in Denmark.

---

## Why it exists

Job listings rarely contain reliable, machine-readable company data. `employer` fields
are free-text, vary by posting site, and are often incomplete. Company Investigation
gives you a single place to build a verified fact sheet for each employer you are
considering, without leaving the app.

---

## How to use it

### 1. Enable the feature

Company Investigation is **disabled by default**. Go to **Settings → Company
Investigation** and toggle **Enable company investigation** on.

### 2. Choose a trigger mode

| Mode | Behaviour |
|---|---|
| **Manual** (default) | Investigation only runs when you click **Investigate** |
| **On import** | An investigation is automatically queued when a job is imported |

### 3. Open the Companies page

Click **Companies** in the left navigation (building icon). The page lists every company
profile that has been created for your workspace.

A profile is created automatically the first time a job for that employer is investigated,
or you can create one manually.

### 4. Run an investigation

Click **Investigate** on any row in the Companies list. The button triggers a
synchronous lookup (up to 15 seconds per provider). When it completes, the row shows:

- A status badge: `complete`, `failed`, or `not_found`
- Employee count and industry (if returned by the provider)
- A timestamp for the last investigation

### 5. View company details

Click any company name to open its detail page. Here you can see:

- **Company facts card** — name, registration numbers, website, industry, employee count,
  founded date, with confidence badges on inferred fields
- **Investigation history** — a table of all past investigation runs with status,
  timestamp, and which providers were used
- **Watchlist links** — attach one or more of your saved Watchlist sources so you can
  navigate directly from a company to the relevant job feed

### 6. Re-investigate

Click **Re-investigate** on the detail page to fetch fresh data from all active providers.

---

## Common problems

### "Investigation disabled" (403 error)

The feature is turned off. Go to **Settings → Company Investigation** and enable it.

### Company not found

The CVR provider searches by company name. If the name in the job posting does not match
the registered name (e.g. a trading name vs. legal name), the lookup returns `not_found`.
You can still view the company profile and try re-investigating after correcting the name.

### Rate limited

The Danish CVR API has request limits. If you see a `RATE_LIMITED` status, wait a few
minutes and re-investigate. The details of the rate-limit response are logged server-side
but not exposed in the UI.

### Provider errors

Upstream API errors are stored as a sanitized `errorCode` (e.g. `UPSTREAM_ERROR`). The
raw upstream response is never surfaced in the UI. Check the server logs for full details
if you are self-hosting.

### Investigation results look stale

Click **Re-investigate** to refresh. Future versions will support scheduled re-investigation.

---

## Related pages

- [Pipeline Run](/docs/features/pipeline-run) — how background jobs and runs work
- [Watchlist](/docs/features/watchlist) — saved job feeds that can be linked to a company
- [Settings](/docs/features/settings) — full settings reference including the Company
  Investigation section
