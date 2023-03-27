# We strongly recommend using the required_providers block to set the
# Azure Provider source and version being used
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
    }
  }
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {}
}

# Create a resource group
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

# App Service deployment
resource "azurerm_resource_group_template_deployment" "cloudasdeployment" {
  name                = "cloudasdeployment"
  resource_group_name = azurerm_resource_group.cloudrg.name
  deployment_mode     = "Incremental"
  parameters_content = jsonencode({
    "appServiceName" = {
      value = "cloudas"
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
  
  template_content = file("C:\\Users\\Alessia\\Desktop\\DocMentorBot\\CloudProject\\deploymentTemplates\\deployUseExistResourceGroup\\template-BotApp-with-rg.json")
  depends_on = [azurerm_user_assigned_identity.cloudidentity]
}

# Azure Bot deployment
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
      value = "https://cloudas.azurewebsites.net/api/messages"
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
  
  template_content = file("C:\\Users\\Alessia\\Desktop\\DocMentorBot\\CloudProject\\deploymentTemplates\\deployUseExistResourceGroup\\template-AzureBot-with-rg.json")
  depends_on = [azurerm_resource_group_template_deployment.cloudasdeployment]
}

resource "azurerm_cosmosdb_account" "cosmodbaccount" {
  name                = "cosmodbaccount"
  location            = azurerm_resource_group.cloudrg.location
  resource_group_name = azurerm_resource_group.cloudrg.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  enable_automatic_failover = true

  capabilities {
    name = "EnableAggregationPipeline"
  }

  capabilities {
    name = "mongoEnableDocLevelTTL"
  }

  capabilities {
    name = "MongoDBv3.4"
  }

  capabilities {
    name = "EnableMongo"
  }

  consistency_policy {
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  geo_location {
    location          = "eastus"
    failover_priority = 1
  }

  geo_location {
    location          = "westus"
    failover_priority = 0
  }
  depends_on = [azurerm_resource_group_template_deployment.cloudbotdeployment]
}

# data "azurerm_cosmosdb_account" "cosmodbaccount" {
#   name                = "cosmodbaccount"
#   resource_group_name = azurerm_resource_group.cloudrg.name
#   depends_on = [azurerm_resource_group_template_deployment.cloudbotdeployment]
# }

resource "azurerm_cosmosdb_mongo_database" "mongodatabase" {
  name                = "mongodatabase"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = azurerm_cosmosdb_account.cosmodbaccount.name
  depends_on = [azurerm_cosmosdb_account.cosmodbaccount]
}

resource "azurerm_cosmosdb_mongo_collection" "mongocollection" {
  name                = "mongocollection"
  resource_group_name = azurerm_resource_group.cloudrg.name
  account_name        = azurerm_cosmosdb_account.cosmodbaccount.name
  database_name       = azurerm_cosmosdb_mongo_database.mongodatabase.name

  default_ttl_seconds = "777"
  shard_key           = "uniqueKey"
  throughput          = 400

  depends_on = [azurerm_cosmosdb_mongo_database.mongodatabase]

  # index {
  #   keys   = ["_id"]
  #   unique = true
  # }
}

resource "null_resource" "npm_env" {
  provisioner "local-exec" {
    command = "cd C:/Users/Alessia/Desktop/DocMentorBot/CloudProject"
  }
  provisioner "local-exec" {
    command = "az bot update --resource-group cloudrg --name DocMentorBot --endpoint https://cloudas.azurewebsites.net/api/messages"
  }
  provisioner "local-exec" {
    command = "az bot telegram create --resource-group cloudrg --name DocMentorBot --access-token 6054944368:AAErutT3RsFs-uLAYb2YMZcw-u5vls5JEIE --is-validated"
  }
  provisioner "local-exec" {
    command = "npm install"
  }
  # crea.env
  provisioner "local-exec" {
    command = "az bot prepare-deploy --lang Javascript"
  }

  depends_on = [azurerm_resource_group_template_deployment.cloudbotdeployment]
}
/*
resource "null_resource" "finaldeploy" {
  provisioner "local-exec" {
    command = "powershell Compress-Archive -Path . -DestinationPath deploy.zip"
  }
  provisioner "local-exec" {
    command = "az webapp deployment source config-zip --resource-group cloudrg --name cloudas --src CloudProject.zip"
  }

  depends_on = [null_resource.npm_env]
}
*/



