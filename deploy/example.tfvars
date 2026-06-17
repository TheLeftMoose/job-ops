# Copy to terraform.tfvars and fill in.

# Public IP CIDR(s) allowed through the Key Vault firewall for terraform/az ops.
# ACA secret resolution uses the AzureServices bypass and does not need to be listed.
# kv_admin_ip_cidrs = ["203.0.113.42/32"]

# Container App revision suffix. Bump to force a new revision so KV-backed
# secrets are re-fetched (e.g., after a secret rotation).
# revision_suffix = "rot202606151526"
