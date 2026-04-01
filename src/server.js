const express = require("express");
const path = require("path");
const { getConfig } = require("./config/env");
const { bootstrapDatabase } = require("./database/bootstrap");
const {
  listCategories,
  listCompanies,
  listProducts,
  getProductBySlug,
  listPriceRules,
  listSuggestions,
} = require("./services/catalogService");
const authService = require("./services/authService");
const accountService = require("./services/accountService");
const adminService = require("./services/adminService");
const cartService = require("./services/cartService");
const rentalService = require("./services/rentalService");

const app = express();
const config = getConfig();
const PORT = config.port;
const PUBLIC_DIR = config.publicDir;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: false, limit: "25mb" }));

function getBearerToken(request) {
  const authorization = request.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.replace("Bearer ", "").trim();
}

function getCartToken(request) {
  return String(request.headers["x-cart-token"] || "").trim();
}

async function getCurrentUser(request) {
  return authService.getUserByToken(getBearerToken(request));
}

async function requireAdminUser(request, response) {
  const user = await getCurrentUser(request);

  if (!user) {
    response.status(401).json({ error: "Vui lĂ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ truy cáº­p trang quáº£n trá»‹." });
    return null;
  }

  if (!user.isAdmin) {
    response.status(403).json({ error: "Báº¡n khĂ´ng cĂ³ quyá»n truy cáº­p khu vá»±c quáº£n trá»‹." });
    return null;
  }

  return user;
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    name: "focus-camera-backend",
    database: config.database.name,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/categories", async (request, response) => {
  response.json({ categories: await listCategories() });
});

app.get("/api/companies", async (request, response) => {
  const categorySlug = String(request.query.category || "thue-camera-may-anh");
  response.json({ companies: await listCompanies(categorySlug) });
});

app.get("/api/products", async (request, response) => {
  const categorySlug = String(request.query.category || "thue-camera-may-anh");
  const companyId = String(request.query.companyId || "");
  const search = String(request.query.search || "");
  const sort = String(request.query.sort || "asc");

  response.json({
    products: await listProducts({
      categorySlug,
      companyId,
      search,
      sort,
    }),
  });
});

app.get("/api/products/:slug", async (request, response) => {
  const product = await getProductBySlug(request.params.slug);

  if (!product) {
    response.status(404).json({ error: "Không tìm thấy sản phẩm." });
    return;
  }

  response.json({ product });
});

app.get("/api/products/:slug/suggestions", async (request, response) => {
  response.json({
    products: await listSuggestions(request.params.slug),
  });
});

app.get("/api/price-rules", async (request, response) => {
  response.json({ priceRules: await listPriceRules() });
});

app.get("/api/admin/dashboard", async (request, response) => {
  const adminUser = await requireAdminUser(request, response);

  if (!adminUser) {
    return;
  }

  const [summary, orders, products, renters] = await Promise.all([
    adminService.getDashboardSummary(),
    adminService.listOrders({
      status: String(request.query.orderStatus || ""),
      search: String(request.query.orderSearch || ""),
    }),
    adminService.listProducts({
      categorySlug: String(request.query.category || ""),
      search: String(request.query.productSearch || ""),
    }),
    adminService.listRenters({
      search: String(request.query.renterSearch || ""),
    }),
  ]);

  response.json({
    summary,
    statusOptions: adminService.ORDER_STATUSES,
    orders,
    products,
    renters,
  });
});

app.patch("/api/admin/orders/:orderId", async (request, response) => {
  const adminUser = await requireAdminUser(request, response);

  if (!adminUser) {
    return;
  }

  try {
    const order = await adminService.updateOrderStatus(
      request.params.orderId,
      request.body.status
    );

    response.json({ order });
  } catch (error) {
    response.status(400).json({ error: error.message || "Không thể cập nhật đơn thuê." });
  }
});

app.patch("/api/admin/products/:productId", async (request, response) => {
  const adminUser = await requireAdminUser(request, response);

  if (!adminUser) {
    return;
  }

  try {
    const product = await adminService.updateProduct(
      request.params.productId,
      request.body
    );

    response.json({ product });
  } catch (error) {
    response.status(400).json({ error: error.message || "Không thể cập nhật sản phẩm." });
  }
});

app.get("/api/admin/products/:productId", async (request, response) => {
  const adminUser = await requireAdminUser(request, response);

  if (!adminUser) {
    return;
  }

  const product = await adminService.getProductDetail(request.params.productId);

  if (!product) {
    response.status(404).json({ error: "KhĂ´ng tĂ¬m tháº¥y sáº£n pháº©m." });
    return;
  }

  response.json({ product });
});

