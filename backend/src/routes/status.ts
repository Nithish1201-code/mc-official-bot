import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ServerStatusSchema } from "@mc-bot/shared";
import { StructuredLogger } from "../utils/logger.js";

const logger = new StructuredLogger("status");

export default async function statusRoutes(fastify: FastifyInstance) {
  fastify.get("/status", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Placeholder implementation - would query actual server
      const status = ServerStatusSchema.parse({
        online: true,
        playerCount: 5,
        maxPlayers: 20,
        ping: 35,
        cpuUsage: 45.2,
        ramUsage: 60.1,
        uptime: 3600,
      });

      reply.send({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      logger.error(
        "Status endpoint error",
        error instanceof Error ? error : new Error(String(error))
      );
      reply.code(500).send({
        error: {
          code: "STATUS_CHECK_FAILED",
          message: "Could not retrieve server status",
          statusCode: 500,
        },
      });
    }
  });
}
