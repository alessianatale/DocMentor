// per le function
resource "azurerm_storage_account" "storageaccount" {
  name                     = "storageaccount${random_integer.ri.result}"
  resource_group_name      = azurerm_resource_group.cloudrg.name
  location                 = azurerm_resource_group.cloudrg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind = "Storage"
}

output "AZURE_STORAGE_CONNECTION_STRING" {
  value       = azurerm_storage_account.storageaccount.primary_connection_string
  sensitive = true
}
output "STORAGE_ACCOUNT_NAME" {
  value       = azurerm_storage_account.storageaccount.name
}
 

resource "azurerm_storage_container" "storagecontainer" {
  name                  = "images"
  storage_account_name  = azurerm_storage_account.storageaccount.name
  container_access_type = "private"
}

resource "azurerm_service_plan" "serviceplan" {
  name                = "serviceplan${random_integer.ri.result}"
  location            = azurerm_resource_group.cloudrg.location
  resource_group_name = azurerm_resource_group.cloudrg.name
  os_type             = "Windows"
  sku_name            = "Y1"
  depends_on = [azurerm_storage_account.storageaccount]
}

resource "azurerm_application_insights" "application_insights" {
  name                = "applicationinsights"
  location            = azurerm_resource_group.cloudrg.location
  resource_group_name = azurerm_resource_group.cloudrg.name
  application_type    = "Node.JS"
}

resource "azurerm_windows_function_app" "functionapp" {
  name                = "functionapp${random_integer.ri.result}"
  location            = azurerm_resource_group.cloudrg.location
  resource_group_name = azurerm_resource_group.cloudrg.name
  service_plan_id     = azurerm_service_plan.serviceplan.id
  builtin_logging_enabled = false
  storage_account_name       = azurerm_storage_account.storageaccount.name
  storage_account_access_key = azurerm_storage_account.storageaccount.primary_access_key

  site_config {
    application_stack {
      node_version = "~18"
    }
  }

  app_settings = {
    "AzureWebJobsFeatureFlags" = "EnableWorkerIndexing",
    //AzureWebJobsDashboard = false,
    //"WEBSITE_RUN_FROM_PACKAGE" = "",
    "FUNCTIONS_WORKER_RUNTIME" = "node",
    "APPINSIGHTS_INSTRUMENTATIONKEY" = azurerm_application_insights.application_insights.instrumentation_key
  }
  depends_on = [azurerm_service_plan.serviceplan]
}

/*
resource "null_resource" "finaldeploy" {
  provisioner "local-exec" {
    command = "func azure functionapp publish functionapp24157 --nozip"
  }
}
*/



/*resource "azurerm_function_app_function" "timeTriggerFunction" {
  name            = "timeTriggerFunction${random_integer.ri.result}"
  function_app_id = azurerm_windows_function_app.functionapp.id
  language        = "Javascript"

  file {
    name    = "func.zip"
    content = file("./func.zip")
  }

  test_data = jsonencode({
    "name" = "Azure"
  })

  config_json = jsonencode({
    "schedule": "*//*30 * * * * *",
    "name": "myTimer",
    "type": "timerTrigger",
    "direction": "in"
  })

  depends_on = [azurerm_windows_function_app.functionapp]
}*/



// CLU
// se da errore nella creazione, creare prima una risorsa di questo tipo dall'Azure portal (dopo si può eliminare)
// Azure vuole che la subscription accetti gli AI terms
resource "azurerm_cognitive_account" "cognitiveaccount" {
  name                = "CLUaccountDocMentor"
  location            = azurerm_resource_group.cloudrg.location
  resource_group_name = azurerm_resource_group.cloudrg.name
  kind                = "TextAnalytics"

  sku_name = "F0"
}

output "CluAPIHostName" {
    value = azurerm_cognitive_account.cognitiveaccount.endpoint
}

output "CluAPIKey" {
    value = azurerm_cognitive_account.cognitiveaccount.primary_access_key
    sensitive = true
}
// dopo questo creare il project sul portale


