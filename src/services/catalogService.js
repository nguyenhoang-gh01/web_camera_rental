const { getPool } = require("../database/connection");

function calculateSessionPrice(price) {
  return Math.round((((Number(price) || 0) * 0.7) / 1000 || 0)) * 1000;
}

function mapProductRow(row, images = []) {
  const fallbackImage = row.fallback_image || "";
  const normalizedImages = images.length ? images : fallbackImage ? [fallbackImage] : [];

  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    price: Number(row.price) || 0,
    sessionPrice: Number(row.session_price) || calculateSessionPrice(row.price),
    categoryId: Number(row.category_id) || 0,
    categorySlug: row.category_slug || "",
    categoryName: row.category_name || "",
    companyId: String(row.company_id || ""),
    companyName: row.company_name || "Khác",
    companyImageUrl: row.company_image_url || "",
    images: normalizedImages,
    thumbnailUrl: row.thumbnail_url || normalizedImages[0] || fallbackImage,
    description: row.description || "<p>Đang cập nhật thông tin nổi bật của sản phẩm.</p>",
    detail: row.detail || "<p>Đang cập nhật thông tin chi tiết sản phẩm.</p>",
  };
}

async function buildImageMap(productIds) {
  if (!productIds.length) {
    return new Map();
  }

  const placeholders = productIds.map(() => "?").join(", ");
  const [rows] = await getPool().query(
    `SELECT product_id, image_url, sort_order
     FROM catalog_product_images
     WHERE product_id IN (${placeholders})
     ORDER BY product_id ASC, sort_order ASC, id ASC`,
    productIds
  );

  const imageMap = new Map();
  rows.forEach((row) => {
    const productId = String(row.product_id);
    if (!imageMap.has(productId)) {
      imageMap.set(productId, []);
    }
    imageMap.get(productId).push(row.image_url);
  });

  return imageMap;
}

async function fetchProductRows(options = {}) {
  const {
    where = "",
    orderBy = "products.name ASC",
    limit = "",
    params = [],
  } = options;

  const [rows] = await getPool().query(
    `SELECT
      products.id,
      products.slug,
      products.name,
      products.price,
      products.session_price,
      products.category_id,
      products.company_id,
      products.thumbnail_url,
      products.description,
      products.detail,
      categories.slug AS category_slug,
      categories.name AS category_name,
      categories.fallback_image,
      companies.name AS company_name,
      companies.image_url AS company_image_url
     FROM catalog_products AS products
     INNER JOIN catalog_categories AS categories ON categories.id = products.category_id
     INNER JOIN catalog_companies AS companies ON companies.id = products.company_id
     ${where}
     ${orderBy ? `ORDER BY ${orderBy}` : ""}
     ${limit ? `LIMIT ${limit}` : ""}`,
    params
  );

  return rows;
}

function filterAndSortProducts(items, { companyId = "", search = "", sort = "asc" } = {}) {
  const searchValue = String(search || "").trim().toLowerCase();
  const filtered = items.filter((product) => {
    const matchesCompany = !companyId || String(product.companyId) === String(companyId);
    const matchesSearch = !searchValue || String(product.name).toLowerCase().includes(searchValue);
    return matchesCompany && matchesSearch;
  });

  filtered.sort((first, second) => {
    const priceA = Number(first.price) || 0;
    const priceB = Number(second.price) || 0;
    return sort === "desc" ? priceB - priceA : priceA - priceB;
  });

  return filtered;
}

async function listCategories() {
  const [rows] = await getPool().query(
    `SELECT id, slug, name, fallback_image AS fallbackImage
     FROM catalog_categories
     ORDER BY sort_order ASC, id ASC`
  );

  return rows.map((row) => ({
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    fallbackImage: row.fallbackImage || "",
  }));
}

async function listCompanies(categorySlug) {
  const [rows] = await getPool().query(
    `SELECT
      companies.id,
      companies.name,
      companies.image_url AS imageUrl,
      companies.category_id AS categoryId
     FROM catalog_companies AS companies
     INNER JOIN catalog_categories AS categories ON categories.id = companies.category_id
     WHERE categories.slug = ?
     ORDER BY companies.name ASC, companies.id ASC`,
    [categorySlug]
  );

  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    imageUrl: row.imageUrl || "",
    categoryIds: [Number(row.categoryId) || 0],
  }));
}

async function listProducts(filters) {
  const rows = await fetchProductRows({
    where: `WHERE categories.slug = ?`,
    params: [filters.categorySlug],
  });
  const imageMap = await buildImageMap(rows.map((row) => String(row.id)));
  const products = rows.map((row) => mapProductRow(row, imageMap.get(String(row.id)) || []));
  return filterAndSortProducts(products, filters);
}

async function getProductBySlug(slug) {
  const rows = await fetchProductRows({
    where: `WHERE products.slug = ?`,
    limit: "1",
    params: [slug],
  });
  const row = rows[0];

  if (!row) {
    return null;
  }

  const imageMap = await buildImageMap([String(row.id)]);
  return mapProductRow(row, imageMap.get(String(row.id)) || []);
}

async function listPriceRules() {
  const [rows] = await getPool().query(
    `SELECT total, percent
     FROM catalog_price_rules
     ORDER BY total ASC`
  );

  return rows.map((row) => ({
    total: Number(row.total) || 1,
    percent: Number(row.percent) || 100,
  }));
}

async function listSuggestions(slug) {
  const [suggestionRows] = await getPool().query(
    `SELECT
      suggestions.suggested_product_id
     FROM catalog_product_suggestions AS suggestions
     INNER JOIN catalog_products AS products ON products.id = suggestions.product_id
     WHERE products.slug = ?
     ORDER BY suggestions.sort_order ASC, suggestions.suggested_product_id ASC`,
    [slug]
  );

  if (!suggestionRows.length) {
    const currentProduct = await getProductBySlug(slug);

    if (!currentProduct) {
      return [];
    }

    const fallbackRows = await fetchProductRows({
      where: `WHERE categories.id = ? AND products.slug <> ?`,
      params: [currentProduct.categoryId, slug],
    });
    const imageMap = await buildImageMap(fallbackRows.map((row) => String(row.id)));

    return fallbackRows
      .slice(0, 8)
      .map((row) => mapProductRow(row, imageMap.get(String(row.id)) || []));
  }

  const suggestedIds = suggestionRows.map((row) => String(row.suggested_product_id));
  const placeholders = suggestedIds.map(() => "?").join(", ");
  const rows = await fetchProductRows({
    where: `WHERE products.id IN (${placeholders})`,
    orderBy: "",
    params: suggestedIds,
  });
  const imageMap = await buildImageMap(rows.map((row) => String(row.id)));
  const orderMap = new Map(suggestedIds.map((id, index) => [id, index]));

  return rows
    .map((row) => mapProductRow(row, imageMap.get(String(row.id)) || []))
    .sort((first, second) => {
      return (orderMap.get(String(first.id)) || 0) - (orderMap.get(String(second.id)) || 0);
    })
    .slice(0, 12);
}

module.exports = {
  listCategories,
  listCompanies,
  listProducts,
  getProductBySlug,
  listPriceRules,
  listSuggestions,
};
