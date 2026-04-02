const crypto = require("crypto");
const { getPool } = require("../database/connection");

function toIsoString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatOrderCode() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `FC${year}${month}${day}-${suffix}`;
}

async function getCartForCheckout(connection, token, userId) {
  let cart = null;

  if (userId) {
    const [userCartRows] = await connection.query(
      `SELECT *
       FROM carts
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );
    cart = userCartRows[0] || null;
  }

  if (!cart && token) {
    const [tokenCartRows] = await connection.query(
      `SELECT *
       FROM carts
       WHERE token = ?
       LIMIT 1`,
      [token]
    );
    cart = tokenCartRows[0] || null;

    if (cart && userId && !cart.user_id) {
      await connection.query(
        `UPDATE carts
         SET user_id = ?
         WHERE id = ?`,
        [userId, cart.id]
      );
      cart.user_id = userId;
    }
  }

  return cart;
}

async function ensureUserCanRent(connection, userId) {
  const [rows] = await connection.query(
    `SELECT document_type
     FROM user_documents
     WHERE user_id = ? AND document_type IN ('cccd_front', 'cccd_back')`,
    [userId]
  );

  const uploaded = new Set(rows.map((row) => row.document_type));

  if (!uploaded.has("cccd_front") || !uploaded.has("cccd_back")) {
    throw new Error("Bạn cần tải đủ CCCD mặt trước và mặt sau trong tài khoản trước khi thuê.");
  }
}

async function listCartItems(connection, cartId) {
  const [rows] = await connection.query(
    `SELECT id, product_id, product_slug, product_name, image_url, price, session_price, rental_days, rental_start
     FROM cart_items
     WHERE cart_id = ?
     ORDER BY created_at ASC`,
    [cartId]
  );

  return rows.map((item) => {
    const rentalDays = Number(item.rental_days) || 1;
    const price = Number(item.price) || 0;
    const sessionPrice = Number(item.session_price) || 0;

    return {
      id: item.id,
      productId: item.product_id,
      productSlug: item.product_slug,
      productName: item.product_name,
      imageUrl: item.image_url || "",
      price,
      sessionPrice,
      rentalDays,
      rentalStart: toIsoString(item.rental_start),
      totalPrice: rentalDays === 0.5 ? sessionPrice : price * rentalDays,
    };
  });
}

function groupOrders(orderRows, itemRows) {
  return orderRows.map((order) => ({
    id: order.id,
    orderCode: order.order_code,
    status: order.status,
    subtotalPrice: Number(order.subtotal_price) || 0,
    totalPrice: Number(order.total_price) || 0,
    createdAt: toIsoString(order.created_at),
    updatedAt: toIsoString(order.updated_at),
    items: itemRows
      .filter((item) => item.order_id === order.id)
      .map((item) => ({
        id: item.id,
        productId: item.product_id,
        productSlug: item.product_slug,
        productName: item.product_name,
        imageUrl: item.image_url || "",
        price: Number(item.price) || 0,
        sessionPrice: Number(item.session_price) || 0,
        rentalDays: Number(item.rental_days) || 1,
        rentalStart: toIsoString(item.rental_start),
        totalPrice: Number(item.total_price) || 0,
      })),
  }));
}

async function listOrders(userId) {
  const pool = getPool();
  const [orders] = await pool.query(
    `SELECT id, order_code, status, subtotal_price, total_price, created_at, updated_at
     FROM rental_orders
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  if (!orders.length) {
    return [];
  }

  const [items] = await pool.query(
    `SELECT id, order_id, product_id, product_slug, product_name, image_url, price, session_price, rental_days, rental_start, total_price
     FROM rental_order_items
     WHERE order_id IN (?)
     ORDER BY created_at ASC`,
    [orders.map((order) => order.id)]
  );

  return groupOrders(orders, items);
}

async function checkoutCart(token, user) {
  if (!user?.id) {
    throw new Error("Vui lòng đăng nhập trước khi tạo đơn thuê.");
  }

  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const cart = await getCartForCheckout(connection, token, user.id);

    if (!cart) {
      throw new Error("Không tìm thấy giỏ hàng để tạo đơn thuê.");
    }

    const items = await listCartItems(connection, cart.id);

    if (!items.length) {
      throw new Error("Giỏ hàng của bạn đang trống.");
    }

    await ensureUserCanRent(connection, user.id);

    const orderId = crypto.randomUUID();
    const orderCode = formatOrderCode();
    const subtotalPrice = items.reduce((total, item) => total + item.totalPrice, 0);

    await connection.query(
      `INSERT INTO rental_orders (
        id,
        order_code,
        user_id,
        status,
        subtotal_price,
        total_price
      ) VALUES (?, ?, ?, 'pending', ?, ?)`,
      [orderId, orderCode, user.id, subtotalPrice, subtotalPrice]
    );

    for (const item of items) {
      await connection.query(
        `INSERT INTO rental_order_items (
          id,
          order_id,
          product_id,
          product_slug,
          product_name,
          image_url,
          price,
          session_price,
          rental_days,
          rental_start,
          total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          orderId,
          item.productId,
          item.productSlug,
          item.productName,
          item.imageUrl,
          item.price,
          item.sessionPrice,
          item.rentalDays,
          new Date(item.rentalStart),
          item.totalPrice,
        ]
      );
    }

    await connection.query(
      `DELETE FROM cart_items
       WHERE cart_id = ?`,
      [cart.id]
    );

    await connection.query(
      `UPDATE carts
       SET updated_at = CURRENT_TIMESTAMP, user_id = ?
       WHERE id = ?`,
      [user.id, cart.id]
    );

    await connection.commit();

    const orders = await listOrders(user.id);

    return {
      order: orders.find((order) => order.id === orderId) || null,
      orders,
      cart: {
        token: cart.token,
        items: [],
        totalPrice: 0,
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listOrders,
  checkoutCart,
};
