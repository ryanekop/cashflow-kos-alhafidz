import "server-only";

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export function readDataFile<T>(filename: string, fallback: T): T {
  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function writeDataFile<T>(filename: string, data: T) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
