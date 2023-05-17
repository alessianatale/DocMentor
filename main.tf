# Azure Provider source and version being used
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "3.48.0"
    }
    azapi = {
      source = "Azure/azapi"
    }
  }
}

provider "azapi" {
}
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    cognitive_account {
      purge_soft_delete_on_destroy = true
    }
  }
}

resource "azurerm_resource_group" "cloudrg" {
  name     = "cloudrg"
  location = "West Europe"
}

# Identità gestita dall'utente
resource "azurerm_user_assigned_identity" "cloudidentity" {
  location            = azurerm_resource_group.cloudrg.location
  name                = "cloudidentity"
  resource_group_name = azurerm_resource_group.cloudrg.name
}

resource "random_integer" "ri" {
  min = 10000
  max = 99999
}

# App Service
resource "azurerm_resource_group_template_deployment" "cloudasdeployment" {
  name                = "cloudasdeployment"
  resource_group_name = azurerm_resource_group.cloudrg.name
  deployment_mode     = "Incremental"
  parameters_content = jsonencode({
    "appServiceName" = {
      value = "cloudas${random_integer.ri.result}"
    }
    "newAppServicePlanName" = {
      value = "cloudappserviceplan"
    }
    "newAppServicePlanLocation" = {
      value = "westeurope"
    }
    "newAppServicePlanSku" = {
      value = {
        "name": "S1",
        "tier": "Standard",
        "size": "S1",
        "family": "S",
        "capacity": 1
      }
    }
    "appType" = {
      value = "UserAssignedMSI"
    }
    "appId" = {
      value = azurerm_user_assigned_identity.cloudidentity.client_id
    }
    "UMSIName" = {
      value = "cloudidentity"
    }
    "UMSIResourceGroupName" = {
      value = "cloudrg"
    }
    "tenantId" = {
      value = azurerm_user_assigned_identity.cloudidentity.tenant_id
    }
  })
  template_content = file(".\\deploymentTemplates\\deployUseExistResourceGroup\\template-BotApp-with-rg.json")
  depends_on = [azurerm_user_assigned_identity.cloudidentity]
}

output "MicrosoftAppId" {
  value = azurerm_user_assigned_identity.cloudidentity.client_id
}
output "MicrosoftAppTenantId" {
  value = azurerm_user_assigned_identity.cloudidentity.tenant_id
}

# Azure Bot 
resource "azurerm_resource_group_template_deployment" "cloudbotdeployment" {
  name                = "cloudbotdeployment"
  resource_group_name = azurerm_resource_group.cloudrg.name
  deployment_mode     = "Incremental"
  parameters_content = jsonencode({
    "azureBotId" = {
      value = "DocMentorBot"
    }
    "azureBotSku" = {
      value = "S1"
    }
    "azureBotRegion" = {
      value = "global"
    }
    "botEndpoint" = {
      value = "https://cloudas${random_integer.ri.result}.azurewebsites.net/api/messages"
    }
    "appType" = {
      value = "UserAssignedMSI"
    }
    "appId" = {
      value = azurerm_user_assigned_identity.cloudidentity.client_id
    }
    "UMSIName" = {
      value = "cloudidentity"
    }
    "UMSIResourceGroupName" = {
      value = "cloudrg"
    }
    "tenantId" = {
      value = azurerm_user_assigned_identity.cloudidentity.tenant_id
    }
  })
  template_content = file(".\\deploymentTemplates\\deployUseExistResourceGroup\\template-AzureBot-with-rg.json")
  depends_on = [azurerm_resource_group_template_deployment.cloudasdeployment]
}



# CosmoDB per MongoDB
resource "azurerm_cosmosdb_account" "cosmodbaccount" {
  name                = "cosmodbaccount-${random_integer.ri.result}"
  location            = azurerm_resource_group.cloudrg.location
  resource_group_name = azurerm_resource_group.cloudrg.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  capabilities {
    name = "EnableAggregationPipeline"
  }
  capabilities {
    name = "mongoEnableDocLevelTTL"
  }
  capabilities {
    name = "EnableMongo"
  }
  capabilities {
    name = "DisableRateLimitingResponses"
  }

  consistency_policy {
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }
  geo_location {
    location          = "north Europe"
    failover_priority = 0
  }
  mongo_server_version = "4.0"
  enable_free_tier = true
}

data "azurerm_cosmosdb_account" "cosmodbaccount" {
  name                = "cosmodbaccount-${random_integer.ri.result}"
  resource_group_name = azurerm_resource_group.cloudrg.name
  depends_on = [azurerm_cosmosdb_account.cosmodbaccount]
}

output "COSMOS_CONNECTION_STRING" {
  value       = azurerm_cosmosdb_account.cosmodbaccount.connection_strings[0]
  sensitive = true
}

resource "azurerm_cosmosdb_mongo_database" "mongodatabase" {
  name                = "mongodatabase"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  depends_on = [data.azurerm_cosmosdb_account.cosmodbaccount]
}

resource "azurerm_cosmosdb_mongo_collection" "userscollection" {
  name                = "users"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "slotorariscollection" {
  name                = "slotorari"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "prenotazioniscollection" {
  name                = "prenotazioni"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "richiestericettecollection" {
  name                = "richiesteRicette"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "farmacicollection" {
  name                = "farmaci"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = data.azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  index {
    keys   = ["_id"]
    unique = true
  }
}


resource "null_resource" "npm_env" {
  provisioner "local-exec" {
    command = "az bot update --resource-group cloudrg --name DocMentorBot --endpoint https://cloudas${random_integer.ri.result}.azurewebsites.net/api/messages"
  }
  provisioner "local-exec" {
    command = "az bot telegram create --resource-group cloudrg --name DocMentorBot --access-token ${var.telegramtoken} --is-validated"
  }
  provisioner "local-exec" {
    command = "npm install"
  }
  provisioner "local-exec" {
    command = "az bot prepare-deploy --lang Javascript"
  }
  depends_on = [azurerm_cosmosdb_mongo_collection.farmacicollection]
}

resource "null_resource" "uploadfarmaci" {
  provisioner "local-exec" {
    command = "mongoimport -h ${azurerm_cosmosdb_account.cosmodbaccount.name}.mongo.cosmos.azure.com:10255 -d mongodatabase -c farmaci -u ${azurerm_cosmosdb_account.cosmodbaccount.name} -p ${nonsensitive(azurerm_cosmosdb_account.cosmodbaccount.primary_key)} --ssl --jsonArray --writeConcern=\"{w:0}\" --file ./utils/farmaci.json --quiet"
  }
  depends_on = [azurerm_cosmosdb_mongo_collection.farmacicollection]
}