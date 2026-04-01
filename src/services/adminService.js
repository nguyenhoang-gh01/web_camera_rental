const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { getPool } = require("../database/connection");
const { getConfig } = require("../config/env");

const ORDER_STATUSES = new Set(["pending", "confirmed", "renting", "completed", "cancelled"]);
const IMAGE_MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function toIsoString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function escapeLike(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function sanitizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function sanitizeFileName(fileName) {
  return String(fileName || "image")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeImageUrls(imageUrls) {
  return Array.from(
    new Set(
      (Array.isArray(imageUrls) ? imageUrls : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

async function deletePhysicalFile(filePath) {
  if (!filePath || !String(filePath).startsWith("/uploads/product-images/")) {
    return;
  }

  try {
    await fs.unlink(path.join(getConfig().publicDir, String(filePath).replace(/^\//, "")));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

async function storeProductImage(file) {
  if (!file?.data || !file?.contentType) {
    throw new Error("File ảnh tải lên không hợp lệ.");
  }

  const extension =
    IMAGE_MIME_EXT[String(file.contentType || "").toLowerCase()] ||
    path.extname(String(file.fileName || "")) ||
    ".bin";
  const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.fileName)}${extension}`;
  const relativeDir = path.join("uploads", "product-images");
  const absoluteDir = path.join(getConfig().publicDir, relativeDir);
  const absolutePath = path.join(absoluteDir, fileName);
  const relativePath = `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, Buffer.from(String(file.data), "base64"));
  return relativePath;
}

async function replaceProductImages(connection, productId, nextImages) {
  const normalizedImages = normalizeImageUrls(nextImages);
  const [existingRows] = await connection.query(
    "SELECT image_url FROM catalog_product_images WHERE product_id = ?",
    [productId]
  );
  const existingImages = existingRows.map((row) => String(row.image_url || "")).filter(Boolean);
  const removedImages = existingImages.filter((item) => !normalizedImages.includes(item));

  await connection.query("DELETE FROM catalog_product_images WHERE product_id = ?", [productId]);

  for (const [index, imageUrl] of normalizedImages.entries()) {
    await connection.query(
      "INSERT INTO catalog_product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)",
      [productId, imageUrl, index + 1]
    );
  }

  await Promise.all(removedImages.map((imageUrl) => deletePhysicalFile(imageUrl)));
}

async function validateCategoryAndCompany(connection, categoryId, companyId) {
  const [[category]] = await connection.query(
    "SELECT id FROM catalog_categories WHERE id = ? LIMIT 1",
    [categoryId]
  );
  if (!category) {
    throw new Error("Danh mục sản phẩm không hợp lệ.");
  }

  const [[company]] = await connection.query(
    "SELECT id, category_id FROM catalog_companies WHERE id = ? LIMIT 1",
    [companyId]
  );
  if (!company) {
    throw new Error("Hãng sản phẩm không hợp lệ.");
  }
  if (Number(company.category_id) !== Number(categoryId)) {
    throw new Error("Hãng sản phẩm không thuộc danh mục đã chọn.");
  }
}

function normalizeProductPayload(payload = {}) {
  const name = String(payload.name || "").trim();
  const slug = sanitizeSlug(payload.slug || payload.name || "");
  const price = Number(payload.price);
  const sessionPrice = Number(payload.sessionPrice);
  const categoryId = Number(payload.categoryId);
  const companyId = Number(payload.companyId);
  const description = String(payload.description || "").trim();
  const detail = String(payload.detail || "").trim();
  const imageUrls = normalizeImageUrls(payload.imageUrls);
  const thumbnailUrl = String(payload.thumbnailUrl || "").trim() || imageUrls[0] || "";

  if (name.length < 2) throw new Error("Tên sản phẩm chưa hợp lệ.");
  if (slug.length < 2) throw new Error("Slug sản phẩm chưa hợp lệ.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Giá thuê theo ngày chưa hợp lệ.");
  if (!Number.isFinite(sessionPrice) || sessionPrice < 0) throw new Error("Giá thuê theo buổi chưa hợp lệ.");
  if (!Number.isFinite(categoryId) || categoryId <= 0) throw new Error("Danh mục sản phẩm chưa hợp lệ.");
  if (!Number.isFinite(companyId) || companyId <= 0) throw new Error("Hãng sản phẩm chưa hợp lệ.");

  return {
    name,
    slug,
    price: Math.round(price),
    sessionPrice: Math.round(sessionPrice),
    categoryId,
    companyId,
    description,
    detail,
    imageUrls: imageUrls.length ? imageUrls : [thumbnailUrl].filter(Boolean),
    thumbnailUrl,
  };
}

async function getDashboardSummary() {
  const pool = getPool();
  const [[productRow]] = await pool.query("SELECT COUNT(*) AS total FROM catalog_products");
  const [[userRow]] = await pool.query("SELECT COUNT(*) AS total FROM users");
  const [[orderRow]] = await pool.query(
    `SELECT COUNT(*) AS totalOrders,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingOrders,
            COALESCE(SUM(total_price), 0) AS totalRevenue
     FROM rental_orders`
  );

  return {
    totalProducts: Number(productRow.total) || 0,
    totalRenters: Number(userRow.total) || 0,
    totalOrders: Number(orderRow.totalOrders) || 0,
    pendingOrders: Number(orderRow.pendingOrders) || 0,
    totalRevenue: Number(orderRow.totalRevenue) || 0,
  };
}

async function listOrders(filters = {}) {
  const params = [];
  const where = [];
  if (filters.status && ORDER_STATUSES.has(String(filters.status))) {
    where.push("orders.status = ?");
    params.push(String(filters.status));
  }
  if (filters.search) {
    const keyword = `%${escapeLike(filters.search)}%`;
    where.push("(orders.order_code LIKE ? ESCAPE '\\' OR users.full_name LIKE ? ESCAPE '\\' OR users.phone LIKE ? ESCAPE '\\' OR users.email LIKE ? ESCAPE '\\')");
    params.push(keyword, keyword, keyword, keyword);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await getPool().query(
    `SELECT orders.id, orders.order_code, orders.status, orders.subtotal_price, orders.total_price,
            orders.created_at, orders.updated_at, users.id AS user_id, users.full_name, users.phone,
            users.email, profiles.address, profiles.identity_number, COUNT(items.id) AS item_count
     FROM rental_orders AS orders
     INNER JOIN users ON users.id = orders.user_id
     LEFT JOIN user_profiles AS profiles ON profiles.user_id = users.id
     LEFT JOIN rental_order_items AS items ON items.order_id = orders.id
     ${whereSql}
     GROUP BY orders.id, orders.order_code, orders.status, orders.subtotal_price, orders.total_price,
              orders.created_at, orders.updated_at, users.id, users.full_name, users.phone,
              users.email, profiles.address, profiles.identity_number
     ORDER BY orders.created_at DESC`,
    params
  );

  if (!rows.length) return [];

  const [itemRows] = await getPool().query(
    `SELECT id, order_id, product_id, product_slug, product_name, image_url, price, rental_days, rental_start, total_price
     FROM rental_order_items
     WHERE order_id IN (?)
     ORDER BY created_at ASC`,
    [rows.map((row) => row.id)]
  );

  return rows.map((row) => ({
    id: row.id,
    orderCode: row.order_code,
    status: row.status,
    subtotalPrice: Number(row.subtotal_price) || 0,
    totalPrice: Number(row.total_price) || 0,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    itemCount: Number(row.item_count) || 0,
    renter: {
      id: row.user_id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      address: row.address || "",
      identityNumber: row.identity_number || "",
    },
    items: itemRows.filter((item) => item.order_id === row.id).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productSlug: item.product_slug,
      productName: item.product_name,
      imageUrl: item.image_url || "",
      price: Number(item.price) || 0,
      rentalDays: Number(item.rental_days) || 1,
      rentalStart: toIsoString(item.rental_start),
      totalPrice: Number(item.total_price) || 0,
    })),
  }));
}

async function updateOrderStatus(orderId, status) {
  const nextStatus = String(status || "").trim().toLowerCase();
  if (!ORDER_STATUSES.has(nextStatus)) throw new Error("Trạng thái đơn thuê không hợp lệ.");
  await getPool().query("UPDATE rental_orders SET status = ? WHERE id = ?", [nextStatus, orderId]);
  const orders = await listOrders({});
  return orders.find((order) => order.id === orderId) || null;
}

async function listRenters(filters = {}) {
  const params = [];
  const where = [];
  if (filters.search) {
    const keyword = `%${escapeLike(filters.search)}%`;
    where.push("(users.full_name LIKE ? ESCAPE '\\' OR users.phone LIKE ? ESCAPE '\\' OR users.email LIKE ? ESCAPE '\\' OR profiles.identity_number LIKE ? ESCAPE '\\')");
    params.push(keyword, keyword, keyword, keyword);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await getPool().query(
    `SELECT users.id, users.full_name, users.phone, users.email, users.created_at, profiles.birthday,
            profiles.address, profiles.identity_number, profiles.facebook_url,
            COUNT(DISTINCT orders.id) AS total_orders, COALESCE(SUM(orders.total_price), 0) AS total_spent,
            MAX(CASE WHEN documents.document_type = 'cccd_front' THEN documents.file_path END) AS cccd_front_path,
            MAX(CASE WHEN documents.document_type = 'cccd_back' THEN documents.file_path END) AS cccd_back_path,
            MAX(CASE WHEN documents.document_type = 'personal_other' THEN documents.file_path END) AS personal_other_path
     FROM users
     LEFT JOIN user_profiles AS profiles ON profiles.user_id = users.id
     LEFT JOIN rental_orders AS orders ON orders.user_id = users.id
     LEFT JOIN user_documents AS documents ON documents.user_id = users.id
     ${whereSql}
     GROUP BY users.id, users.full_name, users.phone, users.email, users.created_at,
              profiles.birthday, profiles.address, profiles.identity_number, profiles.facebook_url
     ORDER BY users.created_at DESC`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    createdAt: toIsoString(row.created_at),
    birthday: row.birthday ? new Date(row.birthday).toISOString().slice(0, 10) : "",
    address: row.address || "",
    identityNumber: row.identity_number || "",
    facebookUrl: row.facebook_url || "",
    totalOrders: Number(row.total_orders) || 0,
    totalSpent: Number(row.total_spent) || 0,
    verificationReady: Boolean(row.cccd_front_path && row.cccd_back_path),
    documents: {
      cccdFront: row.cccd_front_path || "",
      cccdBack: row.cccd_back_path || "",
      personalOther: row.personal_other_path || "",
    },
  }));
}

async function listProducts(filters = {}) {
  const params = [];
  const where = [];
  if (filters.categorySlug) {
    where.push("categories.slug = ?");
    params.push(String(filters.categorySlug));
  }
  if (filters.search) {
    const keyword = `%${escapeLike(filters.search)}%`;
    where.push("(products.name LIKE ? ESCAPE '\\' OR companies.name LIKE ? ESCAPE '\\')");
    params.push(keyword, keyword);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await getPool().query(
    `SELECT products.id, products.slug, products.name, products.price, products.session_price,
            products.thumbnail_url, categories.id AS category_id, categories.slug AS category_slug,
            categories.name AS category_name, companies.id AS company_id, companies.name AS company_name
     FROM catalog_products AS products
     INNER JOIN catalog_categories AS categories ON categories.id = products.category_id
     INNER JOIN catalog_companies AS companies ON companies.id = products.company_id
     ${whereSql}
     ORDER BY products.name ASC`,
    params
  );

  return rows.map((row) => ({
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    price: Number(row.price) || 0,
    sessionPrice: Number(row.session_price) || 0,
    thumbnailUrl: row.thumbnail_url || "",
    categoryId: Number(row.category_id) || 0,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    companyId: Number(row.company_id) || 0,
    companyName: row.company_name,
  }));
}

async function listCatalogCategories() {
  const [rows] = await getPool().query("SELECT id, slug, name FROM catalog_categories ORDER BY sort_order ASC, id ASC");
  return rows.map((row) => ({ id: Number(row.id) || 0, slug: row.slug, name: row.name }));
}

async function listCatalogCompanies() {
  const [rows] = await getPool().query("SELECT id, category_id, name FROM catalog_companies ORDER BY name ASC, id ASC");
  return rows.map((row) => ({ id: Number(row.id) || 0, categoryId: Number(row.category_id) || 0, name: row.name }));
}

async function getProductDetail(productId) {
  const [[row]] = await getPool().query(
    `SELECT products.id, products.slug, products.name, products.price, products.session_price,
            products.thumbnail_url, products.description, products.detail,
            categories.id AS category_id, categories.slug AS category_slug, categories.name AS category_name,
            companies.id AS company_id, companies.name AS company_name
     FROM catalog_products AS products
     INNER JOIN catalog_categories AS categories ON categories.id = products.category_id
     INNER JOIN catalog_companies AS companies ON companies.id = products.company_id
     WHERE products.id = ?
     LIMIT 1`,
    [productId]
  );

  if (!row) return null;

  const [imageRows] = await getPool().query(
    "SELECT image_url FROM catalog_product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC",
    [productId]
  );

  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    price: Number(row.price) || 0,
    sessionPrice: Number(row.session_price) || 0,
    thumbnailUrl: row.thumbnail_url || "",
    description: row.description || "",
    detail: row.detail || "",
    categoryId: Number(row.category_id) || 0,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    companyId: Number(row.company_id) || 0,
    companyName: row.company_name,
    images: imageRows.map((rowItem) => rowItem.image_url).filter(Boolean),
  };
}

async function createProduct(payload = {}) {
  const connection = getPool();
  const data = normalizeProductPayload(payload);
  await validateCategoryAndCompany(connection, data.categoryId, data.companyId);

  const [[existingProduct]] = await connection.query("SELECT id FROM catalog_products WHERE slug = ? LIMIT 1", [data.slug]);
  if (existingProduct) throw new Error("Slug sản phẩm đã tồn tại.");

  const productId = `PRD-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  await connection.query(
    `INSERT INTO catalog_products
      (id, slug, name, price, session_price, category_id, company_id, thumbnail_url, description, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [productId, data.slug, data.name, data.price, data.sessionPrice, data.categoryId, data.companyId, data.thumbnailUrl, data.description, data.detail]
  );
  await replaceProductImages(connection, productId, data.imageUrls);
  return getProductDetail(productId);
}

async function updateProduct(productId, payload = {}) {
  const connection = getPool();
  const data = normalizeProductPayload(payload);
  await validateCategoryAndCompany(connection, data.categoryId, data.companyId);

  const [[existingProduct]] = await connection.query(
    "SELECT id FROM catalog_products WHERE slug = ? AND id <> ? LIMIT 1",
    [data.slug, productId]
  );
  if (existingProduct) throw new Error("Slug sản phẩm đã tồn tại.");

  await connection.query(
    `UPDATE catalog_products
     SET slug = ?, name = ?, price = ?, session_price = ?, category_id = ?, company_id = ?, thumbnail_url = ?, description = ?, detail = ?
     WHERE id = ?`,
    [data.slug, data.name, data.price, data.sessionPrice, data.categoryId, data.companyId, data.thumbnailUrl, data.description, data.detail, productId]
  );
  await replaceProductImages(connection, productId, data.imageUrls);
  return getProductDetail(productId);
}

async function deleteProduct(productId) {
  const connection = getPool();
  const product = await getProductDetail(productId);
  if (!product) throw new Error("Không tìm thấy sản phẩm để xóa.");
  await replaceProductImages(connection, productId, []);
  await connection.query("DELETE FROM catalog_products WHERE id = ?", [productId]);
  if (product.thumbnailUrl && !product.images.includes(product.thumbnailUrl)) {
    await deletePhysicalFile(product.thumbnailUrl);
  }
  return { id: product.id, name: product.name };
}

async function uploadProductImage(file) {
  return { imageUrl: await storeProductImage(file) };
}

module.exports = {
  ORDER_STATUSES: Array.from(ORDER_STATUSES),
  getDashboardSummary,
  listOrders,
  updateOrderStatus,
  listRenters,
  listProducts,
  listCatalogCategories,
  listCatalogCompanies,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
};
