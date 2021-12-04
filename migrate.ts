import { Client } from "https://deno.land/x/postgres/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

export interface MigrateOptions {
  migrationsDir: string;
  migrations: string[];
  client: Client;
}

async function migratePrep(client: Client) {
  const tx = client.createTransaction("migrate_prep");
  await tx.begin();
  await tx.queryObject<Record<never, never>>`
CREATE SCHEMA IF NOT EXISTS migraine;
CREATE TABLE IF NOT EXISTS migraine.schema_version (version INT NOT NULL UNIQUE);
LOCK TABLE migraine.schema_version NOWAIT;
-- Insert a 0 if the table is empty.
INSERT INTO migraine.schema_version(version)
    SELECT 0
    WHERE NOT EXISTS (
        SELECT *
        FROM migraine.schema_version
    );
`;
  await tx.commit();
}

async function migrateStep({
  migrationsDir,
  migrations,
  client,
}: MigrateOptions): Promise<boolean> {
  let didWork = false;

  // Run each step in a transaction, with the `schema_version` table locked, and carry no state from one step to the next.
  // This makes even concurrent runs safe.
  const tx = client.createTransaction("migrate_step");
  await tx.begin();
  await tx.queryObject<Record<never, never>>`
LOCK TABLE migraine.schema_version NOWAIT;
`;

  const result = await tx.queryObject<{ version: number }>`
SELECT max(version) AS version FROM migraine.schema_version;
`;
  const version = result.rows[0].version;
  if (version === undefined) {
    throw new Error(`internal error: schema version not set`);
  }

  // No migrations applied yet is `version==0`.
  // Migration #1 applied is `version==1`.
  // Thus, process migration step at 0-based index `version`.
  if (migrations.length > version) {
    console.log({migration: migrations[version]})
    didWork = true;
    const sql = await Deno.readTextFile(
      path.join(migrationsDir, migrations[version]),
    );
    await tx.queryObject<Record<never, never>>(sql);

    const newVersion = version + 1;
    await tx.queryObject<Record<never, never>>`
  UPDATE migraine.schema_version SET version=${newVersion};
  `;
  }

  await tx.commit();
  return didWork;
}

export async function migrate({
  migrationsDir,
  migrations,
  client,
}: MigrateOptions): Promise<void> {
  await migratePrep(client);

  while (true) {
    const didWork = await migrateStep({ migrationsDir, migrations, client });
    if (!didWork) {
      // We've reached the end of transactions.
      break;
    }
  }
}
