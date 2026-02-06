import { z } from "zod";

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const APIKeyHeaderSchema = z.object({
  "x-api-key": z.string().min(1),
});

export const StatisticsSchema = z.object({
  serverStart: z.number(),
  requestCount: z.number(),
  errorCount: z.number(),
  averageResponseTime: z.number(),
});

export type Statistics = z.infer<typeof StatisticsSchema>;

// ============================================================================
// MODRINTH SEARCH RESPONSE
// ============================================================================

export const ModrinthSearchResponseSchema = z.object({
  hits: z.array(
    z.object({
      project_id: z.string(),
      project_type: z.string(),
      title: z.string(),
      description: z.string(),
      slug: z.string(),
      categories: z.array(z.string()),
      downloads: z.number(),
      follows: z.number(),
      icon_url: z.string().optional(),
      date_modified: z.string(),
    })
  ),
  offset: z.number(),
  limit: z.number(),
  total_hits: z.number(),
});

export type ModrinthSearchResponse = z.infer<
  typeof ModrinthSearchResponseSchema
>;

// ============================================================================
// PLUGIN MANAGEMENT
// ============================================================================

export const PluginListResponseSchema = z.object({
  plugins: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
      path: z.string(),
      size: z.number(),
      modrinthId: z.string().optional(),
      enabled: z.boolean(),
    })
  ),
  count: z.number(),
});

export type PluginListResponse = z.infer<typeof PluginListResponseSchema>;

// ============================================================================
// SERVER OPERATIONS
// ============================================================================

export const ServerRestartRequestSchema = z.object({
  delay: z.number().optional().default(0),
  notify: z.boolean().optional().default(false),
});

export type ServerRestartRequest = z.infer<typeof ServerRestartRequestSchema>;

export const ServerStatusDetailSchema = z.object({
  running: z.boolean(),
  players: z.number(),
  maxPlayers: z.number(),
  tps: z.number(),
  memory: z.object({
    used: z.number(),
    max: z.number(),
  }),
  uptime: z.number(),
});

export type ServerStatusDetail = z.infer<typeof ServerStatusDetailSchema>;

// ============================================================================
// FILE UPLOAD
// ============================================================================

export const FileUploadResponseSchema = z.object({
  success: z.boolean(),
  file: z.object({
    name: z.string(),
    size: z.number(),
    path: z.string(),
  }),
  message: z.string(),
});

export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;

// ============================================================================
// PAGINATION
// ============================================================================

export const PaginationSchema = z.object({
  offset: z.number().min(0),
  limit: z.number().min(1).max(100),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z.object({
    offset: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
});

export type PaginatedResponse<T = unknown> = z.infer<
  typeof PaginatedResponseSchema
> & { data: T[] };
