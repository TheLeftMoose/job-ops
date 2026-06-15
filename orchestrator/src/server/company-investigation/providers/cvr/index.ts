import { logger } from "@infra/logger";
import { sanitizeUnknown } from "@infra/sanitize";
import type { CompanyFacts } from "@shared/types";
import type {
  CompanyInvestigationInput,
  CompanyInvestigationProvider,
  CompanyInvestigationProviderResult,
} from "../types";

// CVR API response types (cvrapi.dk)
interface CvrApiCompany {
  name?: string;
  vat?: number;
  address?: string;
  zipcode?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  employees?: string; // e.g. "10-19"
  industrycode?: string;
  industrydesc?: string;
  startdate?: string;
  type?: string;
  companydesc?: string;
  owners?: Array<{ name?: string }>;
  productionunits?: Array<{
    p_no?: number;
    employees?: string;
    address?: string;
    zipcode?: string;
    city?: string;
    country?: string;
  }>;
}

interface CvrApiResponse {
  name?: string;
  vat?: number;
  address?: string;
  zipcode?: string;
  city?: string;
  country?: string;
  employees?: string;
  industrycode?: string;
  industrydesc?: string;
  startdate?: string;
  type?: string;
  companydesc?: string;
  owners?: CvrApiCompany["owners"];
  productionunits?: CvrApiCompany["productionunits"];
  error?: string;
  message?: string;
}

const cvrLogger = logger.child({ provider: "dk-cvr" });

function parseEmployeeRange(raw: string | undefined): number | null {
  if (!raw) return null;
  // Format: "10-19", "20-49", "1000-1999", "0", etc.
  const parts = raw.split("-");
  if (parts.length === 2) {
    const low = parseInt(parts[0] ?? "", 10);
    const high = parseInt(parts[1] ?? "", 10);
    if (!Number.isNaN(low) && !Number.isNaN(high)) {
      return Math.round((low + high) / 2);
    }
    if (!Number.isNaN(low)) return low;
  }
  if (parts.length === 1) {
    const n = parseInt(parts[0] ?? "", 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function buildFacts(data: CvrApiResponse): CompanyFacts {
  return {
    officialName: data.name ?? null,
    registrationNumbers: data.vat
      ? [{ countryCode: "DK", system: "CVR", value: String(data.vat) }]
      : [],
    country: "DK",
    website: null,
    employeeCountTotal: parseEmployeeRange(data.employees),
    employeesAtSite: null,
    industry: data.industrydesc ?? null,
    foundedDate: data.startdate ?? null,
    description: data.companydesc ?? null,
    confidence: "high",
    attributedTo: "dk-cvr",
  };
}

export const cvrProvider: CompanyInvestigationProvider = {
  id: "dk-cvr",
  countryCode: "DK",
  label: "Danish Central Business Register (CVR)",

  async investigate(
    input: CompanyInvestigationInput,
  ): Promise<CompanyInvestigationProviderResult> {
    const { employer, requestId, signal } = input;
    const childLogger = cvrLogger.child({ requestId });

    const params = new URLSearchParams({
      search: employer,
      country: "dk",
      format: "json",
    });

    const url = `https://cvrapi.dk/api?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(url, {
        signal,
        headers: {
          "User-Agent": "job-ops/1.0 (company investigation)",
        },
      });
    } catch (err) {
      childLogger.warn("CVR API fetch failed", {
        employer,
        error: sanitizeUnknown(err),
      });
      if (err instanceof Error && err.name === "AbortError") {
        return { status: "error", errorCode: "REQUEST_TIMEOUT" };
      }
      return { status: "error", errorCode: "UPSTREAM_ERROR" };
    }

    if (response.status === 429) {
      childLogger.warn("CVR API rate limited", { employer });
      return { status: "error", errorCode: "RATE_LIMITED" };
    }

    if (response.status === 404) {
      return { status: "not_found" };
    }

    if (!response.ok) {
      childLogger.warn("CVR API returned unexpected status", {
        employer,
        status: response.status,
      });
      return { status: "error", errorCode: "UPSTREAM_ERROR" };
    }

    let data: CvrApiResponse;
    try {
      data = (await response.json()) as CvrApiResponse;
    } catch (err) {
      childLogger.warn("CVR API response parse failed", {
        employer,
        error: sanitizeUnknown(err),
      });
      return { status: "error", errorCode: "UPSTREAM_ERROR" };
    }

    if (data.error) {
      const errLower = (data.error as string).toLowerCase();
      if (errLower === "notfound" || errLower === "no_result") {
        return { status: "not_found" };
      }
      childLogger.warn("CVR API returned error field", {
        employer,
        errorCode: data.error,
      });
      return { status: "error", errorCode: "UPSTREAM_ERROR" };
    }

    if (!data.name && !data.vat) {
      return { status: "not_found" };
    }

    const facts: CompanyFacts = buildFacts(data);
    childLogger.info("CVR lookup succeeded", {
      employer,
      cvr: data.vat,
      officialName: facts.officialName,
    });

    return { status: "found", facts };
  },
};
