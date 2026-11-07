#!/usr/bin/env node
/**
 * Production Server Entrypoint for SkyzoneBD
 * Port: 3001 (Preserves port 3000 for Kuttush on the same host)
 * Supports both Next.js Standalone build and standard Next.js runtime
 */

const path = require('path');
const fs = require('fs');

// Set default port to 3001 to prevent collision with Kuttush (port 3000)
process.env.PORT = process.env.PORT || '3001';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

const standaloneServerPath = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(standaloneServerPath)) {
  console.log(`🚀 Starting SkyzoneBD via Standalone Server on ${process.env.HOSTNAME}:${process.env.PORT}`);
  require(standaloneServerPath);
} else {
  console.log(`🚀 Starting SkyzoneBD via standard Next.js on ${process.env.HOSTNAME}:${process.env.PORT}`);
  const next = require('next');
  const http = require('http');

  const app = next({
    dev: false,
    hostname: process.env.HOSTNAME,
    port: parseInt(process.env.PORT, 10),
  });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    http.createServer((req, res) => {
      handle(req, res);
    }).listen(parseInt(process.env.PORT, 10), process.env.HOSTNAME, () => {
      console.log(`✅ SkyzoneBD running at http://${process.env.HOSTNAME}:${process.env.PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

