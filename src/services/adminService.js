const { getPool } = require("../database/connection");

const ORDER_STATUSES = new Set(["pending", "confirmed", "renting", "completed", "cancelled"]);

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

async function getDashboardSummary() {
  const pool = getPool();
  const [[productRow]] = await pool.query("SELECT COUNT(*) AS total FROM catalog_products");
  const [[userRow]] = await pool.query("SELECT COUNT(*) AS total FROM users");
  const [[orderRow]] = await pool.query(
    `SELECT
      COUNT(*) AS totalOrders,
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
  const pool = getPool();
  const params = [];
  const where = [];

  if (filters.status && ORDER_STATUSES.has(String(filters.status))) {
    where.push("orders.status = ?");
    params.push(String(filters.status));
  }

  if (filters.search) {
    const keyword = `%${escapeLike(filters.search)}%`;
    where.push(
      `(orders.order_code LIKE ? ESCAPE '\\' OR users.full_name LIKE ? ESCAPE '\\' OR users.phone LIKE ? ESCAPE '\\' OR users.email LIKE ? ESCAPE '\\')`
    );
    params.push(keyword, keyword, keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT
      orders.id,
      orders.order_code,
      orders.status,
      orders.subtotal_price,
      orders.total_price,
      orders.created_at,
      orders.updated_at,
      users.id AS user_id,
      users.full_name,
      users.phone,
      users.email,
      profiles.address,
      profiles.identity_number,
      COUNT(items.id) AS item_count
     FROM rental_orders AS orders
     INNER JOIN users ON users.id = orders.user_id
     LEFT JOIN user_profiles AS profiles ON profiles.user_id = users.id
     LEFT JOIN rental_order_items AS items ON items.order_id = orders.id
     ${whereSql}
     GROUP BY
      orders.id,
      orders.order_code,
      orders.status,
      orders.subtotal_price,
      orders.total_price,
      orders.created_at,
      orders.updated_at,
      users.id,
      users.full_name,
      users.phone,
      users.email,
      profiles.address,
      profiles.identity_number
     ORDER BY orders.created_at DESC`,
    params
  );

  if (!rows.length) {
    return [];
  }

  const [itemRows] = await pool.query(
    `SELECT
      id,
      order_id,
      product_id,
      product_slug,
      product_name,
      image_url,
      price,
      rental_days,
      rental_start,
      total_price
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
    items: itemRows
      .filter((item) => item.order_id === row.id)
      .map((item) => ({
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

  if (!ORDER_STATUSES.has(nextStatus)) {
    throw new Error("Trạng thái đơn thuê không hợp lệ.");
  }

  await getPool().query(
    `UPDATE rental_orders
     SET status = ?
     WHERE id = ?`,
    [nextStatus, orderId]
  );

  const orders = await listOrders({});
  return orders.find((order) => order.id === orderId) || null;
}

async function listRenters(filters = {}) {
  const pool = getPool();
  const params = [];
  const where = [];

  if (filters.search) {
    const keyword = `%${escapeLike(filters.search)}%`;
    where.push(
      `(users.full_name LIKE ? ESCAPE '\\' OR users.phone LIKE ? ESCAPE '\\' OR users.email LIKE ? ESCAPE '\\' OR profiles.identity_number LIKE ? ESCAPE '\\')`
    );
    params.push(keyword, keyword, keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT
      users.id,
      users.full_name,
      users.phone,
      users.email,
      users.created_at,
      profiles.birthday,
      profiles.address,
      profiles.identity_number,
      profiles.facebook_url,
      COUNT(DISTINCT orders.id) AS total_orders,
      COALESCE(SUM(orders.total_price), 0) AS total_spent,
      MAX(CASE WHEN documents.document_type = 'cccd_front' THEN documents.file_path END) AS cccd_front_path,
      MAX(CASE WHEN documents.document_type = 'cccd_back' THEN documents.file_path END) AS cccd_back_path,
      MAX(CASE WHEN documents.document_type = 'personal_other' THEN documents.file_path END) AS personal_other_path
     FROM users
     LEFT JOIN user_profiles AS profiles ON profiles.user_id = users.id
     LEFT JOIN rental_orders AS orders ON orders.user_id = users.id
     LEFT JOIN user_documents AS documents ON documents.user_id = users.id
     ${whereSql}
     GROUP BY
      users.id,
      users.full_name,
      users.phone,
      users.email,
      users.created_at,
      profiles.birthday,
      profiles.address,
      profiles.identity_number,
      profiles.facebook_url
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
  const pool = getPool();
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

  const [rows] = await pool.query(
    `SELECT
      products.id,
      products.slug,
      products.name,
      products.price,
      products.session_price,
      products.thumbnail_url,
      categories.slug AS category_slug,
      categories.name AS category_name,
      companies.name AS company_name
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
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    companyName: row.company_name,
  }));
}

async function getProductDetail(productId) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT
      products.id,
      products.slug,
      products.name,
      products.price,
      products.session_price,
      products.thumbnail_url,
      products.description,
      products.detail,
      categories.id AS category_id,
      categories.slug AS category_slug,
      categories.name AS category_name,
      companies.id AS company_id,
      companies.name AS company_name
     FROM catalog_products AS products
     INNER JOIN catalog_categories AS categories ON categories.id = products.category_id
     INNER JOIN catalog_companies AS companies ON companies.id = products.company_id
     WHERE products.id = ?
     LIMIT 1`,
    [productId]
  );

  if (!row) {
    return null;
  }

  const [imageRows] = await pool.query(
    `SELECT image_url, sort_order
     FROM catalog_product_images
     WHERE product_id = ?
     ORDER BY sort_order ASC, id ASC`,
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
    companyId: String(row.company_id),
    companyName: row.company_name,
    images: imageRows.map((image) => image.image_url).filter(Boolean),
  };
}

async function updateProduct(productId, payload = {}) {
  const name = String(payload.name || "").trim();
  const slug = String(payload.slug || "").trim();
  const price = Number(payload.price);
  const sessionPrice = Number(payload.sessionPrice);
  const thumbnailUrl = String(payload.thumbnailUrl || "").trim();
  const description = String(payload.description || "").trim();
  const detail = String(payload.detail || "").trim();

  if (name.length < 2) {
    throw new Error("Tên sản phẩm chưa hợp lệ.");
  }

  if (slug.length < 2) {
    throw new Error("Slug sản phẩm chưa hợp lệ.");
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Giá thuê theo ngày chưa hợp lệ.");
  }

  if (!Number.isFinite(sessionPrice) || sessionPrice < 0) {
    throw new Error("Giá thuê theo buổi chưa hợp lệ.");
  }

  const [[existingProduct]] = await getPool().query(
    `SELECT id
     FROM catalog_products
     WHERE slug = ? AND id <> ?
     LIMIT 1`,
    [slug, productId]
  );

  if (existingProduct) {
    throw new Error("Slug sản phẩm đã tồn tại.");
  }

  await getPool().query(
    `UPDATE catalog_products
     SET name = ?, slug = ?, price = ?, session_price = ?, thumbnail_url = ?, description = ?, detail = ?
     WHERE id = ?`,
    [
      name,
      slug,
      Math.round(price),
      Math.round(sessionPrice),
      thumbnailUrl,
      description,
      detail,
      productId,
    ]
  );

  return getProductDetail(productId);
}

module.exports = {
  ORDER_STATUSES: Array.from(ORDER_STATUSES),
  getDashboardSummary,
  listOrders,
  updateOrderStatus,
  listRenters,
  listProducts,
  getProductDetail,
  updateProduct,
};
