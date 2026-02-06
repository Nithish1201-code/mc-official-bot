import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { StructuredLogger } from "../utils/logger.js";

const logger = new StructuredLogger("server");

export default async function serverRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/server/restart",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { delay = 0 } = (request.body as { delay?: number }) || {};

        logger.info("Server restart requested", { delay });

        // Placeholder - would execute actual restart command
        // await executeServerCommand("restart");

        reply.send({
          success: true,
          message: `Server restart initiated${delay > 0 ? ` in ${delay}s` : ""}`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error(
          "Restart failed",
          error instanceof Error ? error : new Error(String(error))
        );
        reply.code(500).send({
          error: {
            code: "RESTART_FAILED",
            message: "Could not restart server",
            statusCode: 500,
          },
        });
      }
    }
  );

  fastify.post(
    "/server/stop",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info("Server stop requested");

        reply.send({
          success: true,
          message: "Server stop initiated",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error(
          "Stop failed",
          error instanceof Error ? error : new Error(String(error))
        );
        reply.code(500).send({
          error: {
            code: "STOP_FAILED",
            message: "Could not stop server",
            statusCode: 500,
          },
        });
      }
    }
  );
}
