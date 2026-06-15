import type {
  CompanyProfile,
  CompanyProfileDetailResponse,
  CompanyProfileListResponse,
  TriggerInvestigationResponse,
  UpdateCompanyWatchlistsInput,
  UpsertCompanyProfileInput,
} from "@shared/types";
import { fetchApi } from "./core";

export async function listCompanyProfiles(): Promise<CompanyProfileListResponse> {
  return fetchApi<CompanyProfileListResponse>("/companies");
}

export async function getCompanyProfile(
  id: string,
): Promise<CompanyProfileDetailResponse> {
  return fetchApi<CompanyProfileDetailResponse>(
    `/companies/${encodeURIComponent(id)}`,
  );
}

export async function upsertCompanyProfile(
  input: UpsertCompanyProfileInput,
): Promise<CompanyProfile> {
  return fetchApi<CompanyProfile>("/companies", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function triggerInvestigation(
  id: string,
): Promise<TriggerInvestigationResponse> {
  return fetchApi<TriggerInvestigationResponse>(
    `/companies/${encodeURIComponent(id)}/investigate`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function updateCompanyWatchlists(
  id: string,
  input: UpdateCompanyWatchlistsInput,
): Promise<{ watchlistSourceIds: string[] }> {
  return fetchApi<{ watchlistSourceIds: string[] }>(
    `/companies/${encodeURIComponent(id)}/watchlists`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}
