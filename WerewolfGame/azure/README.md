# WerewolfEduModel — Azure Migration Guide

## Architecture

```
                     ┌────────────────────────┐
                     │   Azure Static Web App  │  ← React/Vite frontend
                     │   (CDN edge, free tier) │
                     └────────┬───────────────┘
                              │ HTTPS
                              ▼
              ┌───────────────────────────────┐
              │   Azure Container Apps        │  ← Express + WebSocket
              │   (auto-scale, WebSocket)     │
              ├───────────────────────────────┤
              │  /api/*    REST routes        │
              │  /ws       WebSocket          │
              │  /api/health  liveness probe  │
              └───┬───────┬───────┬──────────┘
                  │       │       │
         ┌────────┘       │       └────────────┐
         ▼                ▼                    ▼
┌─────────────────┐ ┌───────────┐ ┌─────────────────────┐
│ Azure DB for    │ │ Azure     │ │ Azure AI Search     │
│ PostgreSQL      │ │ Cosmos DB │ │ (vocabulary index)  │
│ (game data)     │ │(sessions) │ │                     │
└─────────────────┘ └───────────┘ └─────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Azure OpenAI Service        │
              │   (gpt-5 deployment)          │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Azure AI Agent Service      │  ← optional orchestration
              │   (minimal setup)             │
              └───────────────────────────────┘
```

## Prerequisites

```bash
# Install Azure CLI + Azure Developer CLI
winget install Microsoft.AzureCLI
winget install Microsoft.Azd

# Or on macOS:
brew install azure-cli azd

# Login
az login
azd auth login
```

## Quick Start (one command)

```bash
cd WerewolfEduModel

# One command provisions infrastructure + deploys code
azd up
```

`azd up` will:
1. Read `azure/main.bicep` → provision all Azure resources
2. Read `azure.yaml` → discover services
3. Build Docker image → push to ACR → deploy to Container Apps
4. Build frontend → deploy to Static Web Apps
5. Run `azure/seed-search.ts` to seed AI Search vocabulary index

## Manual Deployment (step by step)

### 1. Provision infrastructure

```bash
# Create resource group
az group create -n rg-werewolfedu -l eastus

# Deploy Bicep (prompts for postgresAdminPassword + sessionSecret)
az deployment group create \
  -g rg-werewolfedu \
  -f azure/main.bicep \
  -p postgresAdminPassword=<your-secure-password> \
  -p sessionSecret=<random-64-char-string>
```

### 2. Code changes to apply

| File | Action |
|---|---|
| `server/lib/openai.ts` | Replace with `azure/server-lib-openai-azure.ts` |
| `server/lib/cosmos-session-store.ts` | Copy from `azure/server-lib-cosmos-session-store.ts` |
| `server/lib/ai-search.ts` | Copy from `azure/server-lib-ai-search.ts` |
| `server/routes.ts` | Add health endpoint from `azure/routes-health.ts` |
| `server/index.ts` | Switch session store to `CosmosSessionStore` |
| `package.json` | Add `@azure/cosmos`, `@azure/search-documents` |

### 3. Update server/index.ts for Cosmos sessions

```typescript
// OLD (in-memory):
app.use(session({
  secret: process.env.SESSION_SECRET || 'werewolf-game-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 },
}));

// NEW (Cosmos DB):
import { CosmosSessionStore } from "./lib/cosmos-session-store";

app.use(session({
  secret: process.env.SESSION_SECRET!,
  store: new CosmosSessionStore(),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 },
}));
```

### 4. Install new npm packages

```bash
npm install @azure/cosmos @azure/search-documents @azure/identity
```

### 5. Build and push Docker image

```bash
az acr build -r wweduacr -t werewolfedu-api:latest .
```

### 6. Deploy Container App

```bash
az containerapp update \
  -n wwedu-api \
  -g rg-werewolfedu \
  --image wweduacr.azurecr.io/werewolfedu-api:latest \
  --set-env-vars \
    NODE_ENV=production \
    DATABASE_URL=secretref:db-connection-string \
    COSMOS_CONNECTION_STRING=secretref:cosmos-connection-string \
    AZURE_OPENAI_ENDPOINT=<from-azd-output> \
    AZURE_OPENAI_API_KEY=secretref:openai-key \
    AZURE_AI_SEARCH_ENDPOINT=<from-azd-output> \
    SESSION_SECRET=secretref:session-secret
```

