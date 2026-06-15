import { logger } from "@infra/logger";
import { sanitizeUnknown } from "@infra/sanitize";
import * as repo from "@server/repositories/company-investigations";
import {
  getCompanyInvestigationProvider,
  getCompanyInvestigationProviders,
} from "./providers/registry";

const serviceLogger = logger.child({ service: "company-investigation" });

const INVESTIGATION_TIMEOUT_MS = 15_000;

export interface RunInvestigationInput {
  companyProfileId: string;
  requestId: string;
  /** If empty, all registered providers are used */
  providerIds?: string[];
}

export interface RunInvestigationResult {
  investigationId: string;
  status: "complete" | "failed";
  errorCode?: string;
}

/**
 * Run a company investigation synchronously (awaits all providers).
 * Uses a per-investigation AbortController with a 15-second timeout.
 * Provider errors are sanitized and stored as `errorCode` only — never raw upstream messages.
 */
export async function runInvestigation(
  input: RunInvestigationInput,
): Promise<RunInvestigationResult> {
  const { companyProfileId, requestId } = input;

  const childLogger = serviceLogger.child({ requestId, companyProfileId });

  const profile = await repo.getCompanyProfile(companyProfileId);
  if (!profile) {
    throw new Error(`Company profile not found: ${companyProfileId}`);
  }

  const allProviders = getCompanyInvestigationProviders();
  const selectedProviders =
    input.providerIds && input.providerIds.length > 0
      ? input.providerIds
          .map((id) => getCompanyInvestigationProvider(id))
          .filter((p): p is NonNullable<typeof p> => p != null)
      : allProviders;

  if (selectedProviders.length === 0) {
    childLogger.warn("No providers available for investigation");
    const inv = await repo.createInvestigation({
      companyProfileId,
      providerIds: [],
      requestId,
    });
    await repo.updateInvestigation(inv.id, {
      status: "skipped",
      completedAt: new Date().toISOString(),
    });
    return {
      investigationId: inv.id,
      status: "failed",
      errorCode: "NO_PROVIDERS",
    };
  }

  const providerIds = selectedProviders.map((p) => p.id);
  const inv = await repo.createInvestigation({
    companyProfileId,
    providerIds,
    requestId,
  });

  await repo.updateInvestigation(inv.id, { status: "running" });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    INVESTIGATION_TIMEOUT_MS,
  );

  let lastFacts = profile.facts;
  let finalErrorCode: string | null = null;

  try {
    for (const provider of selectedProviders) {
      const providerLogger = childLogger.child({ providerId: provider.id });
      try {
        const result = await provider.investigate({
          employer: profile.employer,
          requestId,
          signal: controller.signal,
        });

        if (result.status === "found") {
          lastFacts = result.facts;
          providerLogger.info("Provider found company facts");
        } else if (result.status === "not_found") {
          providerLogger.info("Provider: company not found");
          finalErrorCode = finalErrorCode ?? "NOT_FOUND";
        } else {
          providerLogger.warn("Provider returned error", {
            errorCode: result.errorCode,
          });
          finalErrorCode = result.errorCode;
        }
      } catch (err) {
        providerLogger.error("Provider threw unexpected error", {
          error: sanitizeUnknown(err),
        });
        finalErrorCode = "INTERNAL_ERROR";
      }
    }

    if (lastFacts && lastFacts !== profile.facts) {
      await repo.updateCompanyProfileFacts(companyProfileId, lastFacts);
    }

    const succeeded = lastFacts != null && lastFacts !== profile.facts;
    const finalStatus = succeeded ? "complete" : "failed";

    await repo.updateInvestigation(inv.id, {
      status: finalStatus,
      completedAt: new Date().toISOString(),
      errorCode:
        finalStatus === "failed" ? (finalErrorCode ?? "UNKNOWN") : null,
    });

    childLogger.info("Investigation finished", { status: finalStatus });
    return {
      investigationId: inv.id,
      status: finalStatus,
      ...(finalStatus === "failed" && finalErrorCode
        ? { errorCode: finalErrorCode }
        : {}),
    };
  } finally {
    clearTimeout(timeout);
  }
}
