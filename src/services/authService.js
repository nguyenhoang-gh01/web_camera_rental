const crypto = require("crypto");
const { getPool } = require("../database/connection");

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function toIsoString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toSafeUser(user) {
  if (!user) {
    return null;
  }

  const role = String(user.role || user.userRole || "customer").trim().toLowerCase() || "customer";

  return {
    id: user.id,
    fullName: user.full_name || user.fullName,
    phone: user.phone,
    email: user.email,
    role,
    isAdmin: role === "admin",
    createdAt: toIsoString(user.created_at || user.createdAt),
  };
}

async function createSession(connection, userId) {
  const session = {
    token: crypto.randomUUID(),
    userId,
  };

  await connection.query(
    "INSERT INTO auth_sessions (token, user_id) VALUES (?, ?)",
    [session.token, session.userId]
  );

  return session;
}

function validateRegisterPayload(payload) {
  if (!payload.fullName || String(payload.fullName).trim().length < 2) {
    throw new Error("Họ tên chưa hợp lệ.");
  }

  if (!payload.phone || String(payload.phone).trim().length < 8) {
    throw new Error("Số điện thoại chưa hợp lệ.");
  }

  if (!payload.email || !String(payload.email).includes("@")) {
    throw new Error("Email chưa hợp lệ.");
  }

  if (!payload.password || String(payload.password).length < 6) {
    throw new Error("Mật khẩu cần ít nhất 6 ký tự.");
  }
}

async function register(payload) {
  validateRegisterPayload(payload);

  const pool = getPool();
  const connection = await pool.getConnection();
  const email = String(payload.email).trim().toLowerCase();
  const phone = String(payload.phone).trim();
  const user = {
    id: crypto.randomUUID(),
    fullName: String(payload.fullName).trim(),
    phone,
    email,
    role: "customer",
    passwordHash: hashPassword(payload.password),
  };

  try {
    await connection.beginTransaction();

    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1",
      [user.email, user.phone]
    );

    if (existingUsers.length) {
      throw new Error("Email hoặc số điện thoại đã được sử dụng.");
    }

    await connection.query(
      `INSERT INTO users (id, full_name, phone, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.fullName, user.phone, user.email, user.passwordHash, user.role]
    );

    const session = await createSession(connection, user.id);

    await connection.commit();

    return {
      authToken: session.token,
      user: toSafeUser({
        id: user.id,
        full_name: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        created_at: new Date(),
      }),
    };
  } catch (error) {
    await connection.rollback();

    if (error && error.code === "ER_DUP_ENTRY") {
      throw new Error("Email hoặc số điện thoại đã được sử dụng.");
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function login(payload) {
  const rawIdentifier = String(payload.identifier || "").trim();
  const identifier = rawIdentifier.toLowerCase();
  const password = String(payload.password || "");

  if (!identifier || !password) {
    throw new Error("Vui lòng nhập đầy đủ thông tin đăng nhập.");
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const [users] = await connection.query(
      `SELECT id, full_name, phone, email, password_hash, role, created_at
       FROM users
       WHERE email = ? OR phone = ?
       LIMIT 1`,
      [identifier, rawIdentifier]
    );

    const user = users[0];

    if (!user || user.password_hash !== hashPassword(password)) {
      throw new Error("Sai tài khoản hoặc mật khẩu.");
    }

    const session = await createSession(connection, user.id);

    return {
      authToken: session.token,
      user: toSafeUser(user),
    };
  } finally {
    connection.release();
  }
}

async function getUserByToken(token) {
  if (!token) {
    return null;
  }

  const pool = getPool();
  const [users] = await pool.query(
    `SELECT users.id, users.full_name, users.phone, users.email, users.role, users.created_at
     FROM auth_sessions
     INNER JOIN users ON users.id = auth_sessions.user_id
     WHERE auth_sessions.token = ?
     LIMIT 1`,
    [token]
  );

  return toSafeUser(users[0]);
}

async function changePassword(userId, payload = {}) {
  const currentPassword = String(payload.currentPassword || "");
  const newPassword = String(payload.newPassword || "");
  const confirmPassword = String(payload.confirmPassword || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new Error("Vui lòng nhập đầy đủ thông tin đổi mật khẩu.");
  }

  if (newPassword.length < 6) {
    throw new Error("Mật khẩu mới cần ít nhất 6 ký tự.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Mật khẩu nhập lại chưa khớp.");
  }

  if (currentPassword === newPassword) {
    throw new Error("Mật khẩu mới cần khác mật khẩu hiện tại.");
  }

  const connection = await getPool().getConnection();

  try {
    const [users] = await connection.query(
      `SELECT id, password_hash
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    const user = users[0];

    if (!user || user.password_hash !== hashPassword(currentPassword)) {
      throw new Error("Mật khẩu hiện tại không đúng.");
    }

    await connection.query(
      `UPDATE users
       SET password_hash = ?
       WHERE id = ?`,
      [hashPassword(newPassword), userId]
    );

    return { ok: true };
  } finally {
    connection.release();
  }
}

async function logout(token) {
  if (!token) {
    return;
  }

  await getPool().query("DELETE FROM auth_sessions WHERE token = ?", [token]);
}

module.exports = {
  register,
  login,
  getUserByToken,
  changePassword,
  logout,
};
