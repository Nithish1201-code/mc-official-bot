import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { HealthCheckSchema } from "@mc-bot/shared";

export default async function healthRoutes(fastify: FastifyInstance) {
  // Health check endpoint - no auth required
  fastify.get("/health", async (request: FastifyRequest, reply: FastifyReply) => {
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    const health = HealthCheckSchema.parse({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime,
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
      },
    });

    reply.send(health);
  });

  // Ping endpoint - no auth required
  fastify.get("/ping", async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ pong: true });
  });

  // Metrics endpoint
  fastify.get("/metrics", async (request: FastifyRequest, reply: FastifyReply) => {
    const memory = process.memoryUsage();
    reply.send({
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + " MB",
        rss: Math.round(memory.rss / 1024 / 1024) + " MB",
      },
      timestamp: new Date().toISOString(),
    });
  });
}
