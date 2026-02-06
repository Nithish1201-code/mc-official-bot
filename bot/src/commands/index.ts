import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} from "discord.js";
import { BackendAPI } from "../utils/api.js";
import { createStatusEmbed, createErrorEmbed, createSuccessEmbed } from "../utils/embeds.js";
import { StructuredLogger } from "../utils/logger.js";
import { config } from "../config.js";

const logger = new StructuredLogger("commands");
const statusPanelIntervals = new Map<string, NodeJS.Timeout>();

function hasAdminRoleFromMember(member: any): boolean {
  if (config.adminRoleIds.length === 0) {
    return true;
  }

  const roles = member?.roles?.cache;
  if (!roles) {
    return false;
  }

  return roles.some((role: any) => config.adminRoleIds.includes(role.id));
}

function hasAdminRole(interaction: ChatInputCommandInteraction): boolean {
  if (config.adminRoleIds.length === 0) {
    return true;
  }

  if (!interaction.inGuild()) {
    return false;
  }

  return hasAdminRoleFromMember(interaction.member as any);
}

async function ensureAdmin(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (hasAdminRole(interaction)) {
    return true;
  }

  const embed = createErrorEmbed(
    "Permission Denied",
    "You do not have permission to run this command"
  );
  await interaction.reply({ embeds: [embed], ephemeral: true });
  return false;
}

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  execute(
    interaction: ChatInputCommandInteraction,
    api: BackendAPI
  ): Promise<void>;
}

