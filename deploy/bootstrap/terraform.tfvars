# Local operator overrides for bootstrap. Gitignored (*.tfvars in .gitignore).

# Public IP CIDR(s) allowed through the tfstate SA firewall for terraform/az ops.
# Update when working from a different network.
tfstate_admin_ip_cidrs = ["167.220.197.0/24"]
