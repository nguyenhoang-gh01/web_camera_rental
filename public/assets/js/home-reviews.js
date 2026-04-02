const reviewSection = document.querySelector("[data-home-review-section]");

if (reviewSection) {
  const elements = {
    carousel: document.querySelector("[data-review-carousel]"),
    viewport: document.querySelector("[data-review-viewport]"),
    list: document.querySelector("[data-review-list]"),
    average: document.querySelector("[data-review-average]"),
    total: document.querySelector("[data-review-total]"),
    max: document.querySelector("[data-review-max]"),
    current: document.querySelector("[data-review-current]"),
    count: document.querySelector("[data-review-count]"),
    counter: document.querySelector("[data-review-counter]"),
    controls: document.querySelector("[data-review-controls]"),
    prev: document.querySelector("[data-review-prev]"),
    next: document.querySelector("[data-review-next]"),
    loginHint: document.querySelector("[data-review-login-hint]"),
    form: document.querySelector("[data-review-form]"),
    formStatus: document.querySelector("[data-review-form-status]"),
    starButtons: document.querySelectorAll("[data-review-star]"),
    starCaption: document.querySelector("[data-review-star-caption]"),
    comment: document.querySelector('[data-review-form] textarea[name="comment"]'),
  };

  const state = {
    autoplayDelay: 4200,
    autoplayTimer: null,
    currentIndex: 0,
    isStatic: false,
    resizeTimer: null,
    reviews: [],
    selectedRating: 0,
    summary: null,
    visibleCount: 3,
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return entities[character] || character;
    });
  }

  function setFormStatus(message, type = "info") {
    if (!elements.formStatus) return;

    if (!message) {
      elements.formStatus.hidden = true;
      elements.formStatus.className = "review-form-status";
      elements.formStatus.textContent = "";
      return;
    }

    elements.formStatus.hidden = false;
    elements.formStatus.className = `review-form-status is-${type}`;
    elements.formStatus.textContent = message;
  }

  function renderStarButtons() {
    elements.starButtons.forEach((button) => {
      const starValue = Number(button.dataset.reviewStar || 0);
      button.classList.toggle("is-active", starValue <= state.selectedRating);
    });

    if (elements.starCaption) {
      elements.starCaption.textContent = state.selectedRating
        ? `${state.selectedRating} / 5 sao`
        : "Chọn số sao bạn muốn đánh giá";
    }
  }

  function getStarMarkup(rating) {
    return Array.from({ length: 5 }, (_, index) => {
      const isFilled = index < Number(rating || 0);
      return `<span class="review-card__star${isFilled ? " is-filled" : ""}">★</span>`;
    }).join("");
  }

  function getVisibleCount() {
    if (window.innerWidth <= 640) return 1;
    if (window.innerWidth <= 991) return 2;
    return 3;
  }

  function formatCounterNumber(value) {
    return String(value).padStart(2, "0");
  }

  function getLogicalIndex() {
    if (!state.reviews.length) return 0;
    const baseIndex = state.currentIndex - state.visibleCount;
    return ((baseIndex % state.reviews.length) + state.reviews.length) % state.reviews.length;
  }

  function updateCounter() {
    if (!elements.current || !elements.count || !elements.counter) return;

    const totalReviews = state.reviews.length;
    elements.count.textContent = formatCounterNumber(totalReviews);

    if (!totalReviews || state.isStatic) {
      elements.counter.hidden = true;
      elements.current.textContent = formatCounterNumber(totalReviews ? 1 : 0);
      return;
    }

    elements.counter.hidden = false;
    elements.current.textContent = formatCounterNumber(getLogicalIndex() + 1);
  }

  function buildReviewCard(review) {
    const fullName = String(review.fullName || "Khách hàng").trim() || "Khách hàng";
    const comment = String(review.comment || "").trim();
    const formattedDate = review.createdAt
      ? new Date(review.createdAt).toLocaleDateString("vi-VN")
      : "Mới đánh giá";

    return `
      <article class="review-card" title="${escapeHtml(comment)}">
        <span class="review-card__quote" aria-hidden="true">“</span>
        <div class="review-card__avatar" aria-hidden="true">${escapeHtml(fullName.charAt(0).toUpperCase() || "?")}</div>
        <div class="review-card__rating" aria-label="${Number(review.rating || 0)} trên 5 sao">
          ${getStarMarkup(review.rating)}
        </div>
        <p class="review-card__content">${escapeHtml(comment)}</p>
        <div class="review-card__meta">
          <h3 title="${escapeHtml(fullName)}">${escapeHtml(fullName)}</h3>
          <p>Khách hàng đã thuê thiết bị tại Focus Camera</p>
          <span class="review-card__date">${escapeHtml(formattedDate)}</span>
        </div>
      </article>
    `;
  }

  function stopAutoplay() {
    if (!state.autoplayTimer) return;
    window.clearInterval(state.autoplayTimer);
    state.autoplayTimer = null;
  }

  function updateTrackPosition(animate = true) {
    if (!elements.list || state.isStatic) return;

    const firstCard = elements.list.querySelector(".review-card");
    if (!firstCard) return;

    const trackStyle = window.getComputedStyle(elements.list);
    const gap = Number.parseFloat(trackStyle.gap || trackStyle.columnGap || "0") || 0;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const offset = state.currentIndex * (cardWidth + gap);

    elements.list.classList.toggle("is-animated", animate);
    elements.list.style.transform = `translate3d(-${offset}px, 0, 0)`;
    updateCounter();
  }

  function startAutoplay() {
    stopAutoplay();

    if (state.isStatic || state.reviews.length <= state.visibleCount) return;

    state.autoplayTimer = window.setInterval(() => {
      moveToNext();
    }, state.autoplayDelay);
  }

  function renderSummary() {
    if (!state.summary) return;

    if (elements.average) {
      elements.average.textContent = Number(state.summary.averageRating || 0).toFixed(1);
    }

    if (elements.total) {
      elements.total.textContent = String(state.summary.publicReviews || 0);
    }
  }

  function renderReviews() {
    if (!elements.list || !elements.carousel) return;

    stopAutoplay();
    state.visibleCount = getVisibleCount();
    elements.carousel.style.setProperty("--review-visible", String(state.visibleCount));

    if (!state.reviews.length) {
      state.isStatic = true;
      elements.list.className = "review-carousel__track is-static";
      elements.list.innerHTML =
        '<div class="review-empty">Chưa có đánh giá nào được hiển thị. Hãy là người đầu tiên chia sẻ trải nghiệm thuê của bạn.</div>';

      if (elements.controls) {
        elements.controls.hidden = true;
      }
      if (elements.counter) {
        elements.counter.hidden = true;
      }
      return;
    }

    state.isStatic = state.reviews.length <= state.visibleCount;
    elements.carousel.style.setProperty(
      "--review-static-columns",
      String(Math.min(state.reviews.length, state.visibleCount))
    );

    if (state.isStatic) {
      state.currentIndex = 0;
      elements.list.className = "review-carousel__track is-static";
      elements.list.style.transform = "none";
      elements.list.innerHTML = state.reviews.map(buildReviewCard).join("");

      if (elements.controls) {
        elements.controls.hidden = true;
      }
      updateCounter();
      return;
    }

    const headClones = state.reviews.slice(-state.visibleCount);
    const tailClones = state.reviews.slice(0, state.visibleCount);
    const renderableReviews = [...headClones, ...state.reviews, ...tailClones];

    state.currentIndex = state.visibleCount;
    elements.list.className = "review-carousel__track";
    elements.list.innerHTML = renderableReviews.map(buildReviewCard).join("");

    if (elements.controls) {
      elements.controls.hidden = state.reviews.length <= 1;
    }

    updateTrackPosition(false);
    requestAnimationFrame(() => {
      updateTrackPosition(false);
    });
    startAutoplay();
  }

  function syncInfinitePosition() {
    if (!elements.list || state.isStatic) return;

    const minIndex = state.visibleCount;
    const maxIndex = state.reviews.length + state.visibleCount;
    let shouldReset = false;

    if (state.currentIndex >= maxIndex) {
      state.currentIndex = minIndex;
      shouldReset = true;
    } else if (state.currentIndex < minIndex) {
      state.currentIndex = state.reviews.length + state.visibleCount - 1;
      shouldReset = true;
    }

    if (!shouldReset) return;

    elements.list.classList.remove("is-animated");
    updateTrackPosition(false);
  }

  function moveToNext() {
    if (state.isStatic) return;
    state.currentIndex += 1;
    updateTrackPosition(true);
  }

  function moveToPrevious() {
    if (state.isStatic) return;
    state.currentIndex -= 1;
    updateTrackPosition(true);
  }

  function bindAutoplayPause(target) {
    if (!target) return;

    target.addEventListener("mouseenter", stopAutoplay);
    target.addEventListener("mouseleave", startAutoplay);
    target.addEventListener("focusin", stopAutoplay);
    target.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!target.contains(document.activeElement)) {
          startAutoplay();
        }
      }, 0);
    });
  }

  function renderAuthState() {
    const authUser = window.focusStorefront?.getAuthUser?.() || null;

    if (!authUser) {
      elements.loginHint.hidden = false;
      elements.form.hidden = true;
      return;
    }

    elements.loginHint.hidden = true;
    elements.form.hidden = false;
  }

  async function loadReviews() {
    try {
      const json = await window.focusStorefront.request("/reviews", {
        withAuth: false,
        withCart: false,
      });

      state.reviews = Array.isArray(json.reviews) ? json.reviews : [];
      state.summary = json.summary || null;

      if (elements.max) {
        elements.max.textContent = String(json.maxDisplay || 15);
      }

      renderSummary();
      renderReviews();
    } catch (error) {
      state.isStatic = true;
      if (elements.list) {
        elements.list.className = "review-carousel__track is-static";
        elements.list.innerHTML =
          '<div class="review-empty">Không thể tải đánh giá khách hàng lúc này. Vui lòng thử lại sau.</div>';
      }
      if (elements.controls) {
        elements.controls.hidden = true;
      }
      if (elements.counter) {
        elements.counter.hidden = true;
      }
    }
  }

  async function submitReview(event) {
    event.preventDefault();

    if (!state.selectedRating) {
      setFormStatus("Vui lòng chọn số sao đánh giá.", "error");
      return;
    }

    const comment = String(elements.comment?.value || "").trim();
    if (comment.length < 8) {
      setFormStatus("Nội dung bình luận cần ít nhất 8 ký tự.", "error");
      return;
    }

    setFormStatus("Đang gửi đánh giá...", "info");

    try {
      await window.focusStorefront.request("/reviews", {
        method: "POST",
        body: {
          rating: state.selectedRating,
          comment,
        },
        withCart: false,
      });

      state.selectedRating = 0;
      if (elements.comment) {
        elements.comment.value = "";
      }

      renderStarButtons();
      setFormStatus(
        "Cảm ơn bạn đã chia sẻ trải nghiệm. Đánh giá của bạn sẽ giúp những khách hàng khác dễ chọn thiết bị phù hợp hơn.",
        "success"
      );
      await loadReviews();
    } catch (error) {
      setFormStatus(error.message || "Không thể gửi đánh giá.", "error");
    }
  }

  elements.starButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRating = Number(button.dataset.reviewStar || 0);
      renderStarButtons();
    });
  });

  elements.prev?.addEventListener("click", () => {
    stopAutoplay();
    moveToPrevious();
    startAutoplay();
  });

  elements.next?.addEventListener("click", () => {
    stopAutoplay();
    moveToNext();
    startAutoplay();
  });

  elements.list?.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "transform") return;
    syncInfinitePosition();
  });

  [elements.viewport, elements.form].forEach(bindAutoplayPause);

  window.addEventListener("resize", () => {
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(() => {
      renderReviews();
    }, 120);
  });

  elements.form?.addEventListener("submit", submitReview);

  renderStarButtons();
  renderAuthState();
  loadReviews();
}
