/**
 * Azure Cosmos DB Session Store — production replacement for in-memory sessions
 *
 * Install: npm install @azure/cosmos connect-cosmosdb
 * Then in server/index.ts replace:
 *   import session from "express-session";
 *   import { CosmosSessionStore } from "./lib/cosmos-session-store";
 *   app.use(session({ store: new CosmosSessionStore(), ... }));
 *
 * Why Cosmos DB instead of Redis (Azure Cache for Redis):
 *   - Serverless tier: pay per-request, zero cost at idle
 *   - Automatic TTL cleanup (no session-cleanup cron needed)
 *   - Same connection string as other Cosmos containers
 *   - Multi-region replication if you expand globally
 */

import { CosmosClient, Container } from "@azure/cosmos";

// ── Lazy singleton ────────────────────────────────────────────────────────
let container: Container | null = null;

async function getContainer(): Promise<Container> {
  if (container) return container;

  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("COSMOS_CONNECTION_STRING must be set");
  }

  const client = new CosmosClient(connectionString);
  const database = client.database("werewolfedu");

  // Ensure container exists (idempotent — created by Bicep)
  const { container: c } = await database.containers.createIfNotExists({
    id: "sessions",
    partitionKey: "/id",
    defaultTtl: 604800, // 7 days — matches session cookie maxAge
  });

  container = c;
  console.log("[Cosmos] Session store initialized");
  return container;
}

// ── Express-session Store interface ───────────────────────────────────────
export class CosmosSessionStore extends (require("express-session").Store) {
  constructor() {
    super();
  }

  // Get session by ID
  async get(
    sid: string,
    callback: (err?: any, session?: Express.SessionData | null) => void,
  ): Promise<void> {
    try {
      const c = await getContainer();
      const { resource } = await c.item(sid, sid).read();

      if (!resource || !resource.session) {
        return callback(null, null);
      }

      callback(null, resource.session);
    } catch (err: any) {
      // 404 = session not found — not an error
      if (err.code === 404) return callback(null, null);
      console.error("[Cosmos] Session get error:", err.message);
      callback(err);
    }
  }

  // Create/update session
  async set(
    sid: string,
    session: Express.SessionData,
    callback?: (err?: any) => void,
  ): Promise<void> {
    try {
      const c = await getContainer();

      const ttl = Math.floor(
        (session.cookie?.maxAge ?? 604800000) / 1000, // ms → seconds
      );

      await c.items.upsert({
        id: sid,
        partitionKey: sid, // Cosmos needs this in the document body
        session,
        ttl, // Cosmos auto-deletes after TTL expires
        updatedAt: new Date().toISOString(),
      });

      callback?.();
    } catch (err: any) {
      console.error("[Cosmos] Session set error:", err.message);
      callback?.(err);
    }
  }

  // Delete session (logout)
  async destroy(
    sid: string,
    callback?: (err?: any) => void,
  ): Promise<void> {
    try {
      const c = await getContainer();
      await c.item(sid, sid).delete();
      callback?.();
    } catch (err: any) {
      if (err.code === 404) return callback?.(); // Already gone
      console.error("[Cosmos] Session destroy error:", err.message);
      callback?.(err);
    }
  }

  // Count active sessions (useful for monitoring)
  async length(
    callback: (err?: any, length?: number) => void,
  ): Promise<void> {
    try {
      const c = await getContainer();
      const { resources } = await c.items
        .query("SELECT VALUE COUNT(1) FROM c")
        .fetchAll();
      callback(null, resources[0] ?? 0);
    } catch (err: any) {
      callback(err);
    }
  }

  // Wipe all sessions (admin reset)
  async clear(callback?: (err?: any) => void): Promise<void> {
    try {
      const c = await getContainer();
      // Delete and recreate container (faster than deleting items one by one)
      await c.delete();
      await getContainer(); // Recreates
      callback?.();
    } catch (err: any) {
      callback?.(err);
    }
  }

  // Touch — update TTL without changing session data
  async touch(
    sid: string,
    session: Express.SessionData,
    callback?: (err?: any) => void,
  ): Promise<void> {
    // Equivalent to set() for Cosmos (upsert updates TTL)
    return this.set(sid, session, callback);
  }
}
