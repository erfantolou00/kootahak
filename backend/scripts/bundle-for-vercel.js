const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const backendRoot = path.join(__dirname, "..");
const entry = path.join(backendRoot, "dist", "main.js");
const outfile = path.join(backendRoot, "dist", "main.bundle.js");

const optionalPackages = [
  "@nestjs/microservices/microservices-module",
  "@nestjs/websockets/socket-module",
  "@nestjs/microservices",
  "@nestjs/websockets",
  "class-transformer/storage",
  "@valkey/valkey-glide",
  "pg-native",
];

esbuild
  .build({
    absWorkingDir: backendRoot,
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile,
    external: optionalPackages,
    logLevel: "warning",
    banner: {
      js: 'console.log("KOOTAHAK_BUNDLE");',
    },
  })
  .then(() => {
    let source = fs.readFileSync(outfile, "utf8");
    for (const name of optionalPackages) {
      const dynamic = `require(${JSON.stringify(name.slice(0, 1))} + ${JSON.stringify(name.slice(1))})`;
      source = source.split(`require("${name}")`).join(dynamic);
      source = source.split(`require('${name}')`).join(dynamic);
    }
    fs.writeFileSync(entry, source);
    fs.writeFileSync(path.join(backendRoot, "server.js"), source);
    fs.rmSync(outfile, { force: true });
    fs.rmSync(`${entry}.map`, { force: true });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
