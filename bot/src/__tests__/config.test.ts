import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("Bot config validation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.DOTENV_CONFIG_PATH = "/dev/null";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("throws when required env vars are missing", async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.BACKEND_API_KEY;
    delete process.env.API_KEY;

    const { validateConfig } = await import("../config.js");

    expect(() => validateConfig()).toThrow(
      /DISCORD_BOT_TOKEN environment variable not set/
    );
  });

  it("accepts valid required env vars", async () => {
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.BACKEND_API_KEY = "test-api-key";

    const { validateConfig } = await import("../config.js");

    expect(() => validateConfig()).not.toThrow();
  });
});