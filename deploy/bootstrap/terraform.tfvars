# Operator overrides for bootstrap. Committed on the `infra` branch (single-operator setup).

# Public IP CIDR(s) allowed through the tfstate SA firewall for terraform/az ops.
#
# - 167.220.0.0/16 : Microsoft corpnet (used when AzVPN is off / split-tunnel
#   sends storage traffic via WiFi).
# - 40.69.0.0/16, 52.164.0.0/16 : Azure North Europe SNAT pools used by the
#   MSFT-AzVPN client when tunneling Azure-bound traffic. Discovered via
#   StorageBlobLogs.CallerIpAddress; see deploy/README.md.
tfstate_admin_ip_cidrs = [
  "167.220.0.0/16",
  "40.69.0.0/16",
  "52.164.0.0/16",
]


# Log Analytics workspace ID for blob diagnostics. Used to discover the real
# egress IP when the SA firewall sees a different IP than ipify/ifconfig
# report. Created by the main stack as `module.foundation.azurerm_log_analytics_workspace.main`.
diagnostics_law_id = "/subscriptions/d85485c6-e97c-4b2b-9e1a-4176837bd625/resourceGroups/rg-jobops-prod/providers/Microsoft.OperationalInsights/workspaces/log-jobops-prod"
