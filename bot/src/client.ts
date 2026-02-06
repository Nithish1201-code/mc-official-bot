import { Client, GatewayIntentBits, Collection } from "discord.js";
import { StructuredLogger } from "./utils/logger.js";
import { config } from "./config.js";

const logger = new StructuredLogger("client");

export class BotClient extends Client {
  commands: Collection<string, any> = new Collection();
  slashCommands: Collection<string, any> = new Collection();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.on("ready", () => {
      logger.info(`Logged in as ${this.user?.tag}`);
    });

    this.on("error", (error) => {
      logger.error("Client error", error);
    });

    this.on("warn", (warning) => {
      logger.warn("Client warning", { warning });
    });
  }

  async login(): Promise<string> {
    if (!config.botToken) {
      throw new Error("DISCORD_BOT_TOKEN not set");
    }
    return super.login(config.botToken);
  }

  registerCommand(name: string, command: any): void {
    this.commands.set(name, command);
  }

  registerSlashCommand(name: string, command: any): void {
    this.slashCommands.set(name, command);
  }
}

export const client = new BotClient();
