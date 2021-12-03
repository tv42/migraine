/// List migrations found in dir and return a sorted list of them.
export async function listMigrations(dir: string): Promise<string[]> {
  const files: string[] = [];
  for await (const dirEntry of Deno.readDir(dir)) {
    if (!dirEntry.isFile) {
      continue;
    }
    const filenameRe = /^(?<num>\d+)_.*\.sql$/;
    const match = filenameRe.exec(dirEntry.name);
    if (match === null) {
      throw new Error(`unrecognized migration file: ${dirEntry.name}`);
    }
    if (match.groups === undefined) {
      throw new Error(`internal error: Regexp didn't return named groups`);
    }
    const num = parseInt(match.groups.num, 10);
    if (num <= 0) {
      throw new Error(`migration numbers must start from 1: ${dirEntry.name}`);
    }
    if (files[num - 1] !== undefined) {
      throw new Error(
        `duplicate migration: ${files[num - 1]} vs ${dirEntry.name}`,
      );
    }
    files[num - 1] = dirEntry.name;
  }

  // Verify no missing migrations
  for (const [idx, filename] of files.entries()) {
    if (filename === undefined) {
      throw new Error(`Missing migration #${idx}`);
    }
  }

  return files;
}
