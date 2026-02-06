import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ServerStatusSchema } from "@mc-bot/shared";
import { StructuredLogger } from "../utils/logger.js";
import {
  getCraftyServerId,
  getCraftyServerPublic,
  getCraftyServerStats,
  isCraftyConfigured,
  logCraftyWarning,
} from "../utils/craftyApi.js";

const logger = new StructuredLogger("status");

export default async function statusRoutes(fastify: FastifyInstance) {
  fastify.get("/status", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let statusPayload = {
        online: true,
        playerCount: 0,
        maxPlayers: 0,
        ping: 0,
        tps: 0,
        cpuUsage: 0,
        ramUsage: 0,
        uptime: 0,
      };

      if (isCraftyConfigured()) {
        const serverId = getCraftyServerId();
        if (serverId) {
          const [stats, publicInfo] = await Promise.all([
            getCraftyServerStats(serverId),
            getCraftyServerPublic(serverId).catch(() => null),
          ]);

          const online = Boolean(
            stats?.online ??
              stats?.running ??
              stats?.status === "running"
          );
          const playerCount = Number(
            stats?.player_count ?? stats?.players ?? stats?.playerCount ?? 0
          );
          const maxPlayers = Number(
            stats?.max_players ??
              stats?.maxPlayers ??
              publicInfo?.max_players ??
              0
          );
          const ping = Number(stats?.ping ?? 0);
          const tps = Number(stats?.tps ?? stats?.ticks_per_second ?? 0);
          const cpuUsage = Number(stats?.cpu_usage ?? stats?.cpuUsage ?? 0);
          const ramUsage = Number(stats?.memory_usage ?? stats?.memoryUsage ?? 0);
          const uptime = Number(stats?.uptime ?? 0);

          statusPayload = {
            online,
            playerCount,
            maxPlayers,
            ping,
            tps,
            cpuUsage,
            ramUsage,
            uptime,
          };
        } else {
          logCraftyWarning("CRAFTY_SERVER_ID not set; using default status values");
        }
      }

      const status = ServerStatusSchema.parse(statusPayload);

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
