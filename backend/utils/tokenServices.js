import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, "..", "tokens.json");

export function saveTokens(tokens) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(tokens, null, 2), "utf8");
}

export function loadTokens() {
  if (fs.existsSync(STORE_PATH)) {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}
