import { describe, it, expect } from "vitest";
import {
  ServerStatusSchema,
  PluginSchema,
  ModrinthProjectSchema,
  ConfigSchema,
  APIError,
} from "../types.js";

describe("Shared Types Validation", () => {
  describe("ServerStatus", () => {
    it("should validate valid server status", () => {
      const validStatus = {
        online: true,
        playerCount: 5,
        maxPlayers: 20,
        ping: 35,
        cpuUsage: 45.2,
        ramUsage: 60.1,
        uptime: 3600,
      };

      const result = ServerStatusSchema.safeParse(validStatus);
      expect(result.success).toBe(true);
    });

    it("should reject negative player count", () => {
      const invalidStatus = {
        online: true,
        playerCount: -1,
        maxPlayers: 20,
        ping: 35,
        cpuUsage: 45.2,
        ramUsage: 60.1,
        uptime: 3600,
      };

      const result = ServerStatusSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });

    it("should reject CPU usage over 100", () => {
      const invalidStatus = {
        online: true,
        playerCount: 5,
        maxPlayers: 20,
        ping: 35,
        cpuUsage: 150,
        ramUsage: 60.1,
        uptime: 3600,
      };

      const result = ServerStatusSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });
  });

  describe("Plugin", () => {
    it("should validate valid plugin", () => {
      const validPlugin = {
        id: "plugin-123",
        name: "TestPlugin",
        version: "1.0.0",
        path: "/plugins/test.jar",
        size: 5242880,
        modrinthId: "test-mod",
      };

      const result = PluginSchema.safeParse(validPlugin);
      expect(result.success).toBe(true);
    });

    it("should allow plugin without modrinthId", () => {
      const validPlugin = {
        id: "plugin-123",
        name: "TestPlugin",
        version: "1.0.0",
        path: "/plugins/test.jar",
        size: 5242880,
      };

      const result = PluginSchema.safeParse(validPlugin);
      expect(result.success).toBe(true);
    });
  });

  describe("ModrinthProject", () => {
    it("should validate modrinth project", () => {
      const validProject = {
        id: "fabric-api",
        title: "Fabric API",
        description: "Essential API",
        slug: "fabric-api",
        downloads: 1000000,
        follows: 50000,
        categories: ["library"],
        icon_url: "https://example.com/icon.png",
        project_type: "mod",
      };

      const result = ModrinthProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it("should reject invalid project type", () => {
      const invalidProject = {
        id: "test",
        title: "Test",
        description: "Test",
        slug: "test",
        downloads: 100,
        follows: 10,
        categories: ["test"],
        project_type: "invalid",
      };

      const result = ModrinthProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });
  });

  describe("Config", () => {
    it("should validate valid config", () => {
      const validConfig = {
        apiKey: "test-key-12345678901234567890123456789012",
        port: 3000,
        minecraftPath: "/opt/minecraft",
        environment: "production",
        logging: {
          level: "info",
          format: "json",
        },
      };

      const result = ConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it("should apply defaults", () => {
      const minimalConfig = {
        apiKey: "test-key",
        minecraftPath: "/opt/minecraft",
      };

      const result = ConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(3000);
        expect(result.data.environment).toBe("production");
      }
    });

    it("should reject invalid port", () => {
      const invalidConfig = {
        apiKey: "test-key",
        port: 100,
        minecraftPath: "/opt/minecraft",
      };

      const result = ConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe("APIError", () => {
    it("should create API error with all fields", () => {
      const error = new APIError(
        "TEST_ERROR",
        400,
        "Test error message",
        { field: "value" }
      );

      expect(error.code).toBe("TEST_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Test error message");
      expect(error.details).toEqual({ field: "value" });
      expect(error.name).toBe("APIError");
    });
  });
});
