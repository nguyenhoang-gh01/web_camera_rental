const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { getPool } = require("../database/connection");
const { getConfig } = require("../config/env");

const DOCUMENT_TYPES = Object.freeze({
  cccdFront: "cccd_front",
  cccdBack: "cccd_back",
  personalOther: "personal_other",
});

const MIME_EXTENSION_MAP = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
});

function toIsoString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateValue(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function toSafeUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    phone: user.phone,
    email: user.email,
    createdAt: toIsoString(user.created_at),
  };
}

function normalizeDocument(document) {
  return {
    id: document.id,
    type: document.document_type,
    label: document.document_label,
    originalName: document.original_name,
    mimeType: document.mime_type,
    filePath: document.file_path,
    createdAt: toIsoString(document.created_at),
  };
}

function groupDocuments(documents) {
  const grouped = {
    cccdFront: null,
    cccdBack: null,
    personalOther: [],
  };

  documents.forEach((document) => {
    const normalized = normalizeDocument(document);

    if (document.document_type === DOCUMENT_TYPES.cccdFront) {
      grouped.cccdFront = normalized;
      return;
    }

    if (document.document_type === DOCUMENT_TYPES.cccdBack) {
      grouped.cccdBack = normalized;
      return;
    }

    grouped.personalOther.push(normalized);
  });

  return grouped;
}

function buildRequirements(documents) {
  const missingDocuments = [];

  if (!documents.cccdFront) {
    missingDocuments.push("cccd_front");
  }

  if (!documents.cccdBack) {
    missingDocuments.push("cccd_back");
  }

  return {
    canRent: missingDocuments.length === 0,
    missingDocuments,
  };
}

