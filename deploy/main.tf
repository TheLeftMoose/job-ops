locals {
  name_base = "${var.prefix}-${var.environment}"
  tags      = merge(var.tags, { environment = var.environment })
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_base}"
  location = var.location
  tags     = local.tags
}

module "network" {
  source              = "./modules/network"
  name_base           = local.name_base
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags
}

module "foundation" {
  source               = "./modules/foundation"
  name_base            = local.name_base
  location             = var.location
  resource_group_name  = azurerm_resource_group.main.name
  tenant_id            = data.azurerm_client_config.current.tenant_id
  current_principal_id = data.azurerm_client_config.current.object_id
  kv_admin_ip_cidrs    = var.kv_admin_ip_cidrs
  tags                 = local.tags
}

module "storage" {
  source              = "./modules/storage"
  name_base           = local.name_base
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  pe_subnet_id        = module.network.pe_subnet_id
  file_dns_zone_id    = module.network.file_dns_zone_id
  tags                = local.tags
}

module "aca_env" {
  source                     = "./modules/aca-env"
  name_base                  = local.name_base
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = module.foundation.log_analytics_workspace_id
  aca_subnet_id              = module.network.aca_subnet_id
  nfs_server_fqdn            = module.storage.nfs_server_fqdn
  nfs_share_path             = module.storage.nfs_share_path
  private_endpoint_id        = module.storage.private_endpoint_id
  tags                       = local.tags
}

module "aca_app" {
  source              = "./modules/aca-app"
  name_base           = local.name_base
  resource_group_name = azurerm_resource_group.main.name
  environment_id      = module.aca_env.environment_id
  image               = var.image
  container_cpu       = var.container_cpu
  container_memory    = var.container_memory
  uami_id             = module.foundation.uami_id
  uami_client_id      = module.foundation.uami_client_id
  key_vault_id        = module.foundation.key_vault_id
  key_vault_uri       = module.foundation.key_vault_uri
  app_storage_name    = module.aca_env.app_storage_name
  revision_suffix     = var.revision_suffix
  tags                = local.tags
}
