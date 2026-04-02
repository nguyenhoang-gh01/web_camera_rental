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

async function ensureRentalPricingColumns() {
  const pool = getPool();

  const [cartItemSessionPrice] = await pool.query(
    "SHOW COLUMNS FROM cart_items LIKE 'session_price'"
  );
  if (!Array.isArray(cartItemSessionPrice) || !cartItemSessionPrice.length) {
    await pool.query(
      "ALTER TABLE cart_items ADD COLUMN session_price INT NOT NULL DEFAULT 0 AFTER price"
    );
  }

  const [orderItemSessionPrice] = await pool.query(
    "SHOW COLUMNS FROM rental_order_items LIKE 'session_price'"
  );
  if (!Array.isArray(orderItemSessionPrice) || !orderItemSessionPrice.length) {
    await pool.query(
      "ALTER TABLE rental_order_items ADD COLUMN session_price INT NOT NULL DEFAULT 0 AFTER price"
    );
  }

  await pool.query(
    "ALTER TABLE cart_items MODIFY COLUMN rental_days DECIMAL(4,1) NOT NULL DEFAULT 1.0"
  );
  await pool.query(
    "ALTER TABLE rental_order_items MODIFY COLUMN rental_days DECIMAL(4,1) NOT NULL DEFAULT 1.0"
  );
}

async function bootstrapDatabase() {
  await ensureDatabaseExists();
  await applySchema();
  await ensureUsersRoleColumn();
  await ensureRentalPricingColumns();
  return seedCatalogIfNeeded();
}

module.exports = {
  bootstrapDatabase,
};
