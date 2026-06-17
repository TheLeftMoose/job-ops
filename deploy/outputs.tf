output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "container_app_fqdn" {
  value = module.aca_app.fqdn
}

output "container_app_url" {
  value = "https://${module.aca_app.fqdn}"
}

output "key_vault_name" {
  value = module.foundation.key_vault_name
}

output "key_vault_uri" {
  value = module.foundation.key_vault_uri
}

output "storage_account_name" {
  value = module.storage.storage_account_name
}

# Values to set as GitHub Actions repository variables (NOT secrets — these
# are not sensitive when paired with OIDC + a federated credential bound to
# a specific repo/branch/environment).
output "github_oidc_client_id" {
  value       = var.github_oidc_enabled ? azurerm_user_assigned_identity.github_deploy[0].client_id : null
  description = "Set as GitHub Actions variable AZURE_CLIENT_ID."
}

output "github_oidc_tenant_id" {
  value       = var.github_oidc_enabled ? data.azurerm_client_config.current.tenant_id : null
  description = "Set as GitHub Actions variable AZURE_TENANT_ID."
}

output "github_oidc_subscription_id" {
  value       = var.github_oidc_enabled ? data.azurerm_client_config.current.subscription_id : null
  description = "Set as GitHub Actions variable AZURE_SUBSCRIPTION_ID."
}

output "container_app_name" {
  value = module.aca_app.name
}
