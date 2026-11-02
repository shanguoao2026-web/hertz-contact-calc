#!/usr/bin/env node
import { main } from "./app.js";

try {
  main(process.argv.slice(2), process.stdout);
} catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
