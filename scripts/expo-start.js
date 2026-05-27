const { spawn } = require("node:child_process");
const path = require("node:path");

const proxyEnvNames = [
  "ALL_PROXY",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "all_proxy",
  "http_proxy",
  "https_proxy",
  "no_proxy",
  "GIT_HTTP_PROXY",
  "GIT_HTTPS_PROXY",
];

const env = { ...process.env };

for (const name of proxyEnvNames) {
  delete env[name];
}

const expoCli = path.join(__dirname, "..", "node_modules", "expo", "bin", "cli");
const args = [expoCli, "start", ...process.argv.slice(2)];

const child = spawn(process.execPath, args, {
  cwd: path.join(__dirname, ".."),
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
