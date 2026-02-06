import { REST, Routes } from "discord.js";
import { client } from "./client.js";
import { config, validateConfig } from "./config.js";
import { statusCommand, restartCommand, pluginsCommand, serverCommand } from "./commands/index.js";
import { setupEventHandlers } from "./events/index.js";
import { StructuredLogger } from "./utils/logger.js";
import { BackendAPI } from "./utils/api.js";

const logger = new StructuredLogger("main");

function startStatusMonitor(api: BackendAPI): void {
  if (!config.alertChannelId) {
    return;
  }

  const alertChannelId = config.alertChannelId;

  let lastOnline: boolean | null = null;
  const intervalMs = Math.max(15, config.statusPollSeconds) * 1000;

  setInterval(async () => {
    try {
      const status = await api.getStatus();
      const online = Boolean(status?.status?.online);

      if (lastOnline === null) {
        lastOnline = online;
        return;
      }

      if (online !== lastOnline) {
        lastOnline = online;
        const channel = await client.channels.fetch(alertChannelId);
        const textChannel =
          channel && "send" in channel
            ? (channel as { send: (options: { content: string }) => Promise<unknown> })
            : null;
        if (textChannel) {
          const message = online
            ? "🟢 Server is back online."
            : "🔴 Server appears offline.";
          await textChannel.send({ content: message });
        }

        if (!online && config.autoRestartOnDown) {
          try {
            await api.restartServer(0);
            if (textChannel) {
              await textChannel.send({
                content: "🔁 Auto-restart triggered.",
              });
            }
          } catch (error) {
            logger.warn("Auto-restart failed", {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    } catch (error) {
      logger.warn("Status monitor failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, intervalMs);
}

async function registerCommands(): Promise<void> {
  const commands = [
    statusCommand.data.toJSON(),
    restartCommand.data.toJSON(),
    pluginsCommand.data.toJSON(),
    serverCommand.data.toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(config.botToken!);

  try {
    logger.info("Registering slash commands");

    await rest.put(
      Routes.applicationCommands(config.applicationId!),
      { body: commands }
    );

    logger.info("Slash commands registered successfully");
  } catch (error) {
    logger.error(
      "Failed to register commands",
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

async function main(): Promise<void> {
  try {
    validateConfig();

    const api = new BackendAPI(config.backendUrl, config.backendApiKey!);

    // Register commands
    client.registerSlashCommand("status", statusCommand);
    client.registerSlashCommand("restart", restartCommand);
    client.registerSlashCommand("plugins", pluginsCommand);
    client.registerSlashCommand("server", serverCommand);

    // Setup event handlers
    setupEventHandlers();

    // Register with Discord
    await registerCommands();

    // Login
    await client.login();

    startStatusMonitor(api);

    logger.info("Bot started successfully");
  } catch (error) {
    logger.error(
      "Failed to start bot",
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}

main();
