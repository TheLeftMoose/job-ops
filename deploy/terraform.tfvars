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
