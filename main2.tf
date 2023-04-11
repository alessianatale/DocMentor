// per le function
resource "azurerm_storage_account" "storageaccount" {
  name                     = "storageaccount${random_integer.ri.result}"
  resource_group_name      = azurerm_resource_group.cloudrg.name
  location                 = azurerm_resource_group.cloudrg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind = "Storage"
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


/*
resource "null_resource" "finaldeploy" {
  provisioner "local-exec" {
    command = " func azure functionapp publish functionapp24157 --nozip"
  }
}
*/



