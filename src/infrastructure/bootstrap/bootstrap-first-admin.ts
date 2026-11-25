import { runBootstrapFirstAdmin } from './bootstrap-first-admin.command.js';

process.exitCode = await runBootstrapFirstAdmin(
  process.argv.slice(2),
  process.env,
  {
    input: process.stdin,
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  },
);
