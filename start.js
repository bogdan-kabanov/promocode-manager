/**
 * Startup script for PromoCode Manager
 * - Checks if default ports are available
 * - If busy, finds next free port
 * - Generates .env files with correct ports
 * - Starts server and client
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Default port configuration
const DEFAULT_PORTS = {
  server: 3000,
  client: 5173,
  mongo: 27017,
  clickhouse_http: 8123,
  clickhouse_native: 9000,
  redis: 6379,
};

/**
 * Check if a port is available
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, '0.0.0.0', () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * Find a free port starting from the given port
 */
async function findFreePort(startPort, maxAttempts = 20) {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(`No free port found starting from ${startPort}`);
}

/**
 * Get available ports, using defaults if free, otherwise finding alternatives
 */
async function getAvailablePorts() {
  const ports = {};

  for (const [name, defaultPort] of Object.entries(DEFAULT_PORTS)) {
    const free = await isPortFree(defaultPort);
    if (free) {
      ports[name] = defaultPort;
      console.log(`[OK] Port ${defaultPort} (${name}) is available`);
    } else {
      const newPort = await findFreePort(defaultPort + 1);
      ports[name] = newPort;
      console.log(`[!!] Port ${defaultPort} (${name}) is BUSY -> using ${newPort}`);
    }
  }

  return ports;
}

/**
 * Generate server .env file
 */
function generateServerEnv(ports) {
  const envContent = `PORT=${ports.server}
MONGO_URI=mongodb://localhost:${ports.mongo}/promocodes
CLICKHOUSE_URL=http://localhost:${ports.clickhouse_http}
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DB=promocodes
REDIS_HOST=localhost
REDIS_PORT=${ports.redis}
CORS_ORIGIN=http://localhost:${ports.client}
`;

  const envPath = path.join(__dirname, 'server', '.env');
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`\n[ENV] Server .env created at: ${envPath}`);
  console.log(envContent);
}

/**
 * Generate client .env file
 */
function generateClientEnv(ports) {
  const envContent = `VITE_API_URL=http://localhost:${ports.server}/api
`;

  const envPath = path.join(__dirname, 'client', '.env');
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`[ENV] Client .env created at: ${envPath}`);
  console.log(envContent);
}

/**
 * Update vite.config.ts proxy target and port dynamically via env
 * We use .env for Vite so no need to modify vite.config.ts
 * But we need the port for vite dev server
 */
function generateClientEnvWithPort(ports) {
  const envContent = `VITE_API_URL=http://localhost:${ports.server}/api
`;

  const envLocalContent = `VITE_API_URL=http://localhost:${ports.server}/api
`;

  const envPath = path.join(__dirname, 'client', '.env');
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`[ENV] Client .env created at: ${envPath}`);
}

/**
 * Start a process and pipe output
 */
function startProcess(command, args, cwd, label) {
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env },
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => console.log(`[${label}] ${line}`));
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => console.log(`[${label}] ${line}`));
  });

  proc.on('close', (code) => {
    console.log(`[${label}] Process exited with code ${code}`);
  });

  return proc;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  PromoCode Manager - Smart Startup');
  console.log('='.repeat(60));
  console.log('\nChecking port availability...\n');

  const ports = await getAvailablePorts();

  console.log('\n' + '-'.repeat(60));
  console.log('Generating environment files...');
  console.log('-'.repeat(60));

  generateServerEnv(ports);
  generateClientEnv(ports);

  console.log('-'.repeat(60));
  console.log('\nFinal port configuration:');
  console.log(`  Server API:        http://localhost:${ports.server}/api`);
  console.log(`  Client (Vite):     http://localhost:${ports.client}`);
  console.log(`  MongoDB:           localhost:${ports.mongo}`);
  console.log(`  ClickHouse HTTP:   localhost:${ports.clickhouse_http}`);
  console.log(`  Redis:             localhost:${ports.redis}`);
  console.log('\n' + '='.repeat(60));

  // Ask user if they want to start the services
  console.log('\nEnvironment files have been generated.');
  console.log('To start the services, run:');
  console.log(`  Server: cd server && npm run start:dev`);
  console.log(`  Client: cd client && npm run dev -- --port ${ports.client}`);
  console.log('\nOr use docker-compose for the full stack:');
  console.log('  docker-compose up');
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