## Environment Variables

| Variable | Source | Description |
|---|---|---|
| `DATABASE_URL` | Key Vault → `POSTGRES-CONNECTION-STRING` | PostgreSQL connection string |
| `COSMOS_CONNECTION_STRING` | Key Vault → `COSMOS-CONNECTION-STRING` | Cosmos DB connection string |
| `AZURE_OPENAI_ENDPOINT` | Bicep output | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_API_KEY` | Key Vault → `OPENAI-API-KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | Hardcoded `gpt-4o-mini` | Model deployment name |
| `AZURE_AI_SEARCH_ENDPOINT` | Bicep output | AI Search endpoint URL |
| `AZURE_AI_SEARCH_KEY` | Key Vault → `SEARCH-API-KEY` | AI Search admin key |
| `SESSION_SECRET` | Key Vault → `SESSION-SECRET` | Express session signing secret |
| `AZURE_AI_AGENT_ENDPOINT` | Bicep output | AI Foundry Hub endpoint for agent publishing |
| `AZURE_CONTAINER_APP_URL` | Bicep output | Container App URL (tool dispatch endpoint) |

## M365 Copilot Chat Publishing

The WerewolfEdu agent is published to M365 Copilot Chat via **Azure AI Agent Service** (direct publishing).

### How it works

1. **azd up** runs `azure/publish-agent.ts` as a post-provision hook
2. The script connects to your AI Foundry Hub and registers the agent with:
   - Two tools: `analyze_speech` and `generate_feedback`
   - System instructions for English tutoring
   - Metadata for Copilot Chat discoverability
3. Users find the agent in Copilot Chat as **"Werewolf Edu Tutor"**
4. Copilot Chat dispatches tool calls to `POST /api/agent/run` on the Container App

### Manual publishing

```bash
# Set required env vars (from azd provision output)
export AZURE_AI_AGENT_ENDPOINT="https://wwedu-dev-agent.northeurope.api.ml.azure.com"

# Dry run (validate config only)
DRY_RUN=1 npx tsx azure/publish-agent.ts

# Publish for real
npx tsx azure/publish-agent.ts
```

### Verify publishing

```bash
# Check the health endpoint — it reports Copilot Chat status
curl https://<container-app-fqdn>/api/health | jq .copilotChat
# {
#   "published": true,
#   "method": "azure-ai-agent-service",
#   "agentId": "asst_...",
#   "error": null
# }

# List registered tools
curl https://<container-app-fqdn>/api/agent/tools | jq

# Get publishing manifest
curl https://<container-app-fqdn>/api/agent/manifest | jq
```

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `copilotChat.published: false` | `AZURE_AI_AGENT_ENDPOINT` not set | Check env vars; run `azd provision` |
| `copilotChat.method: "azure-ai-agent-service", published: false` | Auth error or hub not found | Check Managed Identity has "Azure AI Developer" RBAC role on the Hub |
| Agent not visible in Copilot Chat | Propagation delay | Wait up to 15 min; check Azure Portal → AI Foundry → Agents |
| Tool calls failing | Container App not reachable | Verify ingress is enabled and `/api/agent/run` returns 200 |

## Pricing Estimate (dev/test)

| Resource | SKU | Monthly (est.) |
|---|---|---|
| Container Apps | Consumption (1M req) | ~$0 |
| PostgreSQL | B1ms (1 vCore, 2 GiB) | ~$18 |
| Cosmos DB | Serverless | ~$0.50/million RU |
| Azure OpenAI | S0 + GPT-5 GlobalStandard | ~$2/1K calls |
| AI Search | Basic | ~$0.10/hour |
| Static Web App | Free | $0 |
| Key Vault | Standard | ~$0.03/10K ops |
| AI Foundry Hub | Free tier | $0 |
| **Total (dev)** | | **~$25-50/month** |

## CI/CD

Push to `main` → GitHub Actions (`deploy.yml`) triggers:
1. Build Docker image → push to ACR
2. Deploy Container App (blue-green revision)
3. Publish agent to M365 Copilot Chat (`npx tsx azure/publish-agent.ts`)
4. Smoke test `/api/health` (validates Copilot Chat publishing status)

OIDC federation means **no Azure secrets stored in GitHub** — uses workload identity.
