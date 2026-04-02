import { elements, state } from "./state.js";
import { escapeHtml, setStatus } from "./utils.js";
import { renderSummary } from "./orders.js";

function getStarMarkup(rating) {
  return Array.from({ length: 5 }, (_, index) => {
    const isFilled = index < Number(rating || 0);
    return `<span class="admin-review-star${isFilled ? " is-filled" : ""}">★</span>`;
  }).join("");
}

function getFilteredReviews() {
  const keyword = String(elements.reviewSearch?.value || "").trim().toLowerCase();
  const rating = String(elements.reviewRatingFilter?.value || "");

  return state.reviews.filter((review) => {
    const matchesRating = !rating || String(review.rating) === rating;
    const searchable = [review.fullName, review.email, review.comment].join(" ").toLowerCase();
    return matchesRating && (!keyword || searchable.includes(keyword));
  });
}

function updateReviewSummaryState() {
  state.summary = {
    ...(state.summary || {}),
    featuredReviews: state.reviews.filter((review) => review.showOnHome && !review.isHidden).length,
  };
}

export function renderReviews() {
  if (!elements.reviewList) {
    return;
  }

  const reviews = getFilteredReviews();

  if (!reviews.length) {
    elements.reviewList.innerHTML =
      '<div class="admin-empty">Chưa có bình luận phù hợp với bộ lọc hiện tại.</div>';
    return;
  }

  elements.reviewList.innerHTML = reviews
    .map(
      (review) => `
        <article class="admin-review-card">
          <div class="admin-review-card__head">
            <div>
              <h3>${escapeHtml(review.fullName || "Khách hàng")}</h3>
              <p>${escapeHtml(review.email || "")}</p>
            </div>
            <div class="admin-review-rating" aria-label="${Number(review.rating)} sao">
              ${getStarMarkup(review.rating)}
            </div>
          </div>

          <p class="admin-review-card__content">${escapeHtml(review.comment || "")}</p>

          <div class="admin-review-card__meta">
            <span>${new Date(review.createdAt).toLocaleString("vi-VN")}</span>
            <span class="admin-review-badge${review.isHidden ? " is-muted" : ""}">
              ${review.isHidden ? "Đang ẩn" : "Công khai"}
            </span>
          </div>

          <div class="admin-review-controls">
            <label class="admin-review-toggle">
              <input type="checkbox" data-review-home="${review.id}" ${review.showOnHome ? "checked" : ""} />
              <span>Hiển thị trên trang chủ</span>
            </label>
            <label class="admin-review-toggle">
              <input type="checkbox" data-review-hidden="${review.id}" ${review.isHidden ? "checked" : ""} />
              <span>Ẩn khỏi giao diện</span>
            </label>
          </div>

          <div class="admin-review-actions">
            <button type="button" data-save-review="${review.id}">Lưu thay đổi</button>
            <button type="button" class="admin-review-delete" data-delete-review="${review.id}">Xóa bình luận</button>
          </div>
        </article>
      `
    )
    .join("");
}

async function saveReview(reviewId) {
  const showOnHome = document.querySelector(`[data-review-home="${reviewId}"]`)?.checked || false;
  const isHidden = document.querySelector(`[data-review-hidden="${reviewId}"]`)?.checked || false;

  setStatus("Đang cập nhật bình luận...", "info");

  try {
    const json = await window.focusStorefront.request(`/admin/reviews/${reviewId}`, {
      method: "PATCH",
      body: { showOnHome, isHidden },
      withCart: false,
    });
    state.reviews = state.reviews.map((review) =>
      String(review.id) === String(reviewId) ? json.review || review : review
    );
    updateReviewSummaryState();
    renderSummary();
    renderReviews();
    setStatus("Đã cập nhật bình luận.", "success");
  } catch (error) {
    setStatus(error.message || "Không thể cập nhật bình luận.", "error");
  }
}

async function deleteReview(reviewId) {
  if (!window.confirm("Bạn có chắc muốn xóa bình luận này không?")) {
    return;
  }

  setStatus("Đang xóa bình luận...", "info");

  try {
    await window.focusStorefront.request(`/admin/reviews/${reviewId}`, {
      method: "DELETE",
      withCart: false,
    });
    state.reviews = state.reviews.filter((review) => String(review.id) !== String(reviewId));
    updateReviewSummaryState();
    renderSummary();
    renderReviews();
    setStatus("Đã xóa bình luận.", "success");
  } catch (error) {
    setStatus(error.message || "Không thể xóa bình luận.", "error");
  }
}

export function bindReviewEvents() {
  elements.reviewSearch?.addEventListener("input", renderReviews);
  elements.reviewRatingFilter?.addEventListener("change", renderReviews);
  elements.reviewList?.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save-review]");
    if (saveButton) {
      saveReview(saveButton.dataset.saveReview);
      return;
    }

    const deleteButton = event.target.closest("[data-delete-review]");
    if (deleteButton) {
      deleteReview(deleteButton.dataset.deleteReview);
    }
  });
}
