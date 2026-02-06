import dotenv from "dotenv";

dotenv.config();

export const config = {
  botToken: process.env.DISCORD_BOT_TOKEN,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  applicationId: process.env.DISCORD_APPLICATION_ID,
  backendUrl: process.env.BACKEND_URL || "http://localhost:3000",
  backendApiKey: process.env.BACKEND_API_KEY || process.env.API_KEY,
  environment: process.env.NODE_ENV || "production",
  logLevel: process.env.LOG_LEVEL || "info",
};

export function validateConfig(): void {
  if (!config.botToken) {
    throw new Error("DISCORD_BOT_TOKEN environment variable not set");
  }
  if (!config.backendApiKey) {
    throw new Error("BACKEND_API_KEY or API_KEY environment variable not set");
  }
}
