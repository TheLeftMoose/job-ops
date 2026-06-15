import type { CompanyFacts } from "@shared/types";

export interface CompanyInvestigationInput {
  employer: string;
  employerUrl?: string | null;
  requestId: string;
  signal?: AbortSignal;
}

export type CompanyInvestigationProviderResult =
  | { status: "found"; facts: CompanyFacts }
  | { status: "not_found" }
  | { status: "error"; errorCode: string };

export interface CompanyInvestigationProvider {
  /** Unique stable identifier, e.g. "dk-cvr" */
  id: string;
  /** ISO 3166-1 alpha-2 country code this provider is authoritative for */
  countryCode: string;
  /** Human-readable label shown in the UI */
  label: string;
  /**
   * Perform an investigation for the given employer.
   * Must be stateless; no module-level mutable state.
   * Errors must be caught internally and returned as `{ status: "error", errorCode }`.
   */
  investigate(
    input: CompanyInvestigationInput,
  ): Promise<CompanyInvestigationProviderResult>;
}
