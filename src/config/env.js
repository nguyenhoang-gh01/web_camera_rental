const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..", "..");
const ENV_FILE = path.join(ROOT_DIR, ".env");

let loaded = false;
let cachedConfig = null;

function parseEnvValue(value) {
  const trimmed = String(value || "").trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile() {
  if (loaded) {
    return;
  }

  loaded = true;

  if (!fs.existsSync(ENV_FILE)) {
    return;
  }

  const content = fs.readFileSync(ENV_FILE, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);

    if (!key || process.env[key] !== undefined) {
      return;
    }

    process.env[key] = parseEnvValue(value);
  });
}

function toPort(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function getConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  loadEnvFile();

  cachedConfig = {
    port: toPort(process.env.PORT, 3000),
    rootDir: ROOT_DIR,
    publicDir: path.join(ROOT_DIR, "public"),
    schemaFile: path.join(ROOT_DIR, "database", "schema.sql"),
    catalogSeedFile: path.join(ROOT_DIR, "database", "seeds", "catalog_seed.sql"),
    autoSeedCatalog: String(process.env.AUTO_SEED_CATALOG || "true").toLowerCase() !== "false",
    database: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: toPort(process.env.DB_PORT, 3306),
      name: process.env.DB_NAME || "focus_camera",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
    },
  };

  return cachedConfig;
}

module.exports = {
  getConfig,
};
