@description('Environment name: dev, staging, or prod')
param environment string = 'dev'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('PostgreSQL admin password (will be stored in Key Vault)')
@secure()
param postgresAdminPassword string

@secure()
param sessionSecret string

// --- Naming ---
var prefix = 'wwedu-${environment}'
var kvName = '${prefix}-kv'
var postgresName = '${prefix}-psql'
var cosmosName = '${prefix}-cosmos'
var openaiName = '${prefix}-openai'
var searchName = '${prefix}-search'
var containerAppEnvName = '${prefix}-cae'
var containerAppName = '${prefix}-api'
// var staticWebAppName = '${prefix}-web'  // Skipped — policy-restricted on student subs
var aiAgentName = '${prefix}-agent'

// =============================================================================
// 1. KEY VAULT — central secrets store
// =============================================================================
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

// =============================================================================
// 2. POSTGRESQL FLEXIBLE SERVER — replaces Neon
// =============================================================================
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresName
  location: location
  sku: {
    name: 'Standard_B1ms'       // 1 vCore, 2 GiB — scale up for prod
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: 'wweduadmin'
    administratorLoginPassword: postgresAdminPassword
    version: '16'
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: { mode: 'Disabled' }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: 'werewolfedu'
}

// =============================================================================
// 3. COSMOS DB — session store for express-session
// =============================================================================
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [ {
      locationName: location
      failoverPriority: 0
    } ]
    databaseAccountOfferType: 'Serverless'   // Pay-per-request
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: 'werewolfedu'
  properties: {
    resource: {
      id: 'werewolfedu'
    }
  }
}

resource cosmosSessionContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDb
  name: 'sessions'
  properties: {
    resource: {
      id: 'sessions'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      defaultTtl: 604800   // 7 days (matches session maxAge)
    }
  }
}

// =============================================================================
// 4. AZURE OPENAI SERVICE — replaces gpt-5 API call
// =============================================================================
resource openai 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: openaiName
  location: location
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: openaiName
    publicNetworkAccess: 'Enabled'
  }
}

resource openaiDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-10-01-preview' = {
  parent: openai
  name: 'gpt-4o-mini'     // Fast, reliable model for speech analysis + feedback
  properties: {
    model: {
      name: 'gpt-4o-mini'
      version: '2024-07-18'
      format: 'OpenAI'
    }
  }
  sku: {
    name: 'GlobalStandard'
    capacity: 10
  }   // 10K TPM
}

// =============================================================================
// 5. AZURE AI SEARCH — vocabulary / learning content
// =============================================================================
resource searchService 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchName
  location: location
  sku: { name: 'basic' }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
  }
}

// =============================================================================
// 6. CONTAINER APPS ENVIRONMENT + APP — hosts Express + WebSocket server
// =============================================================================
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvName
  location: location
  properties: {
    // Internal-only: containers talk to each other, not directly internet-facing
    // The container app ingress handles public traffic with auth
    workloadProfiles: [ {
      name: 'Consumption'
      workloadProfileType: 'Consumption'
    } ]
  }
}

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 5000
        transport: 'http'        // WebSocket auto-upgraded by Container Apps
        allowInsecure: false
      }
      secrets: [
        {
          name: 'db-connection-string'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/POSTGRES-CONNECTION-STRING'
          identity: 'system'
        }
        {
          name: 'cosmos-connection-string'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/COSMOS-CONNECTION-STRING'
          identity: 'system'
        }
        {
          name: 'openai-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/OPENAI-API-KEY'
          identity: 'system'
        }
        {
          name: 'session-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/SESSION-SECRET'
          identity: 'system'
        }
      ]
      registries: [
        {
          server: '${prefix}acr.azurecr.io'
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: '${prefix}acr.azurecr.io/werewolfedu-api:latest'
          resources: {
            cpu: json('1.0')
            memory: '2.0Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '5000'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'db-connection-string'
            }
            {
              name: 'COSMOS_CONNECTION_STRING'
              secretRef: 'cosmos-connection-string'
            }
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: openai.properties.endpoint
            }
            {
              name: 'AZURE_OPENAI_API_KEY'
              secretRef: 'openai-key'
            }
            {
              name: 'AZURE_OPENAI_DEPLOYMENT'
              value: 'gpt-4o-mini'
            }
            {
              name: 'AZURE_AI_SEARCH_ENDPOINT'
              value: 'https://${searchName}.search.windows.net'
            }
            {
              name: 'AZURE_AI_SEARCH_KEY'
              secretRef: 'openai-key'
            }
            {
              name: 'AZURE_AI_AGENT_ENDPOINT'
              value: 'https://${aiAgentName}.${location}.api.ml.azure.com'
            }
            {
              name: 'SESSION_SECRET'
              value: sessionSecret
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 5000
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-scale'
            http: { metadata: { concurrentRequests: '100' } }
          }
          {
            name: 'ws-scale'
            custom: {
              type: 'azure-monitor'
              metadata: {
                metricName: 'activeConnections'
                target: 50
              }
            }
          }
        ]
      }
    }
  }
}

// =============================================================================
// 7. STATIC WEB APP — SKIPPED (Azure for Students policy blocks this resource)
//    Frontend is served by the Container App's Express server (serveStatic).
// =============================================================================

// =============================================================================
// 8. AZURE AI FOUNDRY HUB — hosts AI Agent Service for Copilot Chat publishing
// =============================================================================
resource aiHub 'Microsoft.MachineLearningServices/workspaces@2024-10-01-preview' = {
  name: aiAgentName
  location: location
  kind: 'hub'
  properties: {
    friendlyName: 'WerewolfEdu AI Hub'
    description: 'AI Agent Service hub for WerewolfEdu — speech analysis + feedback agent'
    publicNetworkAccess: 'Enabled'
    // Link to Azure OpenAI and AI Search so the agent can use them
    // as connected resources
  }
}

// AZURE_AI_AGENT_ENDPOINT is injected above in the Container App env vars.
// The container uses this to register the agent via @azure/ai-projects SDK.

// =============================================================================
// OUTPUTS
// =============================================================================
output containerAppUrl string = containerApp.properties.configuration.ingress.fqdn
// output staticWebAppUrl string = staticWebApp.properties.defaultHostname  // Skipped
output openaiEndpoint string = openai.properties.endpoint
output postgresHost string = postgresServer.properties.fullyQualifiedDomainName
output searchEndpoint string = 'https://${searchName}.search.windows.net'
output aiAgentEndpoint string = 'https://${aiAgentName}.${location}.api.ml.azure.com'
output aiAgentName string = aiAgentName