function sanitizeFileName(fileName) {
  return String(fileName || "document")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function getExtension(file) {
  const mimeExtension = MIME_EXTENSION_MAP[file.contentType];

  if (mimeExtension) {
    return mimeExtension;
  }

  const originalName = String(file.fileName || "");
  const parsed = path.extname(originalName);
  return parsed || ".bin";
}

async function deletePhysicalFile(filePath) {
  if (!filePath) {
    return;
  }

  const absolutePath = path.join(getConfig().publicDir, filePath.replace(/^\//, ""));

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

async function readDocuments(connection, userId) {
  const [rows] = await connection.query(
    `SELECT id, document_type, document_label, original_name, mime_type, file_path, created_at
     FROM user_documents
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows;
}

async function readProfile(connection, userId) {
  const [users] = await connection.query(
    `SELECT users.id, users.full_name, users.phone, users.email, users.created_at,
            profiles.birthday, profiles.address, profiles.identity_number, profiles.facebook_url
     FROM users
     LEFT JOIN user_profiles AS profiles ON profiles.user_id = users.id
     WHERE users.id = ?
     LIMIT 1`,
    [userId]
  );

  const user = users[0];

  if (!user) {
    throw new Error("Không tìm thấy tài khoản.");
  }

  const documents = groupDocuments(await readDocuments(connection, userId));

  return {
    user: toSafeUser(user),
    profile: {
      birthday: toDateValue(user.birthday),
      address: user.address || "",
      identityNumber: user.identity_number || "",
      facebookUrl: user.facebook_url || "",
      documents,
      requirements: buildRequirements(documents),
    },
  };
}

function validateProfilePayload(payload) {
  if (!payload.fullName || String(payload.fullName).trim().length < 2) {
    throw new Error("Họ tên chưa hợp lệ.");
  }

  if (!payload.phone || String(payload.phone).trim().length < 8) {
    throw new Error("Số điện thoại chưa hợp lệ.");
  }

  if (!payload.email || !String(payload.email).includes("@")) {
    throw new Error("Email chưa hợp lệ.");
  }
}

async function saveDocumentFile(userId, file, typeKey) {
  if (!file?.data || !file?.contentType) {
    return null;
  }

  const extension = getExtension(file);
  const baseName = sanitizeFileName(file.fileName || typeKey);
  const fileName = `${Date.now()}-${crypto.randomUUID()}-${baseName}${extension}`;
  const relativeDir = path.join("uploads", "account-documents", userId);
  const absoluteDir = path.join(getConfig().publicDir, relativeDir);
  const absolutePath = path.join(absoluteDir, fileName);
  const relativePath = `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
  const buffer = Buffer.from(String(file.data), "base64");

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return {
    originalName: file.fileName || fileName,
    mimeType: file.contentType,
    filePath: relativePath,
  };
}

async function replaceSingleDocument(connection, userId, documentType, documentLabel, file) {
  if (!file?.data) {
    return;
  }

  const [existingDocuments] = await connection.query(
    `SELECT id, file_path
     FROM user_documents
     WHERE user_id = ? AND document_type = ?`,
    [userId, documentType]
  );

  existingDocuments.forEach(async (document) => {
    await deletePhysicalFile(document.file_path);
  });

  await connection.query(
    "DELETE FROM user_documents WHERE user_id = ? AND document_type = ?",
    [userId, documentType]
  );

  const storedFile = await saveDocumentFile(userId, file, documentType);

  if (!storedFile) {
    return;
  }

  await connection.query(
    `INSERT INTO user_documents (
      id,
      user_id,
      document_type,
      document_label,
      original_name,
      mime_type,
      file_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      userId,
      documentType,
      documentLabel,
      storedFile.originalName,
      storedFile.mimeType,
      storedFile.filePath,
    ]
  );
}

async function addOtherDocuments(connection, userId, files = []) {
  for (const file of files) {
    const storedFile = await saveDocumentFile(userId, file, DOCUMENT_TYPES.personalOther);

    if (!storedFile) {
      continue;
    }

    await connection.query(
      `INSERT INTO user_documents (
        id,
        user_id,
        document_type,
        document_label,
        original_name,
        mime_type,
        file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        userId,
        DOCUMENT_TYPES.personalOther,
        file.label || "Giấy tờ cá nhân khác",
        storedFile.originalName,
        storedFile.mimeType,
        storedFile.filePath,
      ]
    );
  }
}

async function removeDocuments(connection, userId, documentIds = []) {
  if (!Array.isArray(documentIds) || !documentIds.length) {
    return;
  }

  const [documents] = await connection.query(
    `SELECT id, file_path
     FROM user_documents
     WHERE user_id = ? AND id IN (?)`,
    [userId, documentIds]
  );

  await connection.query(
    "DELETE FROM user_documents WHERE user_id = ? AND id IN (?)",
    [userId, documentIds]
  );

  for (const document of documents) {
    await deletePhysicalFile(document.file_path);
  }
}

async function getProfile(userId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    return await readProfile(connection, userId);
  } finally {
    connection.release();
  }
}

async function updateProfile(userId, payload = {}) {
  validateProfilePayload(payload);

  const connection = await getPool().getConnection();
  const email = String(payload.email).trim().toLowerCase();
  const phone = String(payload.phone).trim();
  const fullName = String(payload.fullName).trim();
  const birthday = payload.birthday ? String(payload.birthday).trim() : null;
  const address = String(payload.address || "").trim();
  const identityNumber = String(payload.identityNumber || "").trim();
  const facebookUrl = String(payload.facebookUrl || "").trim();

  try {
    await connection.beginTransaction();

    const [duplicates] = await connection.query(
      `SELECT id
       FROM users
       WHERE (email = ? OR phone = ?) AND id <> ?
       LIMIT 1`,
      [email, phone, userId]
    );

    if (duplicates.length) {
      throw new Error("Email hoặc số điện thoại đã được sử dụng.");
    }

    await connection.query(
      `UPDATE users
       SET full_name = ?, phone = ?, email = ?
       WHERE id = ?`,
      [fullName, phone, email, userId]
    );

    await connection.query(
      `INSERT INTO user_profiles (user_id, birthday, address, identity_number, facebook_url)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         birthday = VALUES(birthday),
         address = VALUES(address),
         identity_number = VALUES(identity_number),
         facebook_url = VALUES(facebook_url)`,
      [userId, birthday || null, address || null, identityNumber || null, facebookUrl || null]
    );

    await removeDocuments(connection, userId, payload.removeDocumentIds || []);
    await replaceSingleDocument(
      connection,
      userId,
      DOCUMENT_TYPES.cccdFront,
      "CCCD mặt trước",
      payload.documents?.cccdFront
    );
    await replaceSingleDocument(
      connection,
      userId,
      DOCUMENT_TYPES.cccdBack,
      "CCCD mặt sau",
      payload.documents?.cccdBack
    );
    await addOtherDocuments(connection, userId, payload.documents?.personalOther || []);

    await connection.commit();
    return await readProfile(connection, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
