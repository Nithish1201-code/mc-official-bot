import { describe, it, expect, vi } from "vitest";
import { BackendAPI } from "../utils/api.js";

describe("Bot API Client", () => {
  const mockApiKey = "test-key-123";
  const mockBaseUrl = "http://localhost:3000";

  describe("BackendAPI", () => {
    it("should create API client with correct config", () => {
      const api = new BackendAPI(mockBaseUrl, mockApiKey);
      expect(api).toBeDefined();
    });

    it("should include API key in headers", () => {
      const api = new BackendAPI(mockBaseUrl, mockApiKey);
      // @ts-ignore - accessing private method for testing
      const headers = api.getHeaders();
      expect(headers["X-API-Key"]).toBe(mockApiKey);
    });
  });
});

describe("Embed Utilities", () => {
  it("should create status embed", async () => {
    const { createStatusEmbed } = await import("../utils/embeds.js");
    
    const mockStatus = {
      status: {
        online: true,
        playerCount: 5,
        maxPlayers: 20,
        ping: 35,
        tps: 19.9,
        cpuUsage: 45.2,
        ramUsage: 60.1,
        uptime: 3600,
      },
      timestamp: new Date().toISOString(),
    };

    const embed = createStatusEmbed(mockStatus);
    expect(embed).toBeDefined();
    expect(embed.data.title).toContain("Server Status");
  });

  it("should create error embed", async () => {
    const { createErrorEmbed } = await import("../utils/embeds.js");
    
    const embed = createErrorEmbed("Test Error", "Error description");
    expect(embed).toBeDefined();
    expect(embed.data.title).toContain("Test Error");
    expect(embed.data.description).toBe("Error description");
  });

  it("should create success embed", async () => {
    const { createSuccessEmbed } = await import("../utils/embeds.js");
    
    const embed = createSuccessEmbed("Success", "Operation completed");
    expect(embed).toBeDefined();
    expect(embed.data.title).toContain("Success");
  });
});
