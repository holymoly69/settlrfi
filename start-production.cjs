#!/usr/bin/env node
console.log("[PROD-START] Starting production server...");
console.log("[PROD-START] CWD:", process.cwd());
console.log("[PROD-START] NODE_ENV:", process.env.NODE_ENV);
console.log("[PROD-START] PORT:", process.env.PORT);

const fs = require('fs');
const path = require('path');

const bundlePath = path.join(process.cwd(), 'dist', 'index.cjs');
console.log("[PROD-START] Looking for bundle at:", bundlePath);
console.log("[PROD-START] Bundle exists:", fs.existsSync(bundlePath));

if (fs.existsSync(bundlePath)) {
  console.log("[PROD-START] Loading bundle...");
  require(bundlePath);
} else {
  console.error("[PROD-START] ERROR: Bundle not found!");
  console.log("[PROD-START] Directory contents:", fs.readdirSync(process.cwd()));
  if (fs.existsSync('dist')) {
    console.log("[PROD-START] dist contents:", fs.readdirSync('dist'));
  }
  process.exit(1);
}
