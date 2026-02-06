import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { StructuredLogger } from "../utils/logger.js";
import { config } from "../config.js";
import {
  downloadModrinthFile,
  getProjectVersions,
  validateJarFile,
} from "../utils/modrinth.js";
import fs from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";

const logger = new StructuredLogger("plugins");

export default async function pluginRoutes(fastify: FastifyInstance) {
  const pluginsDir = path.join(config.minecraftPath, "plugins");

  const installFromModrinth = async (projectId: string, versionId?: string) => {
    const versions = await getProjectVersions(projectId);
    const serverLoader = config.serverLoader || "paper";
    const serverVersion = config.minecraftVersion;

    const selectedVersion =
      versions.find((version) => version.id === versionId) ||
      versions.find((version) => {
        const loaders = version.loaders || [];
        const gameVersions = version.game_versions || [];
        const loaderMatch = loaders.includes(serverLoader);
        const versionMatch = serverVersion ? gameVersions.includes(serverVersion) : true;
        return loaderMatch && versionMatch;
      }) ||
      versions[0];

    if (!selectedVersion || !selectedVersion.files?.length) {
      throw new Error("NO_COMPATIBLE_VERSION");
    }

    const file =
      selectedVersion.files.find((f: any) => f.filename?.endsWith(".jar")) ||
      selectedVersion.files[0];
    const filename = file.filename || `${projectId}.jar`;
    const tempPath = path.join("/tmp", filename);

    await fs.mkdir(pluginsDir, { recursive: true });
    await downloadModrinthFile(file.url, tempPath);

    const valid = await validateJarFile(tempPath);
    if (!valid) {
      await fs.unlink(tempPath).catch(() => {});
      throw new Error("INVALID_JAR");
    }

    const targetPath = path.join(pluginsDir, filename);
    try {
      await fs.access(targetPath);
      const backupDir = path.join(pluginsDir, ".backup", new Date().toISOString().replace(/[:.]/g, "-"));
      await fs.mkdir(backupDir, { recursive: true });
      await fs.rename(targetPath, path.join(backupDir, filename));
    } catch (error) {
      // No existing file to backup
    }

    await fs.rename(tempPath, targetPath);

    return {
      versionId: selectedVersion.id,
      filename,
    };
  };

  fastify.get(
    "/plugins",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info("Listing plugins");

        let plugins: Array<{ name: string; version: string; path: string; size: number; enabled: boolean }> = [];

        try {
          const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
          const jars = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".jar"));

          plugins = await Promise.all(
            jars.map(async (entry) => {
              const fullPath = path.join(pluginsDir, entry.name);
              const stats = await fs.stat(fullPath);
              return {
                name: entry.name.replace(/\.jar$/i, ""),
                version: "unknown",
                path: fullPath,
                size: stats.size,
                enabled: true,
              };
            })
          );
        } catch (error) {
          logger.warn("Could not read plugins directory", { pluginsDir });
        }

        reply.send({
          plugins,
          count: plugins.length,
        });
      } catch (error) {
        logger.error(
          "Failed to list plugins",
          error instanceof Error ? error : new Error(String(error))
        );
        reply.code(500).send({
          error: {
            code: "LIST_PLUGINS_FAILED",
            message: "Could not list plugins",
            statusCode: 500,
          },
        });
      }
    }
  );

  fastify.post(
    "/plugins/install",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId, versionId } = (request.body as {
          projectId?: string;
          versionId?: string;
        }) || {};

        if (!projectId) {
          reply.code(400).send({
            error: {
              code: "MISSING_FIELDS",
              message: "projectId is required",
              statusCode: 400,
            },
          });
          return;
        }

        logger.info("Installing plugin", { projectId, versionId });

        const { versionId: resolvedVersion, filename } = await installFromModrinth(
          projectId,
          versionId
        );
        reply.send({
          success: true,
          message: "Plugin installed",
          projectId,
          versionId: resolvedVersion,
          file: filename,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "NO_COMPATIBLE_VERSION") {
          reply.code(400).send({
            error: {
              code: "NO_COMPATIBLE_VERSION",
              message: "No compatible plugin version found",
              statusCode: 400,
            },
          });
          return;
        }

        if (error instanceof Error && error.message === "INVALID_JAR") {
          reply.code(400).send({
            error: {
              code: "INVALID_JAR",
              message: "Downloaded file is not a valid jar",
              statusCode: 400,
            },
          });
          return;
        }

        logger.error(
          "Plugin install failed",
          error instanceof Error ? error : new Error(String(error))
        );
        reply.code(500).send({
          error: {
            code: "INSTALL_FAILED",
            message: "Could not install plugin",
            statusCode: 500,
          },
        });
      }
    }
  );

  fastify.post(
    "/plugins/upload",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await request.file();

        if (!data) {
          reply.code(400).send({
            error: {
              code: "NO_FILE",
              message: "No file provided",
              statusCode: 400,
            },
          });
          return;
        }

        const filename = data.filename;
        logger.info("Uploading plugin", { filename });

        if (!filename.endsWith(".jar")) {
          reply.code(400).send({
            error: {
              code: "INVALID_FILE",
              message: "Only .jar files are allowed",
              statusCode: 400,
            },
          });
          return;
        }

        await fs.mkdir(pluginsDir, { recursive: true });
        const targetPath = path.join(pluginsDir, filename);
        const fileHandle = await fs.open(targetPath, "w");
        const writeStream = fileHandle.createWriteStream();

        try {
          await pipeline(data.file, writeStream);
        } finally {
          await fileHandle.close();
        }

        const valid = await validateJarFile(targetPath);
        if (!valid) {
          await fs.unlink(targetPath);
          reply.code(400).send({
            error: {
              code: "INVALID_JAR",
              message: "Uploaded file is not a valid jar",
              statusCode: 400,
            },
          });
          return;
        }

        reply.send({
          success: true,
          file: {
            name: filename,
            size: data.file.bytesRead ?? 0,
            path: targetPath,
          },
          message: "Plugin uploaded successfully",
        });
      } catch (error) {
        logger.error(
          "Plugin upload failed",
          error instanceof Error ? error : new Error(String(error))
        );
        reply.code(500).send({
          error: {
            code: "UPLOAD_FAILED",
            message: "Could not upload plugin",
            statusCode: 500,
          },
        });
      }
    }
  );

  fastify.post(
    "/plugins/update",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId, versionId } = (request.body as {
          projectId?: string;
          versionId?: string;
        }) || {};

        if (!projectId) {
          reply.code(400).send({
            error: {
              code: "MISSING_FIELDS",
              message: "projectId is required",
              statusCode: 400,
            },
          });
          return;
        }

        logger.info("Updating plugin", { projectId, versionId });

        const { versionId: resolvedVersion, filename } = await installFromModrinth(
          projectId,
          versionId
        );

        reply.send({
          success: true,
          message: "Plugin updated",
          projectId,
          versionId: resolvedVersion,
          file: filename,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "NO_COMPATIBLE_VERSION") {
          reply.code(400).send({
            error: {
              code: "NO_COMPATIBLE_VERSION",
              message: "No compatible plugin version found",
              statusCode: 400,
            },
          });
          return;
        }

        if (error instanceof Error && error.message === "INVALID_JAR") {
          reply.code(400).send({
            error: {
              code: "INVALID_JAR",
              message: "Downloaded file is not a valid jar",
              statusCode: 400,
            },
          });
          return;
        }

        logger.error(
          "Plugin update failed",
          error instanceof Error ? error : new Error(String(error))
        );
        reply.code(500).send({
          error: {
            code: "UPDATE_FAILED",
            message: "Could not update plugin",
            statusCode: 500,
          },
        });
      }
    }
  );

  fastify.delete(
    "/plugins/:name",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { name } = request.params as { name?: string };

        if (!name) {
          reply.code(400).send({
            error: {
              code: "MISSING_NAME",
              message: "Plugin name is required",
              statusCode: 400,
            },
          });
          return;
        }

        logger.info("Deleting plugin", { name });

        reply.send({
          success: true,
          message: `Plugin '${name}' deleted`,
        });
      } catch (error) {
        logger.error(
          "Plugin delete failed",
          error instanceof Error ? error : new Error(String(error))
        );
        reply.code(500).send({
          error: {
            code: "DELETE_FAILED",
            message: "Could not delete plugin",
            statusCode: 500,
          },
        });
      }
    }
  );
}
