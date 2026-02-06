import { REST, Routes } from "discord.js";
import { client } from "./client.js";
import { config, validateConfig } from "./config.js";
import { statusCommand, restartCommand, pluginsCommand } from "./commands/index.js";
import { setupEventHandlers } from "./events/index.js";
import { StructuredLogger } from "./utils/logger.js";

const logger = new StructuredLogger("main");

async function registerCommands(): Promise<void> {
  const commands = [
    statusCommand.data.toJSON(),
    restartCommand.data.toJSON(),
    pluginsCommand.data.toJSON(),
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

    // Register commands
    client.registerSlashCommand("status", statusCommand);
    client.registerSlashCommand("restart", restartCommand);
    client.registerSlashCommand("plugins", pluginsCommand);

    // Setup event handlers
    setupEventHandlers();

    // Register with Discord
    await registerCommands();

    // Login
    await client.login();

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
