import * as api from "@client/api";
import {
  EmptyState,
  ListItem,
  ListPanel,
  PageHeader,
  PageMain,
} from "@client/components/layout";
import { showErrorToast } from "@client/lib/error-toast";
import { queryKeys } from "@client/lib/queryKeys";
import type { CompanyProfile } from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, FlaskConical, Loader2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function statusBadgeVariant(
  status: string | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "complete":
      return "default";
    case "running":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function statusLabel(status: string | undefined): string {
  switch (status) {
    case "complete":
      return "Investigated";
    case "running":
      return "Running";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    case "skipped":
      return "Skipped";
    default:
      return "Not investigated";
  }
}

function CompanyRow({
  profile,
  onInvestigate,
  isInvestigating,
}: {
  profile: CompanyProfile;
  onInvestigate: (id: string) => void;
  isInvestigating: boolean;
}) {
  const navigate = useNavigate();
  const latestStatus = profile.latestInvestigation?.status;

  return (
    <ListItem onClick={() => navigate(`/companies/${profile.id}`)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">
            {profile.normalizedName ?? profile.employer}
          </span>
          {profile.facts?.country && (
            <span className="text-xs text-muted-foreground uppercase">
              {profile.facts.country}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {profile.facts?.industry && (
            <span className="truncate">{profile.facts.industry}</span>
          )}
          {profile.facts?.employeeCountTotal != null && (
            <span>
              {profile.facts.employeeCountTotal.toLocaleString()} employees
            </span>
          )}
          {profile.latestInvestigation?.completedAt && (
            <span>
              Last checked:{" "}
              {new Date(
                profile.latestInvestigation.completedAt,
              ).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={statusBadgeVariant(latestStatus)}>
          {statusLabel(latestStatus)}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          disabled={isInvestigating || latestStatus === "running"}
          onClick={(e) => {
            e.stopPropagation();
            onInvestigate(profile.id);
          }}
        >
          {isInvestigating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FlaskConical className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">Investigate</span>
        </Button>
      </div>
    </ListItem>
  );
}

export const CompaniesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [investigatingIds, setInvestigatingIds] = useState<Set<string>>(
    new Set(),
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.companies.list(),
    queryFn: api.listCompanyProfiles,
  });

  const investigateMutation = useMutation({
    mutationFn: (id: string) => api.triggerInvestigation(id),
    onMutate: (id) => {
      setInvestigatingIds((prev) => new Set(prev).add(id));
    },
    onSettled: (_, __, id) => {
      setInvestigatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.companies.list(),
      });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Investigation failed");
    },
  });

  const profiles = data?.profiles ?? [];

  return (
    <>
      <PageHeader
        icon={Building2}
        title="Companies"
        subtitle="Investigate companies before you apply"
        badge={profiles.length > 0 ? String(profiles.length) : undefined}
      />
      <PageMain>
        <ListPanel>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : profiles.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies yet"
              description="Company profiles are created when you import jobs or when you add them manually via Settings."
            />
          ) : (
            profiles.map((profile) => (
              <CompanyRow
                key={profile.id}
                profile={profile}
                onInvestigate={(id) => investigateMutation.mutate(id)}
                isInvestigating={investigatingIds.has(profile.id)}
              />
            ))
          )}
        </ListPanel>
      </PageMain>
    </>
  );
};
