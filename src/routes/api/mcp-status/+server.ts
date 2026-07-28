import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const GET: RequestHandler = async () => {
  try {
    const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
    let registered = false;
    let details: any = null;

    // Resolve the absolute path to mcp-server.js
    // SvelteKit builds to .svelte-kit/output/server/entries/pages/api/mcp-status
    // The source file is at the root. We can use process.cwd() to get the project root!
    const projectRoot = process.cwd();
    const serverPath = path.join(projectRoot, 'mcp-server.js');

    if (fs.existsSync(configPath)) {
      const configText = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configText);
      const mcpServers = config.mcp?.servers || {};
      if (mcpServers.leadflow) {
        registered = true;
        details = {
          serverPath,
          command: mcpServers.leadflow.command,
          args: mcpServers.leadflow.args
        };
      }
    }

    if (!details) {
      details = { serverPath };
    }

    return json({ registered, details });
  } catch (err: any) {
    return json({ registered: false, error: err.message });
  }
};
