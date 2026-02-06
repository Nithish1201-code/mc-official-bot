import { EmbedBuilder, ColorResolvable } from "discord.js";

export function createStatusEmbed(status: any): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("🖥️  Server Status")
    .setColor(status.status.online ? "Green" : "Red")
    .addFields(
      { name: "Status", value: status.status.online ? "🟢 Online" : "🔴 Offline", inline: true },
      { name: "Players", value: `${status.status.playerCount}/${status.status.maxPlayers}`, inline: true },
      { name: "Ping", value: `${status.status.ping}ms`, inline: true },
      { name: "CPU", value: `${status.status.cpuUsage.toFixed(1)}%`, inline: true },
      { name: "RAM", value: `${status.status.ramUsage.toFixed(1)}%`, inline: true },
      { name: "Uptime", value: `${Math.floor(status.status.uptime / 3600)}h`, inline: true }
    )
    .setTimestamp();

  return embed;
}

export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor("Red")
    .setTimestamp();
}

export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor("Green")
    .setTimestamp();
}

export function createListEmbed(
  title: string,
  items: Array<{ name: string; value: string }>,
  color: ColorResolvable = "Blurple"
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`📋 ${title}`)
    .setColor(color)
    .setTimestamp();

  items.forEach(item => {
    embed.addFields({ name: item.name, value: item.value, inline: false });
  });

  return embed;
}
