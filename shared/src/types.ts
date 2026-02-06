import { z } from "zod";

// ============================================================================
// CORE TYPES
// ============================================================================

export const ServerStatusSchema = z.object({
  online: z.boolean(),
  playerCount: z.number().min(0),
  maxPlayers: z.number().min(0),
  ping: z.number().min(0),
  cpuUsage: z.number().min(0).max(100),
  ramUsage: z.number().min(0).max(100),
  uptime: z.number().min(0),
});

export type ServerStatus = z.infer<typeof ServerStatusSchema>;

export const PluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  path: z.string(),
  size: z.number(),
  modrinthId: z.string().optional(),
});

export type Plugin = z.infer<typeof PluginSchema>;

export const ModrinthProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  slug: z.string(),
  downloads: z.number(),
  follows: z.number(),
  categories: z.array(z.string()),
  icon_url: z.string().optional(),
  project_type: z.enum(["mod", "modpack", "plugin", "shader"]),
});

export type ModrinthProject = z.infer<typeof ModrinthProjectSchema>;

export const ModrinthVersionSchema = z.object({
  id: z.string(),
  version_number: z.string(),
  name: z.string(),
  date_published: z.string(),
  downloads: z.number(),
  loaders: z.array(z.string()),
  game_versions: z.array(z.string()),
  files: z.array(
    z.object({
      url: z.string(),
      filename: z.string(),
      size: z.number(),
      file_type: z.string().optional(),
    })
  ),
});

export type ModrinthVersion = z.infer<typeof ModrinthVersionSchema>;

export const ConfigSchema = z.object({
  apiKey: z.string(),
  port: z.number().min(1024).max(65535).default(3000),
  botToken: z.string().optional(),
  botPublicKey: z.string().optional(),
  minecraftPath: z.string(),
  craftyPath: z.string().optional(),
  environment: z.enum(["development", "production"]).default("production"),
  logging: z.object({
    level: z.enum(["error", "warn", "info", "debug"]).default("info"),
    format: z.enum(["json", "text"]).default("json"),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

// ============================================================================
// API ERROR HANDLING
// ============================================================================

export class APIError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "APIError";
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    statusCode: z.number(),
    details: z.record(z.unknown()).optional(),
  }),
});

// ============================================================================
// CRAFTY INTEGRATION
// ============================================================================

export interface CraftyDetectionResult {
  found: boolean;
  path?: string;
  version?: string;
  servers?: string[];
}

export interface CraftyServer {
  name: string;
  path: string;
  port: number;
  status: "running" | "stopped";
}

// ============================================================================
// MODRINTH INTEGRATION
// ============================================================================

export interface ModrinthSearchFilters {
  query: string;
  gameVersions?: string[];
  loaders?: string[];
  projectType?: string;
  limit?: number;
  offset?: number;
}

export interface ModrinthSearchResult {
  hits: ModrinthProject[];
  offset: number;
  limit: number;
  total_hits: number;
}

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const InstallPluginRequestSchema = z.object({
  projectId: z.string(),
  versionId: z.string(),
});

export type InstallPluginRequest = z.infer<typeof InstallPluginRequestSchema>;

export const RestartServerResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
});

export type RestartServerResponse = z.infer<
  typeof RestartServerResponseSchema
>;

export const StatusResponseSchema = z.object({
  status: ServerStatusSchema,
  timestamp: z.string(),
  uptime: z.number(),
});

export type StatusResponse = z.infer<typeof StatusResponseSchema>;

// ============================================================================
// DISCORD BOT TYPES
// ============================================================================

export interface BotCommandContext {
  guildId: string;
  userId: string;
  channelId: string;
  timestamp: number;
}

export interface BotEmbedData {
  title: string;
  description: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  image?: { url: string };
  thumbnail?: { url: string };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export const HealthCheckSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string(),
  uptime: z.number(),
  memory: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    external: z.number(),
    rss: z.number(),
  }),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;
