# Operator overrides for bootstrap. Committed on the `infra` branch (single-operator setup).

# Drop the tfstate SA firewall entirely. CI runs Terraform from GitHub-hosted
# runners whose egress IPs are unstable. AAD-only auth (no shared keys) still
# gates the data plane: only principals with explicit Blob Data RBAC in this
# tenant can read/write state. See deploy/README.md for the threat-model
# write-up.
tfstate_public_network_unrestricted = true


# Log Analytics workspace ID for blob diagnostics. Used to discover the real
# egress IP when the SA firewall sees a different IP than ipify/ifconfig
# report. Created by the main stack as `module.foundation.azurerm_log_analytics_workspace.main`.
diagnostics_law_id = "/subscriptions/d85485c6-e97c-4b2b-9e1a-4176837bd625/resourceGroups/rg-jobops-prod/providers/Microsoft.OperationalInsights/workspaces/log-jobops-prod"
