import * as dotenv from "dotenv";
import { getTasks, getProjects, getUsers } from "../lib/notion";

dotenv.config({ path: [".env.local", ".env"] });

async function main() {
  try {
    const [tasks, projects, users] = await Promise.all([
      getTasks().catch((e) => {
        throw new Error(`getTasks failed: ${e?.message || e}`);
      }),
      getProjects().catch((e) => {
        throw new Error(`getProjects failed: ${e?.message || e}`);
      }),
      getUsers().catch((e) => {
        throw new Error(`getUsers failed: ${e?.message || e}`);
      }),
    ]);

    console.log(`getTasks: OK (${tasks.length})`);
    console.log(`getProjects: OK (${projects.length})`);
    console.log(`getUsers: OK (${users.length})`);
  } catch (error: any) {
    console.error(error?.message || String(error));
    process.exit(1);
  }
}

main();
