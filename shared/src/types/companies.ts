export type CompanyInvestigationStatus =
  | "pending"
  | "running"
  | "complete"
  | "failed"
  | "skipped";

export interface CompanyRegistrationNumber {
  countryCode: string;
  system: string; // e.g. "CVR", "VAT", "Companies House"
  value: string;
}

export interface CompanyFacts {
  officialName: string | null;
  registrationNumbers: CompanyRegistrationNumber[];
  country: string | null;
  website: string | null;
  employeeCountTotal: number | null;
  employeesAtSite: number | null;
  industry: string | null;
  foundedDate: string | null;
  description: string | null;
  // Attribution for inferred / provider-sourced fields
  confidence: "high" | "medium" | "low" | null;
  attributedTo: string | null; // provider id that contributed these facts
}

export interface CompanyProfile {
  id: string;
  tenantId: string;
  userId: string | null;
  employer: string; // raw employer string from jobs (profile key)
  normalizedName: string | null; // optional display override
  facts: CompanyFacts | null;
  linkedWatchlistSourceIds: string[];
  createdAt: string;
  updatedAt: string;
  // Derived: latest investigation attached when fetching detail
  latestInvestigation?: CompanyInvestigation | null;
}

export interface CompanyInvestigation {
  id: string;
  tenantId: string;
  userId: string | null;
  companyProfileId: string;
  status: CompanyInvestigationStatus;
  providerIds: string[];
  startedAt: string;
  completedAt: string | null;
  errorCode: string | null; // sanitized error code only
  requestId: string | null;
  createdAt: string;
  updatedAt: string;
}

// API response shapes
export interface CompanyProfileListResponse {
  profiles: CompanyProfile[];
}

export interface CompanyProfileDetailResponse {
  profile: CompanyProfile;
  investigations: CompanyInvestigation[];
}

export interface TriggerInvestigationResponse {
  investigationId: string;
  status: CompanyInvestigationStatus;
}

export interface UpsertCompanyProfileInput {
  employer: string;
  normalizedName?: string | null;
}

export interface UpdateCompanyWatchlistsInput {
  watchlistSourceIds: string[];
}
