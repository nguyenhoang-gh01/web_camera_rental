const mysql = require("mysql2/promise");
const { getConfig } = require("../config/env");

let pool = null;

function createPool() {
  const { database } = getConfig();

  return mysql.createPool({
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "Z",
    multipleStatements: true,
  });
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

async function closePool() {
  if (!pool) {
    return;
  }

  const currentPool = pool;
  pool = null;
  await currentPool.end();
}

module.exports = {
  getPool,
  closePool,
};
