import app from "./app";
import { logger } from "./lib/logger";
import { ensureInitialImport } from "./lib/importer";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  try {
    const imported = await ensureInitialImport();
    if (imported) logger.info("Initial BL source imported");
  } catch (error) {
    logger.error({ err: error }, "Initial BL import failed");
  }
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

void start();
