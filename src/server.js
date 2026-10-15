const fs = require("fs");
const https = require("https");
const path = require("path");
const selfsigned = require("selfsigned");

const { createApp } = require("./app");
const { initializeDatabase } = require("./db");

async function getHttpsCredentials() {
  const keyPath = process.env.HTTPS_KEY_PATH;
  const certPath = process.env.HTTPS_CERT_PATH;

  if (keyPath && certPath) {
    return {
      key: fs.readFileSync(path.resolve(keyPath)),
      cert: fs.readFileSync(path.resolve(certPath))
    };
  }

  const pems = await selfsigned.generate([{ name: "commonName", value: "localhost" }], {
    algorithm: "sha256",
    days: 365,
    keySize: 2048
  });

  return { key: pems.private, cert: pems.cert };
}

async function start() {
  const port = Number(process.env.PORT || 8443);
  const db = initializeDatabase();
  await db.migrate();
  const app = createApp(db);
  const server = https.createServer(await getHttpsCredentials(), app);

  server.listen(port, () => {
    console.log(`HTTPS API listening on https://localhost:${port}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { start, getHttpsCredentials };