app.post("/api/auth/register", async (request, response) => {
  try {
    const result = await authService.register(request.body);
    response.status(201).json(result);
  } catch (error) {
    response.status(400).json({ error: error.message || "Không thể đăng ký." });
  }
});

app.post("/api/auth/login", async (request, response) => {
  try {
    const result = await authService.login(request.body);
    response.json(result);
  } catch (error) {
    response.status(400).json({ error: error.message || "Không thể đăng nhập." });
  }
});

app.get("/api/auth/me", async (request, response) => {
  const user = await getCurrentUser(request);

  if (!user) {
    response.status(401).json({ error: "Phiên đăng nhập không hợp lệ." });
    return;
  }

  response.json({ user });
});

app.get("/api/account/profile", async (request, response) => {
  const user = await getCurrentUser(request);

  if (!user) {
    response.status(401).json({ error: "Vui lòng đăng nhập để xem tài khoản." });
    return;
  }

  response.json(await accountService.getProfile(user.id));
});

app.post("/api/account/profile", async (request, response) => {
  const user = await getCurrentUser(request);

  if (!user) {
    response.status(401).json({ error: "Vui lòng đăng nhập để cập nhật tài khoản." });
    return;
  }

  try {
    const result = await accountService.updateProfile(user.id, request.body);
    response.json(result);
  } catch (error) {
    response.status(400).json({ error: error.message || "Không thể cập nhật tài khoản." });
  }
});

app.post("/api/account/password", async (request, response) => {
  const user = await getCurrentUser(request);

  if (!user) {
    response.status(401).json({ error: "Vui lòng đăng nhập để đổi mật khẩu." });
    return;
  }

  try {
    const result = await authService.changePassword(user.id, request.body);
    response.json(result);
  } catch (error) {
    response.status(400).json({ error: error.message || "Không thể đổi mật khẩu." });
  }
});

app.get("/api/account/rentals", async (request, response) => {
  const user = await getCurrentUser(request);

  if (!user) {
    response.status(401).json({ error: "Vui lòng đăng nhập để xem lịch sử thuê." });
    return;
  }

  response.json({
    orders: await rentalService.listOrders(user.id),
  });
});

app.post("/api/auth/logout", async (request, response) => {
  await authService.logout(getBearerToken(request));
  response.json({ ok: true });
});

app.get("/api/cart", async (request, response) => {
  const cart = await cartService.getCart(getCartToken(request), await getCurrentUser(request));
  response.json({
    cart,
    cartToken: cart.token,
  });
});

app.post("/api/cart/items", async (request, response) => {
  const product = await getProductBySlug(request.body.productSlug);

  if (!product) {
    response.status(404).json({ error: "Sản phẩm không tồn tại." });
    return;
  }

  const cart = await cartService.addItem(
    getCartToken(request),
    product,
    request.body,
    await getCurrentUser(request)
  );

  response.status(201).json({
    cart,
    cartToken: cart.token,
  });
});

app.patch("/api/cart/items/:itemId", async (request, response) => {
  const cart = await cartService.updateItem(
    getCartToken(request),
    request.params.itemId,
    request.body,
    await getCurrentUser(request)
  );

  response.json({
    cart,
    cartToken: cart.token,
  });
});

app.delete("/api/cart/items/:itemId", async (request, response) => {
  const cart = await cartService.removeItem(
    getCartToken(request),
    request.params.itemId,
    await getCurrentUser(request)
  );

  response.json({
    cart,
    cartToken: cart.token,
  });
});

app.post("/api/rentals/checkout", async (request, response) => {
  const user = await getCurrentUser(request);

  try {
    const result = await rentalService.checkoutCart(getCartToken(request), user);
    response.status(201).json({
      order: result.order,
      orders: result.orders,
      cart: result.cart,
      cartToken: result.cart.token,
    });
  } catch (error) {
    const isAuthError = /đăng nhập/i.test(String(error.message || ""));
    response.status(isAuthError ? 401 : 400).json({
      error: error.message || "Không thể tạo đơn thuê.",
    });
  }
});

app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

app.get("/", (request, response) => {
  response.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

async function startServer() {
  const seedResult = await bootstrapDatabase();

  app.listen(PORT, () => {
    console.log(`FOCUS CAMERA backend is running at http://localhost:${PORT}`);
    if (seedResult?.seeded) {
      console.log("Catalog seed was applied automatically.");
    }
  });
}

startServer().catch((error) => {
  console.error("Unable to start FOCUS CAMERA backend.");
  console.error(error);
  process.exitCode = 1;
});
