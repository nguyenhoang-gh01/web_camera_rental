const fs = require("fs/promises");
const { getConfig } = require("../config/env");
const { getPool } = require("./connection");

async function hasCatalogData() {
  const [rows] = await getPool().query(
    `SELECT
      (SELECT COUNT(*) FROM catalog_categories) AS categoryCount,
      (SELECT COUNT(*) FROM catalog_products) AS productCount`
  );

  const row = rows[0] || {};
  return Number(row.categoryCount) > 0 && Number(row.productCount) > 0;
}

async function applyCatalogSeedFile() {
  const { catalogSeedFile } = getConfig();
  const sql = await fs.readFile(catalogSeedFile, "utf8");
  await getPool().query(sql);
}

async function seedCatalogIfNeeded() {
  const { autoSeedCatalog, catalogSeedFile } = getConfig();

  if (!autoSeedCatalog) {
    return { seeded: false, reason: "AUTO_SEED_CATALOG=false" };
  }

  try {
    await fs.access(catalogSeedFile);
  } catch (error) {
    return { seeded: false, reason: "missing-seed-file" };
  }

  if (await hasCatalogData()) {
    return { seeded: false, reason: "catalog-exists" };
  }

  await applyCatalogSeedFile();
  return { seeded: true, reason: "seed-applied" };
}

module.exports = {
  hasCatalogData,
  seedCatalogIfNeeded,
};
