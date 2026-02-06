import dotenv from "dotenv";

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  dotenv.config();
}

export const config = {
  botToken: process.env.DISCORD_BOT_TOKEN,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  applicationId: process.env.DISCORD_APPLICATION_ID,
  backendUrl: process.env.BACKEND_URL || "http://localhost:3000",
  backendApiKey: process.env.BACKEND_API_KEY || process.env.API_KEY,
  adminRoleIds: (process.env.BOT_ADMIN_ROLE_IDS || "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean),
  alertChannelId: process.env.BOT_ALERT_CHANNEL_ID,
  statusPollSeconds: Number(process.env.BOT_STATUS_POLL_SECONDS || "60"),
  autoRestartOnDown: process.env.BOT_AUTO_RESTART_ON_DOWN === "true",
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
