const crypto = require("crypto");
const { getPool } = require("../database/connection");

const HOME_REVIEW_LIMIT = 15;

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

function mapReviewRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name || "Khach hang",
    rating: Number(row.rating) || 0,
    comment: row.comment || "",
    showOnHome: Boolean(row.show_on_home),
    isHidden: Boolean(row.is_hidden),
    createdAt: toIsoString(row.created_at),
  };
}

function validateReviewPayload(payload = {}) {
  const rating = Number(payload.rating);
  const comment = String(payload.comment || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Số sao đánh giá phải nằm trong khoảng từ 1 đến 5.");
  }

  if (comment.length < 8) {
    throw new Error("Nội dung bình luận cần ít nhất 8 ký tự.");
  }

  if (comment.length > 1000) {
    throw new Error("Nội dung bình luận tối đa 1000 ký tự.");
  }

  return {
    rating,
    comment,
  };
}

async function getReviewSummary() {
  const [[row]] = await getPool().query(
    `SELECT
        COUNT(*) AS total_reviews,
        SUM(CASE WHEN is_hidden = 0 THEN 1 ELSE 0 END) AS public_reviews,
        SUM(CASE WHEN show_on_home = 1 AND is_hidden = 0 THEN 1 ELSE 0 END) AS featured_reviews,
        COALESCE(AVG(CASE WHEN is_hidden = 0 THEN rating END), 0) AS average_rating
     FROM customer_reviews`
  );

  return {
    totalReviews: Number(row.total_reviews) || 0,
    publicReviews: Number(row.public_reviews) || 0,
    featuredReviews: Number(row.featured_reviews) || 0,
    averageRating: Number(row.average_rating) || 0,
  };
}

async function listHomeReviews(limit = HOME_REVIEW_LIMIT) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || HOME_REVIEW_LIMIT, HOME_REVIEW_LIMIT));
  const [rows] = await getPool().query(
    `SELECT reviews.id, reviews.user_id, reviews.rating, reviews.comment, reviews.show_on_home,
            reviews.is_hidden, reviews.created_at, users.full_name
     FROM customer_reviews AS reviews
     INNER JOIN users ON users.id = reviews.user_id
     WHERE reviews.is_hidden = 0
     ORDER BY reviews.show_on_home DESC, reviews.rating DESC, reviews.created_at DESC
     LIMIT ?`,
    [safeLimit]
  );

  return rows.map(mapReviewRow);
}

async function createReview(userId, payload = {}) {
  const data = validateReviewPayload(payload);
  const reviewId = crypto.randomUUID();

  await getPool().query(
    `INSERT INTO customer_reviews (
      id,
      user_id,
      rating,
      comment,
      show_on_home,
      is_hidden
    ) VALUES (?, ?, ?, ?, 0, 0)`,
    [reviewId, userId, data.rating, data.comment]
  );

  const [[row]] = await getPool().query(
    `SELECT reviews.id, reviews.user_id, reviews.rating, reviews.comment, reviews.show_on_home,
            reviews.is_hidden, reviews.created_at, users.full_name
     FROM customer_reviews AS reviews
     INNER JOIN users ON users.id = reviews.user_id
     WHERE reviews.id = ?
     LIMIT 1`,
    [reviewId]
  );

  return mapReviewRow(row);
}

async function listAdminReviews(filters = {}) {
  const params = [];
  const where = [];

  if (filters.search) {
    const keyword = `%${escapeLike(filters.search)}%`;
    where.push("(users.full_name LIKE ? ESCAPE '\\' OR users.email LIKE ? ESCAPE '\\' OR reviews.comment LIKE ? ESCAPE '\\')");
    params.push(keyword, keyword, keyword);
  }

  if (filters.rating) {
    where.push("reviews.rating = ?");
    params.push(Number(filters.rating));
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await getPool().query(
    `SELECT reviews.id, reviews.user_id, reviews.rating, reviews.comment, reviews.show_on_home,
            reviews.is_hidden, reviews.created_at, users.full_name, users.email
     FROM customer_reviews AS reviews
     INNER JOIN users ON users.id = reviews.user_id
     ${whereSql}
     ORDER BY reviews.show_on_home DESC, reviews.rating DESC, reviews.created_at DESC`,
    params
  );

  return rows.map((row) => ({
    ...mapReviewRow(row),
    email: row.email || "",
  }));
}

async function updateAdminReview(reviewId, payload = {}) {
  const showOnHome = payload.showOnHome ? 1 : 0;
  const isHidden = payload.isHidden ? 1 : 0;

  await getPool().query(
    `UPDATE customer_reviews
     SET show_on_home = ?, is_hidden = ?
     WHERE id = ?`,
    [showOnHome, isHidden, reviewId]
  );

  const [[row]] = await getPool().query(
    `SELECT reviews.id, reviews.user_id, reviews.rating, reviews.comment, reviews.show_on_home,
            reviews.is_hidden, reviews.created_at, users.full_name, users.email
     FROM customer_reviews AS reviews
     INNER JOIN users ON users.id = reviews.user_id
     WHERE reviews.id = ?
     LIMIT 1`,
    [reviewId]
  );

  return row
    ? {
        ...mapReviewRow(row),
        email: row.email || "",
      }
    : null;
}

async function deleteAdminReview(reviewId) {
  await getPool().query("DELETE FROM customer_reviews WHERE id = ?", [reviewId]);
  return { id: reviewId };
}

module.exports = {
  HOME_REVIEW_LIMIT,
  getReviewSummary,
  listHomeReviews,
  createReview,
  listAdminReviews,
  updateAdminReview,
  deleteAdminReview,
};
