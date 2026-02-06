import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { StructuredLogger } from "../utils/logger.js";
import {
  getCraftyServerId,
  isCraftyConfigured,
  runCraftyAction,
} from "../utils/craftyApi.js";

const logger = new StructuredLogger("server");

export default async function serverRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/server/start",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!isCraftyConfigured()) {
          reply.code(501).send({
            error: {
              code: "CRAFTY_NOT_CONFIGURED",
              message: "Crafty API not configured",
              statusCode: 501,
            },
          });
          return;
        }

        const serverId = getCraftyServerId();
        if (!serverId) {
          reply.code(400).send({
            error: {
              code: "CRAFTY_SERVER_ID_MISSING",
              message: "CRAFTY_SERVER_ID not set",
              statusCode: 400,
            },
          });
          return;
        }

        logger.info("Server start requested");
        await runCraftyAction(serverId, "start_server");

        reply.send({
          success: true,
          message: "Server start initiated",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error(
          "Start failed",
          error instanceof Error ? error : new Error(String(error))
        );
        reply.code(500).send({
          error: {
            code: "START_FAILED",
            message: "Could not start server",
            statusCode: 500,
          },
        });
      }
    }
  );

  fastify.post(
    "/server/restart",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { delay = 0 } = (request.body as { delay?: number }) || {};

        logger.info("Server restart requested", { delay });

        if (!isCraftyConfigured()) {
          reply.code(501).send({
            error: {
              code: "CRAFTY_NOT_CONFIGURED",
              message: "Crafty API not configured",
              statusCode: 501,
            },
          });
          return;
        }

        const serverId = getCraftyServerId();
        if (!serverId) {
          reply.code(400).send({
            error: {
              code: "CRAFTY_SERVER_ID_MISSING",
              message: "CRAFTY_SERVER_ID not set",
              statusCode: 400,
            },
          });
          return;
        }

        if (delay > 0) {
          setTimeout(() => {
            runCraftyAction(serverId, "restart_server").catch((err) => {
              logger.error(
                "Scheduled restart failed",
                err instanceof Error ? err : new Error(String(err))
              );
            });
          }, delay * 1000);
        } else {
          await runCraftyAction(serverId, "restart_server");
        }

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

        if (!isCraftyConfigured()) {
          reply.code(501).send({
            error: {
              code: "CRAFTY_NOT_CONFIGURED",
              message: "Crafty API not configured",
              statusCode: 501,
            },
          });
          return;
        }

        const serverId = getCraftyServerId();
        if (!serverId) {
          reply.code(400).send({
            error: {
              code: "CRAFTY_SERVER_ID_MISSING",
              message: "CRAFTY_SERVER_ID not set",
              statusCode: 400,
            },
          });
          return;
        }

        await runCraftyAction(serverId, "stop_server");

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
