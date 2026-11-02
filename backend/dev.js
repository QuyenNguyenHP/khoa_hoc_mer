// Development runner: starts backend/index.js and restarts it when a backend .js file changes.
// It polls file times instead of using `node --watch`, because in WSL, edits made from
// Windows to /mnt/c/... raise no file events and the old code would keep running.
// Usage: node backend/dev.js [--port 3002]   (loads .env from the project root if present)
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = [path.join(__dirname, 'index.js'), ...process.argv.slice(2)];
const envFile = path.join(root, '.env');
const nodeArgs = fs.existsSync(envFile) ? [`--env-file=${envFile}`] : [];
const watched = fs.readdirSync(__dirname).filter(name => name.endsWith('.js') && name !== 'dev.js').map(name => path.join(__dirname, name));

let child = null; let restarting = false;
function start() {
  child = spawn(process.execPath, [...nodeArgs, ...args], { stdio: 'inherit', cwd: root });
  child.on('exit', code => {
    child = null;
    if (restarting) { restarting = false; start(); }
    else if (code) console.log(`Backend stopped (exit ${code}). Waiting for a file change to restart...`);
  });
}
function restart(file) {
  console.log(`Change detected in ${path.relative(root, file)}, restarting backend...`);
  if (child) { restarting = true; child.kill(); } else start();
}

for (const file of watched) fs.watchFile(file, { interval: 500 }, (now, before) => { if (now.mtimeMs !== before.mtimeMs) restart(file); });
const stop = () => { for (const file of watched) fs.unwatchFile(file); if (child) child.kill(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
start();
