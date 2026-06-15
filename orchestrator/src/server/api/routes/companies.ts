import { badRequest, forbidden, notFound } from "@infra/errors";
import { asyncRoute, fail, ok } from "@infra/http";
import { logger } from "@infra/logger";
import { getRequestId } from "@infra/request-context";
import { runInvestigation } from "@server/company-investigation/service";
import * as repo from "@server/repositories/company-investigations";
import { getEffectiveSettings } from "@server/services/settings";
import type {
  CompanyProfileDetailResponse,
  CompanyProfileListResponse,
  TriggerInvestigationResponse,
  UpdateCompanyWatchlistsInput,
  UpsertCompanyProfileInput,
} from "@shared/types";
import { type Request, type Response, Router } from "express";
import { z } from "zod";

export const companiesRouter = Router();

const routeLogger = logger.child({ route: "companies" });

const upsertProfileSchema = z.object({
  employer: z.string().trim().min(1).max(500),
  normalizedName: z.string().trim().min(1).max(500).nullable().optional(),
});

const updateWatchlistsSchema = z.object({
  watchlistSourceIds: z.array(z.string().trim().min(1).max(500)).max(50),
});

// GET /api/companies
companiesRouter.get(
  "/",
  asyncRoute(async (_req: Request, res: Response) => {
    const profiles = await repo.listCompanyProfiles();
    // Attach latest investigation to each profile for the list view
    const enriched = await Promise.all(
      profiles.map(async (profile) => {
        const latestInvestigation = await repo.getLatestInvestigationForProfile(
          profile.id,
        );
        return { ...profile, latestInvestigation };
      }),
    );
    const response: CompanyProfileListResponse = { profiles: enriched };
    ok(res, response);
  }),
);

// POST /api/companies — upsert a company profile
companiesRouter.post(
  "/",
  asyncRoute(async (req: Request, res: Response) => {
    const parsed = upsertProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, badRequest("Invalid request body", parsed.error.issues));
    }
    const input: UpsertCompanyProfileInput = parsed.data;
    const profile = await repo.upsertCompanyProfile(input);
    const latestInvestigation = await repo.getLatestInvestigationForProfile(
      profile.id,
    );
    ok(res, { ...profile, latestInvestigation }, 201);
  }),
);

// GET /api/companies/:id
companiesRouter.get(
  "/:id",
  asyncRoute(async (req: Request, res: Response) => {
    const profile = await repo.getCompanyProfile(req.params.id ?? "");
    if (!profile) {
      return fail(res, notFound("Company profile not found"));
    }
    const investigations = await repo.listInvestigationsForProfile(profile.id);
    const response: CompanyProfileDetailResponse = {
      profile: { ...profile, latestInvestigation: investigations[0] ?? null },
      investigations,
    };
    ok(res, response);
  }),
);

// POST /api/companies/:id/investigate
companiesRouter.post(
  "/:id/investigate",
  asyncRoute(async (req: Request, res: Response) => {
    const settings = await getEffectiveSettings();
    if (!settings.companyInvestigationEnabled.value) {
      return fail(
        res,
        forbidden("Company investigation is disabled. Enable it in Settings."),
      );
    }

    const profile = await repo.getCompanyProfile(req.params.id ?? "");
    if (!profile) {
      return fail(res, notFound("Company profile not found"));
    }

    const requestId = getRequestId() ?? "unknown";
    const providerIds =
      settings.companyInvestigationProviderIds.value.length > 0
        ? settings.companyInvestigationProviderIds.value
        : undefined;

    routeLogger.info("Triggering company investigation", {
      requestId,
      companyProfileId: profile.id,
      employer: profile.employer,
    });

    const result = await runInvestigation({
      companyProfileId: profile.id,
      requestId,
      providerIds,
    });

    const response: TriggerInvestigationResponse = {
      investigationId: result.investigationId,
      status: result.status,
    };
    ok(res, response);
  }),
);

// GET /api/companies/:id/watchlists
companiesRouter.get(
  "/:id/watchlists",
  asyncRoute(async (req: Request, res: Response) => {
    const profile = await repo.getCompanyProfile(req.params.id ?? "");
    if (!profile) {
      return fail(res, notFound("Company profile not found"));
    }
    ok(res, { watchlistSourceIds: profile.linkedWatchlistSourceIds });
  }),
);

// PUT /api/companies/:id/watchlists
companiesRouter.put(
  "/:id/watchlists",
  asyncRoute(async (req: Request, res: Response) => {
    const parsed = updateWatchlistsSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, badRequest("Invalid request body", parsed.error.issues));
    }
    const input: UpdateCompanyWatchlistsInput = parsed.data;

    const profile = await repo.getCompanyProfile(req.params.id ?? "");
    if (!profile) {
      return fail(res, notFound("Company profile not found"));
    }

    await repo.updateCompanyProfileWatchlists(
      profile.id,
      input.watchlistSourceIds,
    );
    ok(res, { watchlistSourceIds: input.watchlistSourceIds });
  }),
);
