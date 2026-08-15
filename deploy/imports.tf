import {
  to = module.foundation.azurerm_application_insights.main
  id = "/subscriptions/d85485c6-e97c-4b2b-9e1a-4176837bd625/resourceGroups/rg-jobops-prod/providers/Microsoft.Insights/components/appi-jobops-prod"
}

import {
  to = azurerm_portal_dashboard.appinsights
  id = "/subscriptions/d85485c6-e97c-4b2b-9e1a-4176837bd625/resourceGroups/rg-jobops-prod/providers/Microsoft.Portal/dashboards/jobops-appinsights"
}

import {
  to = module.other_foundation.azurerm_private_endpoint.key_vault[0]
  id = "/subscriptions/d85485c6-e97c-4b2b-9e1a-4176837bd625/resourceGroups/rg-jobops-prod/providers/Microsoft.Network/privateEndpoints/pe-jobops-other-prod-vault"
}
