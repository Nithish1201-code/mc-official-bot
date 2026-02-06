import { ConfigSchema } from "@mc-bot/shared";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  const envPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../.env"
  );
  dotenv.config({ path: envPath });
}

const rawConfig = {
  apiKey: process.env.API_KEY || "dev-key-change-in-production",
  port: parseInt(process.env.PORT || "3000", 10),
  botToken: process.env.DISCORD_BOT_TOKEN,
  botPublicKey: process.env.DISCORD_PUBLIC_KEY,
  minecraftPath:
    process.env.MINECRAFT_PATH ||
    process.env.HOME ||
    "/" + "opt/minecraft",
  craftyPath: process.env.CRAFTY_PATH,
  craftyApiUrl: process.env.CRAFTY_API_URL,
  craftyApiToken: process.env.CRAFTY_API_TOKEN,
  craftyServerId: process.env.CRAFTY_SERVER_ID,
  craftyAllowInsecure: process.env.CRAFTY_ALLOW_INSECURE === "true",
  serverLoader: process.env.SERVER_LOADER as
    | "paper"
    | "spigot"
    | "bukkit"
    | "fabric"
    | "vanilla"
    | undefined,
  minecraftVersion: process.env.MINECRAFT_VERSION,
  environment:
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "production",
  logging: {
    level: (process.env.LOG_LEVEL || "info") as
      | "error"
      | "warn"
      | "info"
      | "debug",
    format: (process.env.LOG_FORMAT || "json") as "json" | "text",
  },
};

export const config = ConfigSchema.parse(rawConfig);

export function validateConfig(): void {
  if (!config.apiKey || config.apiKey === "dev-key-change-in-production") {
    throw new Error(
      "API_KEY environment variable not set. Generate with: openssl rand -hex 32"
    );
  }

  if (!config.minecraftPath) {
    throw new Error("MINECRAFT_PATH environment variable required");
  }
}
