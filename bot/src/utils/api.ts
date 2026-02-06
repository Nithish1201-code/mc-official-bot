import axios from "axios";
import { StructuredLogger } from "./logger.js";

const logger = new StructuredLogger("api");

export class BackendAPI {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  async getStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/api/status`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      logger.error(
        "Failed to get status",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async restartServer(delay?: number) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/server/restart`,
        { delay },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Failed to restart server",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async searchModrinth(query: string, limit?: number) {
    try {
      const response = await axios.get(`${this.baseURL}/api/modrinth/search`, {
        params: { q: query, limit },
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      logger.error(
        "Failed to search Modrinth",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getPlugins() {
    try {
      const response = await axios.get(`${this.baseURL}/api/plugins`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      logger.error(
        "Failed to get plugins",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async installPlugin(projectId: string, versionId: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/plugins/install`,
        { projectId, versionId },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Failed to install plugin",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}
