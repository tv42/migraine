// Postgres schema migrations and password setting.
//
// Usage:
//
// ```
// export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=pgdev PGDATABASE=postgres
// deno \
//   run \
//   --allow-net=localhost:5432 \
//   --allow-read=/migrations,/secrets/jdoe,/secrets/wsmith \
//   --allow-env=PGHOST,PGPORT,PGUSER,PGPASSWORD,PGDATABASE,PGAPPNAME \
//   https://github.com/tv42/migraine-deno-postgres/migraine.ts \
//   --migrations=/migrations \
//   --auth=jdoe=/secrets/jdoe \
//   --auth=wsmith=/secrets/wsmith
// ```

import { parse } from "https://deno.land/std/flags/mod.ts";
import { Client } from "https://deno.land/x/postgres/mod.ts";

import { listMigrations } from "./list_migrations.ts";
import { migrate } from "./migrate.ts";
import { setAuthFromFile } from "./auth.ts";

function parseAuthFlags(args: string[]): Map<string, string> {
  const toSet: Map<string, string> = new Map();
  for (const arg of args) {
    const idx = arg.indexOf("=");
    if (idx < 0 || idx == 0 || idx == arg.length - 1) {
      console.log(`Flag does not look like --auth=ROLE=FILE: ${arg}`);
      Deno.exit(2);
    }
    const role = arg.slice(0, idx);
    const path = arg.slice(idx + 1);
    toSet.set(role, path);
  }
  return toSet;
}

function alwaysArray(input: undefined | string | string[]): string[] {
  if (input === undefined) {
    return [];
  }
  if (typeof input === "string") {
    return [input];
  }
  return input;
}

async function run(args: string[]): Promise<void> {
  const flags = parse(args, {
    string: ["migrations", "auth"],
    collect: ["auth"],
    unknown: function (x: string) {
      // Reject unknown flags
      if (x.startsWith("-")) {
        console.log(`Unknown flag: ${x}`);
        Deno.exit(2);
      }
    },
  });
  if (flags["_"].length > 0) {
    console.log(`Unexpected positional arg: ${flags["_"][0]}`);
    Deno.exit(2);
  }
  if (typeof flags["migrations"] == "object") {
    console.log(`Flag --migrations= can only be used once`);
    Deno.exit(2);
  }
  const migrationsDir: string | undefined = flags["migrations"];
  const authFlags = parseAuthFlags(alwaysArray(flags["auth"]));

  const client = new Client({
    applicationName: "migraine",
  });
  await client.connect();

  if (migrationsDir !== undefined) {
    const migrations = await listMigrations(migrationsDir);
    await migrate({ migrationsDir, migrations, client });
  }

  for (const [role, filename] of authFlags) {
    await setAuthFromFile(client, role, filename);
  }

  await client.end();
}

run(Deno.args);