// Healthbot
resource "azurerm_healthbot" "healthbot" {
  name                = "healthbot"
  resource_group_name = azurerm_resource_group.cloudrg.name
  location            = azurerm_resource_group.cloudrg.location
  sku_name            = "F0"
}
// dopo questo aggiungere il token di telegram sul portale


// Telegram connection API
resource "azapi_resource" "createApiConnectionABC" {
  type      = "Microsoft.Web/connections@2016-06-01"
  name      = "telegrambotip"
  parent_id = azurerm_resource_group.cloudrg.id
  location  = azurerm_resource_group.cloudrg.location

  body = jsonencode({
    properties = {
      displayName = "Telegram Bot (Independent Publisher)"
      statuses = [
        {
          "status" : "Connected"
        }
      ]
      parameterValues       = {}
      customParameterValues = {}

      api = {
        name        = "telegrambotip"
        displayName = "Telegram Bot (Independent Publisher)"
        description = "The Telegram Bot API is an HTTP-based interface created for developers keen on building bots for Telegram."
        iconUri     = "https://connectoricons-prod.azureedge.net/releases/v1.0.1612/1.0.1612.3109/telegrambotip/icon.png"
        brandColor  = "#da3b01"
        id          = "/subscriptions/${var.subscription}/providers/Microsoft.Web/locations/${azurerm_resource_group.cloudrg.location}/managedApis/telegrambotip"
        type        = "Microsoft.Web/locations/managedApis"
      }
    }
  })
}

// Logic App
resource "azapi_resource" "logicapp_demo1" {
    type                = "Microsoft.Logic/workflows@2019-05-01"
    name                = "Demo-LogicApp-1"
    location            = azurerm_resource_group.cloudrg.location
    parent_id           = azurerm_resource_group.cloudrg.id
    body = jsonencode({
        properties = {
            definition = {
                  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
                  "contentVersion": "1.0.0.0",
                  "parameters": {
                    "$connections": {
                      "defaultValue": {},
                      "type": "Object"
                    }
                  },
                  "triggers": {},
                  "actions": {},
                  "outputs": {}
              },     
            parameters = {            
                "$connections" = {
                    value = {
                        telegrambotip = {
                            connectionId = azapi_resource.createApiConnectionABC.id
                            connectionName = "telegrambotip"
                            id = "/subscriptions/${var.subscription}/providers/Microsoft.Web/locations/${azurerm_resource_group.cloudrg.location}/managedApis/telegrambotip"
                        }
                    }
                }                
            }
        }
    })
}

resource "azurerm_logic_app_trigger_http_request" "httptriggerRichiestaRicetta" {
  //depends_on = [azurerm_logic_app_workflow.logicapp]
  name         = "httptriggerRichiestaRicetta"
  logic_app_id = azapi_resource.logicapp_demo1.id
  method = "POST"
  schema = <<SCHEMA
{
    "type": "object",
    "properties": {
      "Id": {
         "type": "integer"
        }
    }
}
SCHEMA
}

output "CallbackUrlRichiestaRicetta" {
    value = azurerm_logic_app_trigger_http_request.httptriggerRichiestaRicetta.callback_url
}

resource "azurerm_logic_app_action_custom" "actionRichiestaRicetta" {
  depends_on = [azurerm_logic_app_trigger_http_request.httptriggerRichiestaRicetta]
  name         = "actionRichiestaRicetta"
  logic_app_id = azapi_resource.logicapp_demo1.id
  body = <<BODY
{
"inputs": {
        "host": {
            "connection": {
                "name": "@parameters('$connections')['telegrambotip']['connectionId']"
            }
        },
        "method": "post",
        "body": {
            "chat_id": "@{triggerBody()?['Id']}",
            "text": "Hai una nuova richiesta di ricetta!"
        },
        "path": "/bot@{encodeURIComponent('${var.telegramtoken}')}/sendMessage"
  },
  "runAfter": {},
  "type": "ApiConnection"
}
BODY
}
