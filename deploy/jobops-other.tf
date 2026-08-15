locals {
  other_name_base = "jobops-other-${var.environment}"
  other_tags = merge(var.tags, {
    app         = "jobops-other"
    environment = var.environment
    instance    = "jobops-other"
  })
}

module "other_foundation" {
  source                     = "./modules/instance-foundation"
  name_base                  = local.other_name_base
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  log_analytics_workspace_id = module.foundation.log_analytics_workspace_id
  kv_admin_principals = merge(
    {
      for index, principal_id in var.kv_admin_principal_ids :
      "human-${index}" => principal_id
    },
    var.github_oidc_enabled ? {
      github-deploy = azurerm_user_assigned_identity.github_deploy[0].principal_id
    } : {},
  )
  kv_admin_ip_cidrs = var.kv_admin_ip_cidrs
  basic_auth_user   = var.other_basic_auth_user
  tags              = local.other_tags
}

module "other_storage" {
  source              = "./modules/storage"
  name_base           = local.other_name_base
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  pe_subnet_id        = module.network.pe_subnet_id
  file_dns_zone_id    = module.network.file_dns_zone_id
  tags                = local.other_tags
}

resource "azapi_resource" "other_nfs_storage" {
  type      = "Microsoft.App/managedEnvironments/storages@2025-01-01"
  name      = "jobops-other-app"
  parent_id = module.aca_env.environment_id

  schema_validation_enabled = false

  body = {
    properties = {
      nfsAzureFile = {
        server     = module.other_storage.nfs_server_fqdn
        accessMode = "ReadWrite"
        shareName  = module.other_storage.nfs_share_path
      }
    }
  }

  depends_on = [module.other_storage]
}

resource "azurerm_role_assignment" "other_llm_secret_reader" {
  scope                = "${module.foundation.key_vault_id}/secrets/llm-api-key"
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.other_foundation.uami_principal_id
}

module "other_aca_app" {
  source              = "./modules/aca-app"
  name_base           = local.other_name_base
  resource_group_name = azurerm_resource_group.main.name
  environment_id      = module.aca_env.environment_id
  image               = var.image
  container_cpu       = var.container_cpu
  container_memory    = var.container_memory
  uami_id             = module.other_foundation.uami_id
  uami_client_id      = module.other_foundation.uami_client_id
  key_vault_id        = module.other_foundation.key_vault_id
  key_vault_uri       = module.other_foundation.key_vault_uri
  llm_key_vault_uri   = module.foundation.key_vault_uri
  app_storage_name    = azapi_resource.other_nfs_storage.name
  revision_suffix     = var.other_revision_suffix
  otel_service_name   = "jobops-other-orchestrator"

  appinsights_connection_string = module.other_foundation.appinsights_connection_string

  tags = local.other_tags

  depends_on = [
    module.other_foundation,
    azapi_resource.other_nfs_storage,
    azurerm_role_assignment.other_llm_secret_reader,
  ]
}
