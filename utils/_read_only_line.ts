export async function readOnlyLine(filename: string): Promise<string> {
  const bytes = await Deno.readFile(filename);
  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(bytes);
  const index = text.indexOf("\n");
  if (index < 0) {
    throw new Error(`file contains no complete lines: ${filename}`);
  }
  if (text.length - 1 != index) {
    throw new Error(`file can only contain one line: ${filename}`);
  }
  const firstLine = text.substring(0, index);
  return firstLine;
}
