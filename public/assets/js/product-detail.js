const productDetailPage = document.querySelector("[data-product-detail-page]");

if (productDetailPage) {
  const DEFAULT_SLUG = "thue-may-anh-sony-alpha-a7s-iii";
  const SHARED_DETAIL_PATH = "./chi-tiet-san-pham.html";
  const CATEGORY_LABELS = {
    1: "Thuê Camera (Máy ảnh)",
    6: "Thuê Phụ kiện",
  };
  const CATEGORY_FALLBACK_IMAGES = {
    1: "https://api.dathanhcamera.com/image/category/5c3cbcdd3c05d76fb8f17e41213be0fcd3193c3b268c79b2f1.jpeg",
    6: "https://api.dathanhcamera.com/image/category/534273b8dd29a62bbc85f0de4f05e2a0f7feb51b3a27ae6cf3.jpeg",
  };

  const elements = {
    title: document.querySelector("[data-detail-title]"),
    breadcrumb: document.querySelector("[data-detail-breadcrumb]"),
    category: document.querySelector("[data-detail-category]"),
    status: document.querySelector("[data-detail-status]"),
    layout: document.querySelector("[data-detail-layout]"),
    richSection: document.querySelector("[data-detail-rich-section]"),
    activeImage: document.querySelector("[data-detail-active-image]"),
    companyLogo: document.querySelector("[data-detail-company-logo]"),
    thumbnails: document.querySelector("[data-detail-thumbnails]"),
    highlights: document.querySelector("[data-detail-highlights]"),
    sessionPrice: document.querySelector("[data-detail-session-price]"),
    dayPrice: document.querySelector("[data-detail-day-price]"),
    content: document.querySelector("[data-detail-content]"),
    suggestTrack: document.querySelector("[data-suggest-track]"),
    suggestPrev: document.querySelector("[data-suggest-prev]"),
    suggestNext: document.querySelector("[data-suggest-next]"),
    modal: document.querySelector("[data-price-modal]"),
    priceTitle: document.querySelector("[data-price-title]"),
    priceTableBody: document.querySelector("[data-price-table-body]"),
    priceToggle: document.querySelector("[data-price-toggle]"),
    priceClose: document.querySelectorAll("[data-price-close]"),
    rentButton: document.querySelector("[data-add-to-cart]"),
    feedback: document.querySelector("[data-detail-feedback]"),
  };

  const numberFormatter = new Intl.NumberFormat("vi-VN");
  const state = {
    product: null,
    images: [],
    suggestions: [],
    activeIndex: 0,
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    });

  const getRequestedSlug = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("slug") || productDetailPage.dataset.slug || DEFAULT_SLUG;
  };

  const buildDetailLink = (slug) =>
    `${SHARED_DETAIL_PATH}?slug=${encodeURIComponent(slug || DEFAULT_SLUG)}`;

  const parseImages = (imageList) =>
    Array.isArray(imageList)
      ? imageList.filter(Boolean)
      : String(imageList || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

  const formatPrice = (value) => numberFormatter.format(Math.round(Number(value) || 0));

  const getSessionPrice = (product) => {
    const sessionPrice = Number(product?.sessionPrice);

    if (Number.isFinite(sessionPrice) && sessionPrice >= 0) {
      return sessionPrice;
    }

    return Math.round(((Number(product?.price) || 0) * 0.7) / 1000) * 1000;
  };

  const getCategoryLabel = (categoryId) =>
    CATEGORY_LABELS[Number(categoryId)] || "Chi tiết sản phẩm";

  const getFallbackImage = (categoryId) =>
    CATEGORY_FALLBACK_IMAGES[Number(categoryId)] ||
    "https://api.dathanhcamera.com/image/category/5c3cbcdd3c05d76fb8f17e41213be0fcd3193c3b268c79b2f1.jpeg";

  const getProductImageUrl = (imageUrl, categoryId) => imageUrl || getFallbackImage(categoryId);

  const getCompanyLogoUrl = (imageUrl) => imageUrl || "";

  const getRentalPriceRows = (product) => {
    const dayPrice = Number(product?.price) || 0;
    const sessionPrice = getSessionPrice(product);

    return [
      {
        label: "1 buổi",
        price: sessionPrice,
      },
      {
        label: "1 ngày",
        price: dayPrice,
      },
      {
        label: "2 ngày",
        price: dayPrice * 2,
      },
      {
        label: "3 ngày",
        price: dayPrice * 3,
      },
      {
        label: "6 ngày",
        price: dayPrice * 6,
      },
    ];
  };

  const setStatus = (message, error = false) => {
    elements.status.hidden = false;
    elements.status.className = error ? "detail-status detail-status-error" : "detail-status";
    elements.status.textContent = message;
    elements.layout.hidden = true;
    elements.richSection.hidden = true;
  };

  const openPriceModal = () => {
    elements.modal.hidden = false;
    document.body.classList.add("modal-open");
  };

  const closePriceModal = () => {
    elements.modal.hidden = true;
    document.body.classList.remove("modal-open");
  };

  const renderActiveImage = () => {
    const activeFile = state.images[state.activeIndex];

    elements.activeImage.src = getProductImageUrl(activeFile, state.product.categoryId);
    elements.activeImage.alt = state.product.name || "Ảnh sản phẩm";

    const thumbnailButtons = elements.thumbnails.querySelectorAll("[data-image-index]");
    thumbnailButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        Number(button.dataset.imageIndex) === Number(state.activeIndex)
      );
    });
  };

  const renderGallery = () => {
    const logoUrl = getCompanyLogoUrl(state.product.companyImageUrl);

    if (logoUrl) {
      elements.companyLogo.hidden = false;
      elements.companyLogo.src = logoUrl;
      elements.companyLogo.alt = state.product.name || "Logo hãng";
    } else {
      elements.companyLogo.hidden = true;
      elements.companyLogo.removeAttribute("src");
    }

    elements.thumbnails.innerHTML = state.images
      .map((imageName, index) => {
        const imageUrl = getProductImageUrl(imageName, state.product.categoryId);

        return `
          <button
            class="detail-thumb${index === state.activeIndex ? " is-active" : ""}"
            type="button"
            data-image-index="${index}"
          >
            <img src="${imageUrl}" alt="${escapeHtml(state.product.name)}" loading="lazy" />
          </button>
        `;
      })
      .join("");

    renderActiveImage();
  };

  const renderPriceTable = () => {
    const rows = getRentalPriceRows(state.product);

    elements.priceTitle.textContent = state.product.name || "Chi tiết giá thuê";
    elements.priceTableBody.innerHTML = rows
      .map((rule) => {
        return `
          <tr>
            <td>${escapeHtml(rule.label)}</td>
            <td>${formatPrice(rule.price)} đ</td>
          </tr>
        `;
      })
      .join("");
  };

  const renderSuggestions = () => {
    if (!state.suggestions.length) {
      elements.suggestTrack.innerHTML =
        '<p class="detail-suggest-empty">Chưa có gợi ý phù hợp.</p>';
      return;
    }

    elements.suggestTrack.innerHTML = state.suggestions
      .map((item) => {
        const imageName = parseImages(item.images)[0];
        const imageUrl = getProductImageUrl(imageName, item.categoryId);

        return `
          <a class="detail-suggest-card" href="${buildDetailLink(item.slug)}">
            <img src="${imageUrl}" alt="${escapeHtml(item.name)}" loading="lazy" />
            <h3>${escapeHtml(item.name)}</h3>
            <p>${formatPrice(getSessionPrice(item))}đ/buổi</p>
            <p>${formatPrice(item.price)}đ/ngày</p>
          </a>
        `;
      })
      .join("");
  };

  const renderDetailPage = () => {
    const categoryLabel = getCategoryLabel(state.product.categoryId);

    document.title = `${state.product.name} | ${window.SITE_CONTENT?.name || "FOCUS CAMERA"}`;
    elements.title.textContent = state.product.name || "Chi tiết sản phẩm";
    elements.breadcrumb.textContent = state.product.name || "Chi tiết sản phẩm";
    elements.category.textContent = categoryLabel;
    elements.highlights.innerHTML =
      state.product.description || "<p>Đang cập nhật thông tin nổi bật.</p>";
    elements.content.innerHTML =
      state.product.detail || "<p>Đang cập nhật thông tin chi tiết sản phẩm.</p>";
    elements.sessionPrice.textContent = formatPrice(getSessionPrice(state.product));
    elements.dayPrice.textContent = formatPrice(state.product.price);

    renderGallery();
    renderPriceTable();
    renderSuggestions();

    elements.status.hidden = true;
    elements.layout.hidden = false;
    elements.richSection.hidden = false;
  };

  const fetchProduct = async (slug) => {
    const response = await fetch(`/api/products/${encodeURIComponent(slug)}`);
    const json = await response.json();
    return json?.product || null;
  };

  const fetchSuggestions = async (slug) => {
    const response = await fetch(`/api/products/${encodeURIComponent(slug)}/suggestions`);
    const json = await response.json();
    return Array.isArray(json?.products) ? json.products.slice(0, 12) : [];
  };

  const loadProductDetail = async () => {
    setStatus("Đang tải thông tin sản phẩm...");

    try {
      const product = await fetchProduct(getRequestedSlug());

      if (!product) {
        throw new Error("Missing product data");
      }

      const suggestions = await fetchSuggestions(product.slug);

      state.product = product;
      state.images = parseImages(product.images);
      state.suggestions = suggestions;
      state.activeIndex = 0;

      if (!state.images.length) {
        state.images = [""];
      }

      renderDetailPage();
    } catch (error) {
      console.error(error);
      setStatus("Không thể tải thông tin sản phẩm lúc này.", true);
    }
  };

  elements.thumbnails?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-image-index]");

    if (!button) {
      return;
    }

    state.activeIndex = Number(button.dataset.imageIndex);
    renderActiveImage();
  });

  elements.priceToggle?.addEventListener("click", openPriceModal);
  elements.priceClose?.forEach((element) => {
    element.addEventListener("click", closePriceModal);
  });

  elements.rentButton?.addEventListener("click", async () => {
    if (!state.product || !window.focusStorefront) {
      return;
    }

    elements.rentButton.disabled = true;

    try {
      await window.focusStorefront.request("/cart/items", {
        method: "POST",
        body: {
          productSlug: state.product.slug,
          rentalDays: 1,
        },
      });

      if (elements.feedback) {
        elements.feedback.hidden = false;
        elements.feedback.className = "detail-action-feedback is-success";
        elements.feedback.textContent = "Đã thêm sản phẩm vào giỏ hàng. Đang chuyển trang...";
      }

      window.setTimeout(() => {
        window.location.href = "./gio-hang.html";
      }, 700);
    } catch (error) {
      if (elements.feedback) {
        elements.feedback.hidden = false;
        elements.feedback.className = "detail-action-feedback is-error";
        elements.feedback.textContent = error.message;
      }
    } finally {
      elements.rentButton.disabled = false;
    }
  });

  elements.suggestPrev?.addEventListener("click", () => {
    elements.suggestTrack.scrollBy({ left: -260, behavior: "smooth" });
  });

  elements.suggestNext?.addEventListener("click", () => {
    elements.suggestTrack.scrollBy({ left: 260, behavior: "smooth" });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.hidden) {
      closePriceModal();
    }
  });

  loadProductDetail();
}
