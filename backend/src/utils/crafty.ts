import { exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import path from "path";
import { logger } from "./logger.js";

const execAsync = promisify(exec);

export interface CraftyConfig {
  path: string;
  version?: string;
  serverId?: string;
}

/**
 * Detect Crafty Controller installation
 * Searches common installation paths and validates
 */
export async function detectCrafty(): Promise<CraftyConfig | null> {
  const searchPaths = [
    "/opt/crafty",
    "/home/crafty",
    "/root/crafty",
    `${process.env.HOME}/crafty`,
  ].filter(Boolean);

  for (const searchPath of searchPaths) {
    try {
      const { stdout } = await execAsync(`test -d "${searchPath}" && echo found`);
      if (stdout.includes("found")) {
        // Check for crafty service
        const { stdout: serviceStatus } = await execAsync(
          "systemctl is-active crafty || echo inactive"
        );

        logger.info(
          { path: searchPath, status: serviceStatus.trim() },
          "Found Crafty installation"
        );

        return {
          path: searchPath,
        };
      }
    } catch (error) {
      // Continue to next path
    }
  }

  return null;
}

/**
 * Find Minecraft server directories
 * Looks for server.properties files
 */
export async function findMinecraftServers(basePath: string): Promise< string[]> {
  try {
    const { stdout } = await execAsync(
      `find "${basePath}" -name "server.properties" -type f 2>/dev/null | head -20`
    );

    const paths = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((p) => path.dirname(p));

    logger.info({ Count: paths.length }, "Found Minecraft servers");
    return paths;
  } catch (error) {
    logger.warn("Could not find Minecraft servers");
    return [];
  }
}

/**
 * Read Minecraft server.properties
 */
export async function readServerProperties(
  serverPath: string
): Promise<Record<string, string>> {
  try {
    const propertiesPath = path.join(serverPath, "server.properties");
    const content = await readFile(propertiesPath, "utf-8");

    const properties: Record<string, string> = {};
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        properties[key.trim()] = rest.join("=").trim();
      }
    });

    return properties;
  } catch (error) {
    logger.error(
      "Could not read server.properties",
      error instanceof Error ? error : new Error(String(error))
    );
    return {};
  }
}

/**
 * Validate server directory structure
 */
export function isValidServerDirectory(serverPath: string): boolean {
  // Basic validation - would check for server.properties, plugins dir, etc.
  return Boolean(
    serverPath &&
      !serverPath.includes("..") &&
      !serverPath.includes("~")
  );
}
