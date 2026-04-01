const fs = require("fs/promises");
const mysql = require("mysql2/promise");
const { getConfig } = require("../config/env");
const { getPool } = require("./connection");
const { seedCatalogIfNeeded } = require("./catalogSeed");

function escapeIdentifier(value) {
  return `\`${String(value || "").replace(/`/g, "``")}\``;
}

async function ensureDatabaseExists() {
  const { database } = getConfig();
  const connection = await mysql.createConnection({
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    charset: "utf8mb4",
    timezone: "Z",
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${escapeIdentifier(database.name)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

async function applySchema() {
  const { schemaFile } = getConfig();
  const schemaSql = await fs.readFile(schemaFile, "utf8");
  await getPool().query(schemaSql);
}

async function ensureUsersRoleColumn() {
  const pool = getPool();
  const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'role'");

  if (Array.isArray(columns) && columns.length) {
    return;
  }

  await pool.query(
    "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer' AFTER password_hash"
  );
}

async function bootstrapDatabase() {
  await ensureDatabaseExists();
  await applySchema();
  await ensureUsersRoleColumn();
  return seedCatalogIfNeeded();
}

module.exports = {
  bootstrapDatabase,
};
