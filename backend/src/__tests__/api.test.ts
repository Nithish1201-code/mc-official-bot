import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../server.js";
import type { FastifyInstance } from "fastify";

describe("Backend API Integration Tests", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    process.env.API_KEY = "test-api-key-12345678901234567890123456789012";
    process.env.MINECRAFT_PATH = "/tmp/test";
    server = await createServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe("Health Endpoints", () => {
    it("should respond to health check", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("healthy");
      expect(body).toHaveProperty("uptime");
      expect(body).toHaveProperty("memory");
    });

    it("should respond to ping", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/ping",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pong).toBe(true);
    });

    it("should return metrics", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/metrics",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("uptime");
      expect(body).toHaveProperty("memory");
    });
  });

  describe("Authentication", () => {
    it("should reject requests without API key", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/status",
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("MISSING_API_KEY");
    });

    it("should reject requests with invalid API key", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/status",
        headers: {
          "x-api-key": "wrong-key",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("INVALID_API_KEY");
    });

    it("should accept requests with valid API key", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/status",
        headers: {
          "x-api-key": "test-api-key-12345678901234567890123456789012",
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("Server Status", () => {
    it("should return server status", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/status",
        headers: {
          "x-api-key": "test-api-key-12345678901234567890123456789012",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("status");
      expect(body.status).toHaveProperty("online");
      expect(body.status).toHaveProperty("playerCount");
      expect(body.status).toHaveProperty("cpuUsage");
    });
  });

  describe("Modrinth Integration", () => {
    it("should reject search without query", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/modrinth/search",
        headers: {
          "x-api-key": "test-api-key-12345678901234567890123456789012",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("MISSING_QUERY");
    });

    it("should search modrinth with query", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/modrinth/search?q=fabric",
        headers: {
          "x-api-key": "test-api-key-12345678901234567890123456789012",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("hits");
      expect(Array.isArray(body.hits)).toBe(true);
    });
  });

  describe("Plugin Management", () => {
    it("should list plugins", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/plugins",
        headers: {
          "x-api-key": "test-api-key-12345678901234567890123456789012",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("plugins");
      expect(body).toHaveProperty("count");
    });

    it("should reject plugin install without required fields", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/plugins/install",
        headers: {
          "x-api-key": "test-api-key-12345678901234567890123456789012",
          "content-type": "application/json",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Server Control", () => {
    it("should handle restart request", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/server/restart",
        headers: {
          "x-api-key": "test-api-key-12345678901234567890123456789012",
          "content-type": "application/json",
        },
        payload: { delay: 0 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should handle stop request", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/server/stop",
        headers: {
          "x-api-key": "test-api-key-12345678901234567890123456789012",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });
});
