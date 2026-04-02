const crypto = require("crypto");
const { getPool } = require("../database/connection");

function toIsoString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mapCartItem(item, index) {
  const rentalDays = Number(item.rental_days ?? item.rentalDays) || 1;
  const price = Number(item.price) || 0;
  const sessionPrice = Number(item.session_price ?? item.sessionPrice) || 0;

  return {
    id: item.id,
    productId: item.product_id ?? item.productId,
    productSlug: item.product_slug ?? item.productSlug,
    productName: item.product_name ?? item.productName,
    price,
    sessionPrice,
    rentalDays,
    rentalStart: toIsoString(item.rental_start ?? item.rentalStart),
    imageUrl: item.image_url ?? item.imageUrl ?? "",
    index,
    totalPrice: rentalDays === 0.5 ? sessionPrice : price * rentalDays,
  };
}

function buildCartResponse(cart, items) {
  const normalizedItems = items.map((item, index) => mapCartItem(item, index + 1));
  const totalPrice = normalizedItems.reduce((total, item) => total + item.totalPrice, 0);

  return {
    token: cart.token,
    items: normalizedItems,
    totalPrice,
    updatedAt: toIsoString(cart.updated_at ?? cart.updatedAt),
  };
}

async function getCartByToken(connection, token) {
  if (!token) {
    return null;
  }

  const [rows] = await connection.query("SELECT * FROM carts WHERE token = ? LIMIT 1", [token]);
  return rows[0] || null;
}

async function getCartByUserId(connection, userId) {
  if (!userId) {
    return null;
  }

  const [rows] = await connection.query("SELECT * FROM carts WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0] || null;
}

async function createCart(connection, { token, userId }) {
  const cart = {
    id: crypto.randomUUID(),
    token: token || crypto.randomUUID(),
    userId: userId || null,
  };

  await connection.query(
    "INSERT INTO carts (id, token, user_id) VALUES (?, ?, ?)",
    [cart.id, cart.token, cart.userId]
  );

  return {
    id: cart.id,
    token: cart.token,
    user_id: cart.userId,
    updated_at: new Date(),
  };
}

async function mergeCarts(connection, targetCart, sourceCart) {
  if (!targetCart || !sourceCart || targetCart.id === sourceCart.id) {
    return targetCart;
  }

  await connection.query("UPDATE cart_items SET cart_id = ? WHERE cart_id = ?", [
    targetCart.id,
    sourceCart.id,
  ]);
  await connection.query("DELETE FROM carts WHERE id = ?", [sourceCart.id]);
  await connection.query(
    "UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [targetCart.id]
  );

  return {
    ...targetCart,
    updated_at: new Date(),
  };
}

async function attachUserToCart(connection, cart, userId) {
  if (!cart || !userId || cart.user_id === userId) {
    return cart;
  }

  await connection.query(
    "UPDATE carts SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [userId, cart.id]
  );

  return {
    ...cart,
    user_id: userId,
    updated_at: new Date(),
  };
}

async function listCartItems(connection, cartId) {
  const [rows] = await connection.query(
    `SELECT id, product_id, product_slug, product_name, price, session_price, rental_days, rental_start, image_url
     FROM cart_items
     WHERE cart_id = ?
     ORDER BY created_at ASC`,
    [cartId]
  );

  return rows;
}

async function resolveCart(connection, token, userId) {
  let tokenCart = await getCartByToken(connection, token);
  let userCart = await getCartByUserId(connection, userId);

  if (tokenCart && userId && tokenCart.user_id && tokenCart.user_id !== userId) {
    tokenCart = null;
  }

  if (tokenCart && userCart && tokenCart.id !== userCart.id) {
    tokenCart = await mergeCarts(connection, tokenCart, userCart);
    userCart = null;
  }

  let cart = tokenCart || userCart;

  if (!cart) {
    return createCart(connection, { token, userId });
  }

  if (userId && !cart.user_id) {
    cart = await attachUserToCart(connection, cart, userId);
  }

  return cart;
}

async function runWithCart(token, user, handler) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const cart = await resolveCart(connection, token, user?.id);
    const result = await handler(connection, cart);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getCart(token, user = null) {
  return runWithCart(token, user, async (connection, cart) => {
    const items = await listCartItems(connection, cart.id);
    return buildCartResponse(cart, items);
  });
}

async function addItem(token, product, payload = {}, user = null) {
  return runWithCart(token, user, async (connection, cart) => {
    const rentalDays = [0.5, 1, 2, 3, 6].includes(Number(payload.rentalDays))
      ? Number(payload.rentalDays)
      : 1;

    await connection.query(
      `INSERT INTO cart_items (
        id,
        cart_id,
        product_id,
        product_slug,
        product_name,
        price,
        session_price,
        rental_days,
        rental_start,
        image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        String(cart.id),
        String(product.id),
        String(product.slug),
        String(product.name),
        Number(product.price) || 0,
        Number(product.sessionPrice) || 0,
        rentalDays,
        payload.rentalStart ? new Date(payload.rentalStart) : new Date(),
        product.thumbnailUrl || product.images?.[0] || "",
      ]
    );

    await connection.query(
      "UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [cart.id]
    );

    const items = await listCartItems(connection, cart.id);
    return buildCartResponse({ ...cart, updated_at: new Date() }, items);
  });
}

async function removeItem(token, itemId, user = null) {
  return runWithCart(token, user, async (connection, cart) => {
    await connection.query("DELETE FROM cart_items WHERE id = ? AND cart_id = ?", [
      itemId,
      cart.id,
    ]);
    await connection.query(
      "UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [cart.id]
    );

    const items = await listCartItems(connection, cart.id);
    return buildCartResponse({ ...cart, updated_at: new Date() }, items);
  });
}

async function updateItem(token, itemId, payload = {}, user = null) {
  return runWithCart(token, user, async (connection, cart) => {
    const rentalDays = [0.5, 1, 2, 3, 6].includes(Number(payload.rentalDays))
      ? Number(payload.rentalDays)
      : 1;
    const rentalStart = payload.rentalStart ? new Date(payload.rentalStart) : new Date();

    await connection.query(
      `UPDATE cart_items
       SET rental_days = ?, rental_start = ?
       WHERE id = ? AND cart_id = ?`,
      [rentalDays, rentalStart, itemId, cart.id]
    );

    await connection.query(
      "UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [cart.id]
    );

    const items = await listCartItems(connection, cart.id);
    return buildCartResponse({ ...cart, updated_at: new Date() }, items);
  });
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
};
