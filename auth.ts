import { Client } from "https://deno.land/x/postgres/mod.ts";
import { readOnlyLine } from "./utils/_read_only_line.ts";

export async function setAuth(
  client: Client,
  role: string,
  password: string,
): Promise<void> {
  // Postgres ALTER ROLE cannot be parametrized.
  // Roundtrip the values through Postgres to have quaranteed correct quoting.
  // https://stackoverflow.com/questions/18897231/how-to-parameterize-an-alter-role-statement-in-postgresql
  const quoted = await client.queryObject<{ role: string; password: string }>`
SELECT quote_ident(${role}) AS role, quote_literal(${password}) AS password
`;
  const safe = `
ALTER ROLE ${quoted.rows[0].role} WITH
    LOGIN
    PASSWORD ${quoted.rows[0].password}
`;
  await client.queryObject<Record<never, never>>(safe);
}

export async function setAuthFromFile(
  client: Client,
  role: string,
  filename: string,
): Promise<void> {
  const password = await readOnlyLine(filename);
  await setAuth(client, role, password);
}
