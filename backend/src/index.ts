import { startServer } from "./server.js";
import { validateConfig } from "./config.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  try {
    validateConfig();
    await startServer();
  } catch (error) {
    logger.error(
      "Fatal error",
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}

main();
