import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function start(): Promise<void> {
  await connectDB();

  app.listen(env.port, () => {
    console.log(`[server] Listening on port ${env.port} (${env.nodeEnv})`);
  });
}

start();
