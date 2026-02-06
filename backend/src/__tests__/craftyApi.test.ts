import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Crafty API client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists servers when configured (live if env present)", async () => {
    const liveUrl = process.env.CRAFTY_API_URL;
    const liveToken = process.env.CRAFTY_API_TOKEN;

    if (liveUrl && liveToken) {
      const { listCraftyServers } = await import("../utils/craftyApi.js");
      try {
        const servers = await listCraftyServers();
        expect(Array.isArray(servers)).toBe(true);
      } catch (error) {
        throw new Error(
          "Crafty API is configured but unreachable. Check CRAFTY_API_URL/CRAFTY_API_TOKEN and Crafty availability."
        );
      }
      return;
    }

    const createMockClient = () => ({
      get: vi.fn().mockResolvedValue({ data: [{ server_id: "1" }] }),
      post: vi.fn().mockResolvedValue({ data: { ok: true } }),
    });

    vi.doMock("axios", () => {
      return {
        default: {
          create: vi.fn(() => createMockClient()),
        },
      };
    });

    process.env.CRAFTY_API_URL = "https://localhost:8443";
    process.env.CRAFTY_API_TOKEN = "test-token";

    const { listCraftyServers } = await import("../utils/craftyApi.js");
    const servers = await listCraftyServers();
    expect(Array.isArray(servers)).toBe(true);
  });
});
