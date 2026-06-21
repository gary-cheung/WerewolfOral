/**
 * Health endpoint for Container Apps liveness/readiness probes.
 *
 * Insert this route block into server/routes.ts inside the registerRoutes()
 * function, near the top (after auth routes, before room routes).
 *
 * Example insertion point in routes.ts — find:
 *   // ===== Room Code Routes =====
 * ...and insert the health route just above it.
 *
 * Also add at the top of routes.ts:
 *   import { sql } from "drizzle-orm";
 *   import { db } from "./db";
 */

// ── Paste this block into routes.ts ───────────────────────────────────────

// Health check endpoint (used by Azure Container Apps liveness probe)
app.get("/api/health", async (_req, res) => {
  const checks: Record<string, "ok" | "error" | "degraded"> = {};

  // 1. Check database connectivity
  try {
    const { db } = await import("./db");
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch (e: any) {
    checks.database = "error";
    console.error("[Health] Database check failed:", e.message);
  }

  // 2. Check Azure OpenAI (non-blocking — degraded if unavailable)
  try {
    if (process.env.AZURE_OPENAI_ENDPOINT) {
      checks.openai = "ok"; // Light check — actual call is expensive
    } else {
      checks.openai = "degraded";
    }
  } catch {
    checks.openai = "error";
  }

  // 3. Check Cosmos DB session store (if configured)
  if (process.env.COSMOS_CONNECTION_STRING) {
    checks.cosmos = "ok"; // Light check — read is expensive
  }

  // 4. Memory usage (warn if > 80%)
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  if (memPercent > 85) {
    checks.memory = "degraded";
  }

  // Determine overall status
  const hasError = Object.values(checks).some((v) => v === "error");
  const statusCode = hasError ? 503 : 200;

  res.status(statusCode).json({
    status: hasError ? "unhealthy" : "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsedMB,
      heapTotalMB,
      percent: memPercent,
    },
    checks,
    version: process.env.APP_VERSION || "dev",
  });
});
