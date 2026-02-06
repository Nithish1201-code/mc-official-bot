import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { StructuredLogger } from "./logger.js";

const logger = new StructuredLogger("modrinth");

const MODRINTH_BASE = "https://api.modrinth.com/v2";

/**
 * Search projects on Modrinth
 */
export async function searchModrinth(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    loaders?: string[];
    gameVersions?: string[];
  } = {}
): Promise<any> {
  const params = new URLSearchParams({
    query,
    limit: String(options.limit || 10),
    offset: String(options.offset || 0),
  });

  if (options.loaders?.length) {
    params.set("loaders", JSON.stringify(options.loaders));
  }

  if (options.gameVersions?.length) {
    params.set("game_versions", JSON.stringify(options.gameVersions));
  }

  try {
    const response = await axios.get(`${MODRINTH_BASE}/search`, { params });
    return response.data;
  } catch (error) {
    logger.error("Modrinth search failed", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get project details
 */
export async function getModrinthProject(projectId: string): Promise<any> {
  try {
    const response = await axios.get(`${MODRINTH_BASE}/projects/${projectId}`);
    return response.data;
  } catch (error) {
    logger.error("Could not fetch project", error instanceof Error ? error : new Error(String(error)), { projectId });
    throw error;
  }
}

/**
 * Get project versions
 */
export async function getProjectVersions(projectId: string): Promise<any[]> {
  try {
    const response = await axios.get(
      `${MODRINTH_BASE}/projects/${projectId}/versions`
    );
    return response.data;
  } catch (error) {
    logger.error("Could not fetch versions", error instanceof Error ? error : new Error(String(error)),  { projectId });
    throw error;
  }
}

/**
 * Download file from Modrinth
 */
export async function downloadModrinthFile(
  url: string,
  outputPath: string
): Promise<void> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
    });

    await fs.writeFile(outputPath, response.data);
    logger.info("Downloaded file", { outputPath });
  } catch (error) {
    logger.error("Download failed", error instanceof Error ? error : new Error(String(error)), { url });
    throw error;
  }
}

/**
 * Validate jar file
 */
export async function validateJarFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    // Basic validation: file exists and has reasonable size
    return stats.isFile() && stats.size > 1000 && filePath.endsWith(".jar");
  } catch (error) {
    logger.warn("Jar validation failed", { filePath });
    return false;
  }
}
