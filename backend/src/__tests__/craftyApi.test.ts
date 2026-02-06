import { describe, it, expect, vi, beforeEach } from "vitest";

const createMockClient = () => ({
  get: vi.fn().mockResolvedValue({ data: [{ server_id: "1" }] }),
  post: vi.fn().mockResolvedValue({ data: { ok: true } }),
});

vi.mock("axios", () => {
  return {
    default: {
      create: vi.fn(() => createMockClient()),
    },
  };
});

describe("Crafty API client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CRAFTY_API_URL = "https://localhost:8443";
    process.env.CRAFTY_API_TOKEN = "test-token";
  });

  it("lists servers when configured", async () => {
    const { listCraftyServers } = await import("../utils/craftyApi.js");
    const servers = await listCraftyServers();
    expect(Array.isArray(servers)).toBe(true);
  });
});