export const statusCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check the Minecraft server status")
    .addBooleanOption((option) =>
      option
        .setName("panel")
        .setDescription("Create an auto-updating status panel")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, api: BackendAPI) {
    try {
      await interaction.deferReply();

      const makeStatusEmbed = async () => {
        const status = await api.getStatus();
        return createStatusEmbed(status);
      };

      const isPanel = interaction.options.getBoolean("panel") || false;
      const embed = await makeStatusEmbed();
      const replyMessage = await interaction.editReply({ embeds: [embed] });

      if (isPanel) {
        const existing = statusPanelIntervals.get(replyMessage.id);
        if (existing) {
          clearInterval(existing);
        }

        const interval = setInterval(async () => {
          try {
            const updatedEmbed = await makeStatusEmbed();
            await replyMessage.edit({ embeds: [updatedEmbed] });
          } catch (error) {
            logger.warn("Status panel update failed", {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }, 60000);

        statusPanelIntervals.set(replyMessage.id, interval);

        setTimeout(() => {
          const timer = statusPanelIntervals.get(replyMessage.id);
          if (timer) {
            clearInterval(timer);
            statusPanelIntervals.delete(replyMessage.id);
          }
        }, 60 * 60 * 1000);
      }
    } catch (error) {
      logger.error(
        "Status command failed",
        error instanceof Error ? error : new Error(String(error))
      );
      const errorEmbed = createErrorEmbed(
        "Status Failed",
        "Could not fetch server status"
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

export const restartCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart the Minecraft server")
    .addNumberOption((option) =>
      option
        .setName("delay")
        .setDescription("Delay in seconds before restart")
        .setMinValue(0)
        .setMaxValue(300)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, api: BackendAPI) {
    try {
      if (!(await ensureAdmin(interaction))) {
        return;
      }

      await interaction.deferReply();

      const delay = interaction.options.getNumber("delay") || 0;
      const result = await api.restartServer(delay);

      const embed = new EmbedBuilder()
        .setTitle("✅ Restart Initiated")
        .setDescription(`Server restart initiated${delay > 0 ? ` in ${delay}s` : ""}`)
        .setColor("Green")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error(
        "Restart command failed",
        error instanceof Error ? error : new Error(String(error))
      );
      const errorEmbed = createErrorEmbed(
        "Restart Failed",
        "Could not restart server"
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

export const serverCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Server control actions")
    .addSubcommand((subcommand) =>
      subcommand.setName("start").setDescription("Start the server")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("stop").setDescription("Stop the server")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("restart")
        .setDescription("Restart the server")
        .addNumberOption((option) =>
          option
            .setName("delay")
            .setDescription("Delay in seconds before restart")
            .setMinValue(0)
            .setMaxValue(300)
            .setRequired(false)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, api: BackendAPI) {
    if (!(await ensureAdmin(interaction))) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply();

    try {
      if (subcommand === "start") {
        await api.startServer();
        const embed = createSuccessEmbed("Server Start", "Server start initiated");
        await interaction.editReply({ embeds: [embed] });
      } else if (subcommand === "stop") {
        await api.stopServer();
        const embed = createSuccessEmbed("Server Stop", "Server stop initiated");
        await interaction.editReply({ embeds: [embed] });
      } else {
        const delay = interaction.options.getNumber("delay") || 0;
        await api.restartServer(delay);
        const embed = createSuccessEmbed(
          "Server Restart",
          `Server restart initiated${delay > 0 ? ` in ${delay}s` : ""}`
        );
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error(
        "Server control failed",
        error instanceof Error ? error : new Error(String(error))
      );
      const embed = createErrorEmbed(
        "Server Command Failed",
        "Server action could not be completed"
      );
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

// Interactive Plugin Browser with Pagination
export const pluginsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("plugins")
    .setDescription("Browse and manage plugins")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("browse")
        .setDescription("Browse Modrinth plugins with interactive UI")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Search query (optional)")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Filter by category")
            .setRequired(false)
            .addChoices(
              { name: "All", value: "all" },
              { name: "Adventure", value: "adventure" },
              { name: "Economy", value: "economy" },
              { name: "Magic", value: "magic" },
              { name: "Optimization", value: "optimization" },
              { name: "Technology", value: "technology" },
              { name: "Utility", value: "utility" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List installed plugins")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("install")
        .setDescription("Install a plugin by ID")
        .addStringOption((option) =>
          option
            .setName("project_id")
            .setDescription("Modrinth project ID")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("update")
        .setDescription("Update a plugin by Modrinth project ID")
        .addStringOption((option) =>
          option
            .setName("project_id")
            .setDescription("Modrinth project ID")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("upload")
        .setDescription("Upload a plugin jar")
        .addAttachmentOption((option) =>
          option
            .setName("file")
            .setDescription("Plugin jar file")
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, api: BackendAPI) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "browse") {
      await handlePluginBrowse(interaction, api);
    } else if (subcommand === "list") {
      await handlePluginList(interaction, api);
    } else if (subcommand === "install") {
      if (!(await ensureAdmin(interaction))) {
        return;
      }
      await handlePluginInstall(interaction, api);
    } else if (subcommand === "update") {
      if (!(await ensureAdmin(interaction))) {
        return;
      }
      await handlePluginUpdate(interaction, api);
    } else if (subcommand === "upload") {
      if (!(await ensureAdmin(interaction))) {
        return;
      }
      await handlePluginUpload(interaction, api);
    }
  },
};

async function handlePluginBrowse(
  interaction: ChatInputCommandInteraction,
  api: BackendAPI
) {
  try {
    await interaction.deferReply();

    const query = interaction.options.getString("query") || "plugin";
    const category = interaction.options.getString("category") || "all";
    
    let currentPage = 0;
    const pageSize = 5;

    const searchResults = await api.searchModrinth(query, 25);
    
    if (searchResults.hits.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle("🔍 No Plugins Found")
        .setDescription(`No plugins found for "${query}"`)
        .setColor("Yellow");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const createPluginPage = (page: number) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const plugins = searchResults.hits.slice(start, end);
      
      const embed = new EmbedBuilder()
        .setTitle(`📦 Plugin Browser - "${query}"`)
        .setDescription(`Browse and install plugins from Modrinth`)
        .setColor("Blurple")
        .setFooter({
          text: `Page ${page + 1}/${Math.ceil(searchResults.hits.length / pageSize)} • ${searchResults.total_hits} total results`,
        });

      plugins.forEach((plugin: any, index: number) => {
        embed.addFields({
          name: `${start + index + 1}. ${plugin.title}`,
          value: [
            `📝 ${plugin.description.substring(0, 100)}${plugin.description.length > 100 ? "..." : ""}`,
            `📥 ${plugin.downloads.toLocaleString()} downloads`,
            `⭐ ${plugin.follows.toLocaleString()} followers`,
            `🆔 \`${plugin.project_id}\``,
          ].join("\n"),
          inline: false,
        });
      });

      return embed;
    };

    const createButtons = (page: number) => {
      const totalPages = Math.ceil(searchResults.hits.length / pageSize);
      
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀ Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ▶")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages - 1),
        new ButtonBuilder()
          .setCustomId("refresh")
          .setLabel("🔄 Refresh")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("install")
          .setLabel("📥 Install")
          .setStyle(ButtonStyle.Success)
      );
    };

    const createSelectMenu = (page: number) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const plugins = searchResults.hits.slice(start, end);
      
      return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_plugin")
          .setPlaceholder("Select a plugin to view details")
          .addOptions(
            plugins.map((plugin: any, index: number) => ({
              label: plugin.title.substring(0, 100),
              description: `${plugin.downloads.toLocaleString()} downloads`,
              value: plugin.project_id,
            }))
          )
      );
    };

    const message = await interaction.editReply({
      embeds: [createPluginPage(currentPage)],
      components: [createSelectMenu(currentPage), createButtons(currentPage)],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000, // 5 minutes
    });

    const selectCollector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: "This menu is not for you!",
          ephemeral: true,
        });
        return;
      }

      if (i.customId === "prev") {
        currentPage = Math.max(0, currentPage - 1);
      } else if (i.customId === "next") {
        const totalPages = Math.ceil(searchResults.hits.length / pageSize);
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      } else if (i.customId === "refresh") {
        // Refresh search results
        const newResults = await api.searchModrinth(query, 25);
        searchResults.hits = newResults.hits;
      } else if (i.customId === "install") {
        await i.reply({
          content: "Select a plugin from the dropdown menu, then click Install!",
          ephemeral: true,
        });
        return;
      }

      await i.update({
        embeds: [createPluginPage(currentPage)],
        components: [createSelectMenu(currentPage), createButtons(currentPage)],
      });
    });

    selectCollector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: "This menu is not for you!",
          ephemeral: true,
        });
        return;
      }

      const projectId = i.values[0];
      const plugin = searchResults.hits.find((p: any) => p.project_id === projectId);

      if (plugin) {
        const detailEmbed = new EmbedBuilder()
          .setTitle(`📦 ${plugin.title}`)
          .setDescription(plugin.description)
          .setColor("Green")
          .addFields(
            { name: "Project ID", value: `\`${plugin.project_id}\``, inline: true },
            { name: "Downloads", value: plugin.downloads.toLocaleString(), inline: true },
            { name: "Followers", value: plugin.follows.toLocaleString(), inline: true },
            { name: "Categories", value: plugin.categories.join(", ") || "None", inline: false }
          )
          .setTimestamp();

        if (plugin.icon_url) {
          detailEmbed.setThumbnail(plugin.icon_url);
        }

        const installButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`install_${projectId}`)
            .setLabel("📥 Install Plugin")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("back")
            .setLabel("⬅ Back to Browse")
            .setStyle(ButtonStyle.Secondary)
        );

        await i.update({
          embeds: [detailEmbed],
          components: [installButton],
        });

        // Handle install button
        const installCollector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60000,
        });

        installCollector.on("collect", async (btnI) => {
          if (btnI.customId.startsWith("install_")) {
            if (!hasAdminRoleFromMember(btnI.member)) {
              const errorEmbed = createErrorEmbed(
                "Permission Denied",
                "You do not have permission to install plugins"
              );
              await btnI.reply({ embeds: [errorEmbed], ephemeral: true });
              return;
            }

            await btnI.deferUpdate();
            try {
              await api.installPlugin(projectId);
              const successEmbed = createSuccessEmbed(
                "Plugin Installed",
                `${plugin.title} has been installed successfully!`
              );
              await btnI.followUp({ embeds: [successEmbed], ephemeral: true });
            } catch (error) {
              const errorEmbed = createErrorEmbed(
                "Installation Failed",
                "Could not install plugin. Check backend logs."
              );
              await btnI.followUp({ embeds: [errorEmbed], ephemeral: true });
            }
          } else if (btnI.customId === "back") {
            await btnI.update({
              embeds: [createPluginPage(currentPage)],
              components: [createSelectMenu(currentPage), createButtons(currentPage)],
            });
          }
        });
      }
    });

    collector.on("end", () => {
      interaction.editReply({
        components: [],
      }).catch(() => {});
    });
  } catch (error) {
    logger.error(
      "Plugin browse failed",
      error instanceof Error ? error : new Error(String(error))
    );
    const errorEmbed = createErrorEmbed(
      "Browse Failed",
      "Could not browse plugins"
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handlePluginList(
  interaction: ChatInputCommandInteraction,
  api: BackendAPI
) {
  try {
    await interaction.deferReply();
    const plugins = await api.getPlugins();

    if (plugins.count === 0) {
      const embed = new EmbedBuilder()
        .setTitle("📦 Installed Plugins")
        .setDescription("No plugins installed")
        .setColor("Yellow");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📦 Installed Plugins")
      .setDescription(`${plugins.count} plugin(s) installed`)
      .setColor("Blurple");

    plugins.plugins.forEach((plugin: any) => {
      embed.addFields({
        name: `${plugin.enabled ? "🟢" : "🔴"} ${plugin.name}`,
        value: `Version: ${plugin.version}\nSize: ${(plugin.size / 1024 / 1024).toFixed(2)} MB`,
        inline: true,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(
      "Plugin list failed",
      error instanceof Error ? error : new Error(String(error))
    );
    const errorEmbed = createErrorEmbed(
      "List Failed",
      "Could not list plugins"
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handlePluginInstall(
  interaction: ChatInputCommandInteraction,
  api: BackendAPI
) {
  try {
    await interaction.deferReply();
    const projectId = interaction.options.getString("project_id", true);

    await api.installPlugin(projectId);

    const embed = createSuccessEmbed(
      "Plugin Installed",
      `Plugin \`${projectId}\` has been installed successfully!`
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(
      "Plugin install failed",
      error instanceof Error ? error : new Error(String(error))
    );
    const errorEmbed = createErrorEmbed(
      "Installation Failed",
      "Could not install plugin"
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handlePluginUpdate(
  interaction: ChatInputCommandInteraction,
  api: BackendAPI
) {
  try {
    await interaction.deferReply();
    const projectId = interaction.options.getString("project_id", true);

    await api.updatePlugin(projectId);

    const embed = createSuccessEmbed(
      "Plugin Updated",
      "Plugin `" + projectId + "` has been updated successfully!"
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(
      "Plugin update failed",
      error instanceof Error ? error : new Error(String(error))
    );
    const errorEmbed = createErrorEmbed(
      "Update Failed",
      "Could not update plugin"
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handlePluginUpload(
  interaction: ChatInputCommandInteraction,
  api: BackendAPI
) {
  try {
    await interaction.deferReply({ ephemeral: true });
    const attachment = interaction.options.getAttachment("file", true);

    if (!attachment.name.endsWith(".jar")) {
      const errorEmbed = createErrorEmbed(
        "Invalid File",
        "Only .jar files are allowed"
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    await api.uploadPlugin(attachment.url, attachment.name);

    const embed = createSuccessEmbed(
      "Plugin Uploaded",
      "Uploaded `" + attachment.name + "` successfully!"
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(
      "Plugin upload failed",
      error instanceof Error ? error : new Error(String(error))
    );
    const errorEmbed = createErrorEmbed(
      "Upload Failed",
      "Could not upload plugin"
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
