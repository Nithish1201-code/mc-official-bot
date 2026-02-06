import "dotenv/config";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Crafty API client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists servers when configured (live only)", async () => {
    const liveUrl = process.env.CRAFTY_API_URL;
    const liveToken = process.env.CRAFTY_API_TOKEN;

    if (!liveUrl || !liveToken) {
      throw new Error(
        "CRAFTY_API_URL and CRAFTY_API_TOKEN must be set to run Crafty API tests."
      );
    }

    const { listCraftyServers } = await import("../utils/craftyApi.js");
    try {
      const servers = await listCraftyServers();
      expect(Array.isArray(servers)).toBe(true);
    } catch (error) {
      throw new Error(
        "Crafty API is configured but unreachable. Check CRAFTY_API_URL/CRAFTY_API_TOKEN and Crafty availability."
      );
    }
  });
});
