# Operator overrides. Committed on the `infra` branch (single-operator setup;
# values here are not sensitive). Use *.auto.tfvars for short-lived local
# overrides that should stay off the branch.

# Public IP CIDR(s) allowed through the Key Vault firewall for terraform/az operations.
# ACA reaches KV via the AzureServices bypass and does not need to be listed here.
# Widen / replace when working from a different network. Discover with:
#   (Invoke-WebRequest https://api.ipify.org -UseBasicParsing).Content
kv_admin_ip_cidrs = ["167.220.197.0/24"]

# Container image. Built by .github/workflows/edge-build.yml on every push to
# main of TheLeftMoose/job-ops. The :edge tag is a moving pointer; ACA pulls
# fresh on revision changes (e.g., when revision_suffix is bumped, or any
# spec change creates a new revision).
image = "ghcr.io/theleftmoose/job-ops:edge"

# Human principals (AAD object IDs) granted Key Vault Administrator on the
# stack KV. The CI deploy UAMI is added automatically by main.tf when
# github_oidc_enabled is true, so it does not need to be listed here.
# Look up your own id with: az ad signed-in-user show --query id -o tsv
kv_admin_principal_ids = ["56c20aa1-0e1d-4452-9ec7-a6fd80fa5a18"]
