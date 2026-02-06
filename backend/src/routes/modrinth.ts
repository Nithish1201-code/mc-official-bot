import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { searchModrinth } from "../utils/modrinth.js";
import { StructuredLogger } from "../utils/logger.js";

const logger = new StructuredLogger("modrinth");

export default async function modrinthRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/modrinth/search",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { q, limit = "10", offset = "0" } = request.query as {
          q?: string;
          limit?: string;
          offset?: string;
        };

        if (!q) {
          reply.code(400).send({
            error: {
              code: "MISSING_QUERY",
              message: "Query parameter 'q' is required",
              statusCode: 400,
            },
          });
          return;
        }

        logger.info("Modrinth search", { query: q, limit, offset });

        const results = await searchModrinth(q, {
          limit: parseInt(limit, 10),
          offset: parseInt(offset as string, 10),
        });

        reply.send(results);
      } catch (error) {
        logger.error(
          "Modrinth search failed",
          error instanceof Error ? error : new Error(String(error))
        );
        reply.code(500).send({
          error: {
            code: "MODRINTH_SEARCH_FAILED",
            message: "Failed to search Modrinth",
            statusCode: 500,
          },
        });
      }
    }
  );
}
