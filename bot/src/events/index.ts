import { Events, Interaction } from "discord.js";
import { client } from "../client.js";
import { BackendAPI } from "../utils/api.js";
import { StructuredLogger } from "../utils/logger.js";
import { config } from "../config.js";

const logger = new StructuredLogger("events");

const api = new BackendAPI(config.backendUrl, config.backendApiKey!);

export function setupEventHandlers(): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) {
      logger.warn("Unknown command", { command: interaction.commandName });
      return;
    }

    try {
      await command.execute(interaction, api);
    } catch (error) {
      logger.error(
        "Command execution failed",
        error instanceof Error ? error : new Error(String(error)),
        { command: interaction.commandName }
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "An error occurred while executing this command.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "An error occurred while executing this command.",
          ephemeral: true,
        });
      }
    }
  });
}
