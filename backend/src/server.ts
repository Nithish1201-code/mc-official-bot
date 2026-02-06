import Fastify from "fastify";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import pino from "pino";
import { type FastifyInstance, type FastifyRequest } from "fastify";
import { logger as baseLogger } from "./utils/logger.js";
import { config } from "./config.js";
import statusRoutes from "./routes/status.js";
import pluginRoutes from "./routes/plugins.js";
import modrinthRoutes from "./routes/modrinth.js";
import serverRoutes from "./routes/server.js";
import healthRoutes from "./routes/health.js";

const logger = baseLogger.child({ module: "server" });

export async function createServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
      transport:
        config.environment === "development"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
  });

  // =========================================================================
  // SECURITY & MIDDLEWARE
  // =========================================================================

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  await fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
  });

  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    allowList: ["127.0.0.1"],
    redis: undefined,
    skipOnError: true,
  });

  // File upload support
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 50, // 50MB
      files: 1,
    },
  });

  // =========================================================================
  // HEALTH ROUTES (Public)
  // =========================================================================

  await fastify.register(healthRoutes, { prefix: "/" });

  // =========================================================================
  // API KEY AUTHENTICATION
  // =========================================================================

  fastify.addHook("onRequest", async (request: FastifyRequest, reply) => {
    // Skip auth for health endpoints
    if (
      request.url === "/health" ||
      request.url === "/metrics" ||
      request.url === "/ping"
    ) {
      return;
    }

    const apiKey = request.headers["x-api-key"];

    if (!apiKey) {
      reply.code(401).send({
        error: {
          code: "MISSING_API_KEY",
          message: "API key required in X-API-Key header",
          statusCode: 401,
        },
      });
      return;
    }

    if (apiKey !== config.apiKey) {
      logger.warn({ providedKey: apiKey?.slice(0, 4) }, "Invalid API key");
      reply.code(401).send({
        error: {
          code: "INVALID_API_KEY",
          message: "Invalid API key",
          statusCode: 401,
        },
      });
      return;
    }
  });

  // =========================================================================
  // PROTECTED ROUTES
  // =========================================================================

  await fastify.register(statusRoutes, { prefix: "/api" });
  await fastify.register(pluginRoutes, { prefix: "/api" });
  await fastify.register(modrinthRoutes, { prefix: "/api" });
  await fastify.register(serverRoutes, { prefix: "/api" });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  fastify.setErrorHandler((error: Error, request: FastifyRequest, reply) => {
    logger.error({ error }, "Unhandled error");

    const statusCode =
      error instanceof Error && "statusCode" in error
        ? (error.statusCode as number)
        : 500;

    reply.code(statusCode).send({
      error: {
        code: error.name || "INTERNAL_ERROR",
        message: error.message || "Internal server error",
        statusCode,
      },
    });
  });

  return fastify;
}

export async function startServer(): Promise<void> {
  try {
    const fastify = await createServer();

    const port = config.port;
    const host = "0.0.0.0";

    await fastify.listen({ port, host });
    logger.info({ port, host }, "Server listening");
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
