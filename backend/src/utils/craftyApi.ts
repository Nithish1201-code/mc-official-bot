import axios, { AxiosInstance } from "axios";
import https from "https";
import { config } from "../config.js";
import { StructuredLogger } from "./logger.js";

const logger = new StructuredLogger("crafty-api");

function getAxiosClient(): AxiosInstance {
  if (!config.craftyApiUrl || !config.craftyApiToken) {
    throw new Error("Crafty API not configured");
  }

  const httpsAgent = config.craftyAllowInsecure
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  return axios.create({
    baseURL: config.craftyApiUrl,
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${config.craftyApiToken}`,
      "Content-Type": "application/json",
    },
    httpsAgent,
  });
}

export function isCraftyConfigured(): boolean {
  return Boolean(config.craftyApiUrl && config.craftyApiToken);
}

export async function listCraftyServers(): Promise<any[]> {
  const client = getAxiosClient();
  const response = await client.get("/api/v2/servers");
  return response.data || [];
}

export async function getCraftyServer(serverId: string): Promise<any> {
  const client = getAxiosClient();
  const response = await client.get(`/api/v2/servers/${serverId}`);
  return response.data;
}

export async function getCraftyServerPublic(serverId: string): Promise<any> {
  const client = getAxiosClient();
  const response = await client.get(`/api/v2/servers/${serverId}/public`);
  return response.data;
}

export async function getCraftyServerStats(serverId: string): Promise<any> {
  const client = getAxiosClient();
  const response = await client.get(`/api/v2/servers/${serverId}/stats`);
  return response.data;
}

export async function getCraftyServerLogs(serverId: string, params?: Record<string, string>): Promise<any> {
  const client = getAxiosClient();
  const response = await client.get(`/api/v2/servers/${serverId}/logs`, { params });
  return response.data;
}

export async function sendCraftyCommand(serverId: string, stdin: string): Promise<any> {
  const client = getAxiosClient();
  const response = await client.post(`/api/v2/servers/${serverId}/stdin`, { stdin });
  return response.data;
}

export async function runCraftyAction(serverId: string, action: "start_server" | "stop_server" | "restart_server"): Promise<any> {
  const client = getAxiosClient();
  const response = await client.post(`/api/v2/servers/${serverId}/action/${action}`);
  return response.data;
}

export function getCraftyServerId(): string | undefined {
  return config.craftyServerId;
}

export function logCraftyWarning(message: string): void {
  logger.warn(message);
}
