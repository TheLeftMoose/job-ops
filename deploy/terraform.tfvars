# Local operator overrides. Gitignored.

# Public IP CIDR(s) allowed through the Key Vault firewall for terraform/az operations.
# ACA reaches KV via the AzureServices bypass and does not need to be listed here.
# Widen / replace when working from a different network. Discover with:
#   (Invoke-WebRequest https://api.ipify.org -UseBasicParsing).Content
kv_admin_ip_cidrs = ["167.220.197.0/24"]
