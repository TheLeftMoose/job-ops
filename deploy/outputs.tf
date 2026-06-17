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
