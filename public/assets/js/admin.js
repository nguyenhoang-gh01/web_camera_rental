const adminPage = document.querySelector("[data-admin-page]");

if (adminPage) {
  const elements = {
    status: document.querySelector("[data-admin-status]"),
    summaryOrders: document.querySelector("[data-summary-orders]"),
    summaryPending: document.querySelector("[data-summary-pending]"),
    summaryRenters: document.querySelector("[data-summary-renters]"),
    summaryProducts: document.querySelector("[data-summary-products]"),
    summaryRevenue: document.querySelector("[data-summary-revenue]"),
    tabButtons: document.querySelectorAll("[data-admin-tab]"),
    panels: document.querySelectorAll("[data-admin-panel]"),
    refreshButton: document.querySelector("[data-admin-refresh]"),
    orderSearch: document.querySelector("[data-order-search]"),
    orderStatusFilter: document.querySelector("[data-order-status-filter]"),
    ordersList: document.querySelector("[data-admin-orders-list]"),
    productSearch: document.querySelector("[data-product-search]"),
    productCategoryFilter: document.querySelector("[data-product-category-filter]"),
    productsBody: document.querySelector("[data-admin-products-body]"),
    renterSearch: document.querySelector("[data-renter-search]"),
    rentersGrid: document.querySelector("[data-admin-renters-grid]"),
    productModal: document.querySelector("[data-product-modal]"),
    productModalStatus: document.querySelector("[data-product-detail-status]"),
    productModalBody: document.querySelector("[data-product-detail-body]"),
    productModalCloseButtons: document.querySelectorAll("[data-close-product-modal]"),
    renterModal: document.querySelector("[data-renter-modal]"),
    renterDetailBody: document.querySelector("[data-renter-detail-body]"),
    renterModalCloseButtons: document.querySelectorAll("[data-close-renter-modal]"),
  };

  const numberFormatter = new Intl.NumberFormat("vi-VN");
  const statusLabels = {
    pending: "Chờ xử lý",
    confirmed: "Đã xác nhận",
    renting: "Đang cho thuê",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  };

  const state = {
    statusOptions: [],
    summary: null,
    orders: [],
    products: [],
    renters: [],
    activeTab: "orders",
    productDetail: null,
    activeProductId: "",
    activeRenter: null,
  };

  function formatPrice(value) {
    return `${numberFormatter.format(Math.round(Number(value) || 0))} đ`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character] || character;
    });
  }

  function setStatus(message, type = "info") {
    if (!elements.status) {
      return;
    }

    elements.status.className = `admin-status is-${type}`;
    elements.status.textContent = message;
  }

  function setProductModalStatus(message, type = "info") {
    if (!elements.productModalStatus) {
      return;
    }

    if (!message) {
      elements.productModalStatus.hidden = true;
      elements.productModalStatus.className = "admin-product-modal__status";
      elements.productModalStatus.textContent = "";
      return;
    }

    elements.productModalStatus.hidden = false;
    elements.productModalStatus.className = `admin-product-modal__status is-${type}`;
    elements.productModalStatus.textContent = message;
  }

  function activateTab(tabName) {
    state.activeTab = tabName;
    elements.tabButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.adminTab === tabName);
    });
    elements.panels.forEach((panel) => {
      panel.hidden = panel.dataset.adminPanel !== tabName;
    });
  }

  function openProductModal() {
    if (!elements.productModal) {
      return;
    }

    elements.productModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeProductModal() {
    if (!elements.productModal) {
      return;
    }

    elements.productModal.hidden = true;
    document.body.style.overflow = "";
    setProductModalStatus("");
  }

  function openRenterModal() {
    if (!elements.renterModal) {
      return;
    }

    elements.renterModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeRenterModal() {
    if (!elements.renterModal) {
      return;
    }

    elements.renterModal.hidden = true;
    document.body.style.overflow = "";
  }

  function getDocumentPreviewMarkup(document) {
    if (!document?.href) {
      return '<div class="admin-empty">Chưa có file tải lên.</div>';
    }

    const href = String(document.href || "");
    const lowerHref = href.toLowerCase();
    const isPdf = lowerHref.endsWith(".pdf");
    const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerHref);

    if (isImage) {
      return `
        <div class="admin-renter-preview-card">
          <div class="admin-renter-preview-card__head">
            <strong>${escapeHtml(document.label)}</strong>
            <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Mở file gốc</a>
          </div>
          <div class="admin-renter-preview-card__body">
            <img src="${escapeHtml(href)}" alt="${escapeHtml(document.label)}" loading="lazy" />
          </div>
        </div>
      `;
    }

    if (isPdf) {
      return `
        <div class="admin-renter-preview-card">
          <div class="admin-renter-preview-card__head">
            <strong>${escapeHtml(document.label)}</strong>
            <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Mở file gốc</a>
          </div>
          <div class="admin-renter-preview-card__body admin-renter-preview-card__body--pdf">
            <iframe src="${escapeHtml(href)}" title="${escapeHtml(document.label)}"></iframe>
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-renter-preview-card">
        <div class="admin-renter-preview-card__head">
          <strong>${escapeHtml(document.label)}</strong>
          <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Mở file gốc</a>
        </div>
        <div class="admin-renter-preview-card__body admin-renter-preview-card__body--file">
          <p>Không thể preview trực tiếp định dạng này trong trình duyệt.</p>
        </div>
      </div>
    `;
  }

  function renderRenterDetail() {
    const renter = state.activeRenter;

    if (!renter || !elements.renterDetailBody) {
      return;
    }

    const documents = [
      renter.documents.cccdFront
        ? { label: "CCCD mặt trước", href: renter.documents.cccdFront }
        : null,
      renter.documents.cccdBack
        ? { label: "CCCD mặt sau", href: renter.documents.cccdBack }
        : null,
      renter.documents.personalOther
        ? { label: "Giấy tờ khác", href: renter.documents.personalOther }
        : null,
    ].filter(Boolean);

    const infoRows = [
      { label: "Họ tên", value: renter.fullName || "Chưa cập nhật" },
      { label: "Email", value: renter.email || "Chưa cập nhật" },
      { label: "Số điện thoại", value: renter.phone || "Chưa cập nhật" },
      { label: "Ngày sinh", value: renter.birthday || "Chưa cập nhật" },
      { label: "CCCD", value: renter.identityNumber || "Chưa cập nhật" },
      { label: "Địa chỉ", value: renter.address || "Chưa cập nhật địa chỉ" },
      { label: "Facebook/Zalo", value: renter.facebookUrl || "Chưa có link liên hệ" },
      { label: "Ngày tạo tài khoản", value: renter.createdAt ? new Date(renter.createdAt).toLocaleString("vi-VN") : "Chưa rõ" },
    ]
      .map(
        (item) => `
          <div class="admin-renter-detail-info">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </div>
        `
      )
      .join("");

    const documentPreview = documents.length
      ? documents.map((document) => getDocumentPreviewMarkup(document)).join("")
      : '<div class="admin-empty">Người dùng này chưa tải giấy tờ lên.</div>';

    elements.renterDetailBody.innerHTML = `
      <div class="admin-renter-detail">
        <section class="admin-renter-detail__summary">
          <div class="admin-renter-detail__identity">
            <div class="admin-renter-avatar admin-renter-avatar--large" aria-hidden="true">
              ${escapeHtml((renter.fullName || "?").trim().charAt(0).toUpperCase() || "?")}
            </div>
            <div>
              <h3>${escapeHtml(renter.fullName || "Người thuê")}</h3>
              <p>${escapeHtml(renter.email || "Chưa cập nhật email")}</p>
            </div>
          </div>

          <div class="admin-renter-detail__stats">
            <article class="admin-renter-detail-stat">
              <span>Tổng đơn thuê</span>
              <strong>${renter.totalOrders}</strong>
            </article>
            <article class="admin-renter-detail-stat">
              <span>Tổng chi</span>
              <strong>${formatPrice(renter.totalSpent)}</strong>
            </article>
            <article class="admin-renter-detail-stat">
              <span>Trạng thái hồ sơ</span>
              <strong>${renter.verificationReady ? "Đã đủ CCCD" : "Thiếu CCCD"}</strong>
            </article>
          </div>
        </section>

        <section class="admin-renter-detail__section">
          <div class="admin-renter-detail__section-head">
            <strong>Thông tin tài khoản</strong>
          </div>
          <div class="admin-renter-detail__info-grid">
            ${infoRows}
          </div>
        </section>

        <section class="admin-renter-detail__section">
          <div class="admin-renter-detail__section-head">
            <strong>Preview CCCD và giấy tờ</strong>
          </div>
          <div class="admin-renter-preview-grid">
            ${documentPreview}
          </div>
        </section>
      </div>
    `;
  }

  function getEditorToolbarMarkup(editorName) {
    const items = [
      { action: "heading", label: "H2" },
      { action: "paragraph", label: "Đoạn" },
      { action: "bold", label: "Đậm" },
      { action: "italic", label: "Nghiêng" },
      { action: "unorderedList", label: "• Danh sách" },
      { action: "orderedList", label: "1. Danh sách" },
      { action: "link", label: "Gắn link" },
      { action: "clear", label: "Xóa định dạng" },
    ];

    return items
      .map(
        (item) => `
          <button
            type="button"
            class="admin-rich-editor__tool"
            data-editor-action="${item.action}"
            data-editor-target="${editorName}"
          >
            ${item.label}
          </button>
        `
      )
      .join("");
  }

  function getEditorSurface(editorName) {
    return elements.productModalBody?.querySelector(`[data-rich-editor="${editorName}"]`) || null;
  }

  function normalizeEditorSurface(surface) {
    if (!surface) {
      return;
    }

    const text = String(surface.textContent || "").replace(/\u00a0/g, " ").trim();
    if (!text && !surface.querySelector("img,video,iframe,ul,ol,blockquote,h1,h2,h3,h4,h5,h6")) {
      surface.innerHTML = "";
    }
  }

  function setEditorValue(editorName, html) {
    const surface = getEditorSurface(editorName);

    if (!surface) {
      return;
    }

    surface.innerHTML = String(html || "").trim();
    normalizeEditorSurface(surface);
  }

  function getEditorValue(editorName) {
    const surface = getEditorSurface(editorName);

    if (!surface) {
      return "";
    }

    normalizeEditorSurface(surface);
    return String(surface.innerHTML || "").trim();
  }

  function updatePreviewImage() {
    const preview = elements.productModalBody?.querySelector("[data-product-preview-image]");
    const input = elements.productModalBody?.querySelector('[name="thumbnailUrl"]');

    if (!preview || !input) {
      return;
    }

    const nextValue = String(input.value || "").trim();
    preview.src = nextValue || state.productDetail?.images?.[0] || "";
  }

  function runEditorAction(action, editorName) {
    const surface = getEditorSurface(editorName);

    if (!surface) {
      return;
    }

    surface.focus();

    if (action === "heading") {
      document.execCommand("formatBlock", false, "h2");
      return;
    }

    if (action === "paragraph") {
      document.execCommand("formatBlock", false, "p");
      return;
    }

    if (action === "bold") {
      document.execCommand("bold", false);
      return;
    }

    if (action === "italic") {
      document.execCommand("italic", false);
      return;
    }

    if (action === "unorderedList") {
      document.execCommand("insertUnorderedList", false);
      return;
    }

    if (action === "orderedList") {
      document.execCommand("insertOrderedList", false);
      return;
    }

    if (action === "link") {
      const url = window.prompt("Nhập đường dẫn liên kết:", "https://");
      if (url) {
        document.execCommand("createLink", false, url);
      }
      return;
    }

    if (action === "clear") {
      document.execCommand("removeFormat", false);
    }
  }

  async function ensureAdminAccess() {
    try {
      const response = await window.focusStorefront.request("/auth/me", {
        withCart: false,
      });

      if (!response?.user?.isAdmin && response?.user?.role !== "admin") {
        window.location.href = "./tai-khoan.html";
        return false;
      }

      return true;
    } catch (error) {
      window.location.href = "./dang-nhap.html";
      return false;
    }
  }

  async function loadDashboard() {
    setStatus("Đang tải dữ liệu quản trị...", "info");

    try {
      const json = await window.focusStorefront.request("/admin/dashboard", {
        withCart: false,
      });

      state.statusOptions = Array.isArray(json.statusOptions) ? json.statusOptions : [];
      state.summary = json.summary || {};
      state.orders = Array.isArray(json.orders) ? json.orders : [];
      state.products = Array.isArray(json.products) ? json.products : [];
      state.renters = Array.isArray(json.renters) ? json.renters : [];

      renderSummary();
      renderStatusOptions();
      renderCategoryOptions();
      renderOrders();
      renderProducts();
      renderRenters();
      setStatus("Dữ liệu quản trị đã sẵn sàng.", "success");
    } catch (error) {
      setStatus(error.message || "Không thể tải dữ liệu quản trị.", "error");
    }
  }

  function renderSummary() {
    elements.summaryOrders.textContent = String(state.summary?.totalOrders || 0);
    elements.summaryPending.textContent = String(state.summary?.pendingOrders || 0);
    elements.summaryRenters.textContent = String(state.summary?.totalRenters || 0);
    elements.summaryProducts.textContent = String(state.summary?.totalProducts || 0);
    elements.summaryRevenue.textContent = formatPrice(state.summary?.totalRevenue || 0);
  }

  function renderStatusOptions() {
    const currentValue = elements.orderStatusFilter.value || "";
    elements.orderStatusFilter.innerHTML = [
      '<option value="">Tất cả trạng thái</option>',
      ...state.statusOptions.map(
        (status) =>
          `<option value="${status}">${escapeHtml(statusLabels[status] || status)}</option>`
      ),
    ].join("");
    elements.orderStatusFilter.value = currentValue;
  }

  function renderCategoryOptions() {
    const currentValue = elements.productCategoryFilter.value || "";
    const categories = Array.from(
      new Map(
        state.products.map((product) => [product.categorySlug, product.categoryName])
      ).entries()
    );

    elements.productCategoryFilter.innerHTML = [
      '<option value="">Tất cả danh mục</option>',
      ...categories.map(
        ([slug, name]) => `<option value="${slug}">${escapeHtml(name)}</option>`
      ),
    ].join("");
    elements.productCategoryFilter.value = currentValue;
  }

  function getFilteredOrders() {
    const keyword = String(elements.orderSearch.value || "").trim().toLowerCase();
    const status = String(elements.orderStatusFilter.value || "");

    return state.orders.filter((order) => {
      const matchesStatus = !status || order.status === status;
      const searchable = [
        order.orderCode,
        order.renter?.fullName,
        order.renter?.phone,
        order.renter?.email,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!keyword || searchable.includes(keyword));
    });
  }

  function renderOrders() {
    const orders = getFilteredOrders();

    if (!orders.length) {
      elements.ordersList.innerHTML =
        '<div class="admin-empty">Chưa có đơn thuê phù hợp với bộ lọc hiện tại.</div>';
      return;
    }

    elements.ordersList.innerHTML = orders
      .map((order) => {
        const itemsHtml = order.items
          .map(
            (item) => `
              <article class="admin-order-item">
                <img src="${escapeHtml(item.imageUrl || "")}" alt="${escapeHtml(item.productName)}" loading="lazy" />
                <div>
                  <h4>${escapeHtml(item.productName)}</h4>
                  <p>${item.rentalDays} ngày • Nhận thiết bị: ${new Date(item.rentalStart).toLocaleString("vi-VN")}</p>
                </div>
                <strong>${formatPrice(item.totalPrice)}</strong>
              </article>
            `
          )
          .join("");

        const optionHtml = state.statusOptions
          .map(
            (status) =>
              `<option value="${status}"${order.status === status ? " selected" : ""}>${escapeHtml(
                statusLabels[status] || status
              )}</option>`
          )
          .join("");

        return `
          <section class="admin-order-card" data-order-id="${order.id}">
            <div class="admin-order-head">
              <div>
                <h3>${escapeHtml(order.orderCode)}</h3>
                <p>Người thuê: ${escapeHtml(order.renter.fullName || "")} • ${escapeHtml(order.renter.phone || "")}</p>
              </div>
              <span class="admin-order-badge is-${escapeHtml(order.status)}">
                ${escapeHtml(statusLabels[order.status] || order.status)}
              </span>
            </div>

            <div class="admin-order-grid">
              <div class="admin-order-meta">
                <strong>Liên hệ</strong>
                <p>${escapeHtml(order.renter.email || "-")}</p>
                <p>${escapeHtml(order.renter.address || "Chưa cập nhật địa chỉ")}</p>
              </div>
              <div class="admin-order-meta">
                <strong>Thông tin đơn</strong>
                <p>${order.itemCount} sản phẩm</p>
                <p>Tạo lúc ${new Date(order.createdAt).toLocaleString("vi-VN")}</p>
              </div>
              <div class="admin-order-meta">
                <strong>Tạm tính</strong>
                <p>${formatPrice(order.totalPrice)}</p>
                <p>CCCD: ${escapeHtml(order.renter.identityNumber || "Chưa cập nhật")}</p>
              </div>
            </div>

            <div class="admin-order-items">${itemsHtml}</div>

            <div class="admin-order-actions">
              <select class="admin-order-status-select" data-order-status-select="${order.id}">
                ${optionHtml}
              </select>
              <button type="button" data-save-order-status="${order.id}">Lưu trạng thái</button>
            </div>
          </section>
        `;
      })
      .join("");
  }

  function getFilteredProducts() {
    const keyword = String(elements.productSearch.value || "").trim().toLowerCase();
    const category = String(elements.productCategoryFilter.value || "");

    return state.products.filter((product) => {
      const matchesCategory = !category || product.categorySlug === category;
      const searchable = `${product.name} ${product.companyName} ${product.slug}`.toLowerCase();
      return matchesCategory && (!keyword || searchable.includes(keyword));
    });
  }

  function renderProducts() {
    const products = getFilteredProducts();

    if (!products.length) {
      elements.productsBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="admin-empty">Không có sản phẩm phù hợp với bộ lọc hiện tại.</div>
          </td>
        </tr>
      `;
      return;
    }

    elements.productsBody.innerHTML = products
      .map(
        (product) => `
          <tr data-product-id="${product.id}">
            <td>
              <div class="admin-product-cell">
                <img src="${escapeHtml(product.thumbnailUrl || "")}" alt="${escapeHtml(product.name)}" loading="lazy" />
                <div>
                  <h3>${escapeHtml(product.name)}</h3>
                  <p>${escapeHtml(product.slug)}</p>
                </div>
              </div>
            </td>
            <td>${escapeHtml(product.categoryName)}</td>
            <td>${escapeHtml(product.companyName)}</td>
            <td>${formatPrice(product.price)}</td>
            <td>${formatPrice(product.sessionPrice)}</td>
            <td>
              <div class="admin-product-actions">
                <button class="admin-product-view" type="button" data-view-product="${product.id}">Xem / Sửa</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  }

  function getFilteredRenters() {
    const keyword = String(elements.renterSearch.value || "").trim().toLowerCase();

    return state.renters.filter((renter) => {
      const searchable = [
        renter.fullName,
        renter.phone,
        renter.email,
        renter.identityNumber,
      ]
        .join(" ")
        .toLowerCase();
      return !keyword || searchable.includes(keyword);
    });
  }

  function renderRenters() {
    const renters = getFilteredRenters();

    if (!renters.length) {
      elements.rentersGrid.innerHTML =
        '<div class="admin-empty">Chưa có người thuê phù hợp với bộ lọc hiện tại.</div>';
      return;
    }

    elements.rentersGrid.innerHTML = renters
      .map((renter) => {
        const documents = [
          renter.documents.cccdFront
            ? {
                label: "CCCD mặt trước",
                href: renter.documents.cccdFront,
              }
            : null,
          renter.documents.cccdBack
            ? {
                label: "CCCD mặt sau",
                href: renter.documents.cccdBack,
              }
            : null,
          renter.documents.personalOther
            ? {
                label: "Giấy tờ khác",
                href: renter.documents.personalOther,
              }
            : null,
        ].filter(Boolean);

        const documentsHtml = documents.length
          ? documents
              .map(
                (document) => `
                  <a class="admin-renter-doc-chip" href="${escapeHtml(document.href)}" target="_blank" rel="noreferrer">
                    ${escapeHtml(document.label)}
                  </a>
                `
              )
              .join("")
          : '<span class="admin-renter-doc-empty">Chưa có giấy tờ</span>';

        return `
          <article class="admin-renter-card">
            <div class="admin-renter-row">
              <div class="admin-renter-col admin-renter-col--identity">
                <div class="admin-renter-avatar" aria-hidden="true">
                  ${escapeHtml((renter.fullName || "?").trim().charAt(0).toUpperCase() || "?")}
                </div>
                <div class="admin-renter-identity-copy">
                  <h3>${escapeHtml(renter.fullName)}</h3>
                  <p>Tạo lúc ${new Date(renter.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>

              <div class="admin-renter-col">
                <span class="admin-renter-col-label">Liên hệ</span>
                <strong>${escapeHtml(renter.email || "Chưa cập nhật")}</strong>
                <p>${escapeHtml(renter.phone || "Chưa cập nhật")}</p>
              </div>

              <div class="admin-renter-col">
                <span class="admin-renter-col-label">Hồ sơ</span>
                <strong>${escapeHtml(renter.identityNumber || "Chưa có CCCD")}</strong>
                <p>${escapeHtml(renter.birthday || "Chưa cập nhật ngày sinh")}</p>
              </div>

              <div class="admin-renter-col admin-renter-col--address">
                <span class="admin-renter-col-label">Địa chỉ / Mạng xã hội</span>
                <strong>${escapeHtml(renter.address || "Chưa cập nhật địa chỉ")}</strong>
                <p>${escapeHtml(renter.facebookUrl || "Chưa có link Facebook/Zalo")}</p>
              </div>

              <div class="admin-renter-col admin-renter-col--documents">
                <span class="admin-renter-col-label">Giấy tờ</span>
                <div class="admin-renter-doc-list">
                  ${documentsHtml}
                </div>
              </div>

              <div class="admin-renter-col admin-renter-col--action">
                <span class="admin-renter-col-label">Thao tác</span>
                <strong>${renter.totalOrders} đơn thuê</strong>
                <p>${formatPrice(renter.totalSpent)}</p>
                <span class="admin-renter-badge ${renter.verificationReady ? "is-ready" : "is-pending"}">
                  ${renter.verificationReady ? "Đủ CCCD" : "Thiếu CCCD"}
                </span>
                <button class="admin-product-view" type="button" data-view-renter="${escapeHtml(renter.id)}">
                  Xem chi tiết
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderProductDetail() {
    const product = state.productDetail;

    if (!product) {
      elements.productModalBody.innerHTML =
        '<div class="admin-empty">Không tìm thấy sản phẩm cần chỉnh sửa.</div>';
      return;
    }

    const gallery = (product.images || [])
      .map(
        (imageUrl) => `
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" />
        `
      )
      .join("");

    elements.productModalBody.innerHTML = `
      <form class="admin-product-detail" data-product-detail-form>
        <div class="admin-product-detail__top">
          <section class="admin-product-preview">
            <div class="admin-product-preview__hero">
              <img
                src="${escapeHtml(product.thumbnailUrl || product.images?.[0] || "")}"
                alt="${escapeHtml(product.name)}"
                loading="lazy"
                data-product-preview-image
              />
            </div>
            <div class="admin-product-preview__thumbs">
              ${gallery || '<div class="admin-empty">Chưa có ảnh gallery.</div>'}
            </div>
          </section>

          <section class="admin-product-overview">
            <div class="admin-product-meta">
              <article class="admin-product-meta__card">
                <strong>Danh mục</strong>
                <span>${escapeHtml(product.categoryName || "-")}</span>
              </article>
              <article class="admin-product-meta__card">
                <strong>Hãng</strong>
                <span>${escapeHtml(product.companyName || "-")}</span>
              </article>
              <article class="admin-product-meta__card">
                <strong>Mã sản phẩm</strong>
                <span>${escapeHtml(product.id || "-")}</span>
              </article>
              <article class="admin-product-meta__card">
                <strong>Slug hiện tại</strong>
                <span>${escapeHtml(product.slug || "-")}</span>
              </article>
            </div>

            <div class="admin-product-form__grid">
              <div class="admin-product-form__field is-full">
                <label for="admin-product-name">Tên sản phẩm</label>
                <input id="admin-product-name" name="name" type="text" value="${escapeHtml(product.name)}" required />
              </div>

              <div class="admin-product-form__field">
                <label for="admin-product-slug">Slug</label>
                <input id="admin-product-slug" name="slug" type="text" value="${escapeHtml(product.slug)}" required />
              </div>

              <div class="admin-product-form__field">
                <label for="admin-product-thumbnail">Ảnh đại diện</label>
                <input id="admin-product-thumbnail" name="thumbnailUrl" type="text" value="${escapeHtml(product.thumbnailUrl)}" />
              </div>

              <div class="admin-product-form__field">
                <label for="admin-product-price">Giá thuê theo ngày</label>
                <input id="admin-product-price" name="price" type="number" min="0" value="${Number(product.price) || 0}" required />
              </div>

              <div class="admin-product-form__field">
                <label for="admin-product-session-price">Giá thuê theo buổi</label>
                <input id="admin-product-session-price" name="sessionPrice" type="number" min="0" value="${Number(product.sessionPrice) || 0}" required />
              </div>
            </div>
          </section>
        </div>

        <section class="admin-product-editor-card">
          <div class="admin-product-editor-card__head">
            <div>
              <strong>Thông tin nổi bật</strong>
              <p>Chỉnh trực tiếp như một trình soạn thảo văn bản đơn giản.</p>
            </div>
          </div>
          <div class="admin-rich-editor">
            <div class="admin-rich-editor__toolbar">
              ${getEditorToolbarMarkup("description")}
            </div>
            <div
              class="admin-rich-editor__surface"
              contenteditable="true"
              data-rich-editor="description"
              data-placeholder="Nhập các thông tin nổi bật của sản phẩm..."
            ></div>
          </div>
        </section>

        <section class="admin-product-editor-card">
          <div class="admin-product-editor-card__head">
            <div>
              <strong>Nội dung chi tiết</strong>
              <p>Bạn có thể định dạng tiêu đề, đoạn văn, danh sách và liên kết.</p>
            </div>
          </div>
          <div class="admin-rich-editor">
            <div class="admin-rich-editor__toolbar">
              ${getEditorToolbarMarkup("detail")}
            </div>
            <div
              class="admin-rich-editor__surface admin-rich-editor__surface--large"
              contenteditable="true"
              data-rich-editor="detail"
              data-placeholder="Nhập mô tả chi tiết, cách dùng, lưu ý hoặc nội dung giới thiệu..."
            ></div>
          </div>
        </section>

        <div class="admin-product-form__actions">
          <button class="admin-product-view" type="button" data-close-product-modal>Đóng</button>
          <button class="admin-product-save" type="submit">Lưu thay đổi</button>
        </div>
      </form>
    `;

    setEditorValue("description", product.description || "");
    setEditorValue("detail", product.detail || "");
  }

  async function openProductDetail(productId) {
    state.activeProductId = String(productId);
    openProductModal();
    setProductModalStatus("Đang tải thông tin sản phẩm...", "info");
    elements.productModalBody.innerHTML = '<div class="admin-empty">Đang tải dữ liệu sản phẩm...</div>';

    try {
      const json = await window.focusStorefront.request(`/admin/products/${productId}`, {
        withCart: false,
      });

      state.productDetail = json.product || null;
      renderProductDetail();
      setProductModalStatus("Dữ liệu sản phẩm đã sẵn sàng để chỉnh sửa.", "success");
    } catch (error) {
      state.productDetail = null;
      elements.productModalBody.innerHTML =
        '<div class="admin-empty">Không thể tải chi tiết sản phẩm.</div>';
      setProductModalStatus(error.message || "Không thể tải chi tiết sản phẩm.", "error");
    }
  }

  async function saveProductDetail() {
    const form = elements.productModalBody?.querySelector("[data-product-detail-form]");

    if (!form || !state.activeProductId) {
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      slug: String(formData.get("slug") || "").trim(),
      thumbnailUrl: String(formData.get("thumbnailUrl") || "").trim(),
      price: Number(formData.get("price") || 0),
      sessionPrice: Number(formData.get("sessionPrice") || 0),
      description: getEditorValue("description"),
      detail: getEditorValue("detail"),
    };

    setProductModalStatus("Đang lưu thay đổi sản phẩm...", "info");

    try {
      const json = await window.focusStorefront.request(`/admin/products/${state.activeProductId}`, {
        method: "PATCH",
        body: payload,
        withCart: false,
      });

      state.productDetail = json.product || null;
      state.products = state.products.map((product) => {
        if (String(product.id) !== String(state.activeProductId)) {
          return product;
        }

        return {
          ...product,
          name: state.productDetail?.name || product.name,
          slug: state.productDetail?.slug || product.slug,
          price: Number(state.productDetail?.price) || product.price,
          sessionPrice: Number(state.productDetail?.sessionPrice) || product.sessionPrice,
          thumbnailUrl: state.productDetail?.thumbnailUrl || product.thumbnailUrl,
        };
      });

      renderProducts();
      renderProductDetail();
      setProductModalStatus("Đã lưu thay đổi sản phẩm.", "success");
      setStatus("Sản phẩm đã được cập nhật.", "success");
    } catch (error) {
      setProductModalStatus(error.message || "Không thể cập nhật sản phẩm.", "error");
    }
  }

  async function saveOrderStatus(orderId) {
    const select = document.querySelector(`[data-order-status-select="${orderId}"]`);

    if (!select) {
      return;
    }

    setStatus("Đang cập nhật trạng thái đơn thuê...", "info");

    try {
      const json = await window.focusStorefront.request(`/admin/orders/${orderId}`, {
        method: "PATCH",
        body: {
          status: select.value,
        },
        withCart: false,
      });

      state.orders = state.orders.map((order) =>
        order.id === orderId ? json.order || order : order
      );
      renderOrders();
      setStatus("Đã cập nhật trạng thái đơn thuê.", "success");
    } catch (error) {
      setStatus(error.message || "Không thể cập nhật trạng thái đơn thuê.", "error");
    }
  }

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.adminTab);
    });
  });

  elements.productModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeProductModal);
  });

  elements.renterModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeRenterModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.productModal && !elements.productModal.hidden) {
      closeProductModal();
      return;
    }

    if (event.key === "Escape" && elements.renterModal && !elements.renterModal.hidden) {
      closeRenterModal();
    }
  });

  elements.refreshButton?.addEventListener("click", loadDashboard);
  elements.orderSearch?.addEventListener("input", renderOrders);
  elements.orderStatusFilter?.addEventListener("change", renderOrders);
  elements.productSearch?.addEventListener("input", renderProducts);
  elements.productCategoryFilter?.addEventListener("change", renderProducts);
  elements.renterSearch?.addEventListener("input", renderRenters);

  elements.ordersList?.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save-order-status]");

    if (!saveButton) {
      return;
    }

    saveOrderStatus(saveButton.dataset.saveOrderStatus);
  });

  elements.productsBody?.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-product]");

    if (!viewButton) {
      return;
    }

    openProductDetail(viewButton.dataset.viewProduct);
  });

  elements.rentersGrid?.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-renter]");

    if (!viewButton) {
      return;
    }

    const renter = state.renters.find(
      (item) => String(item.id) === String(viewButton.dataset.viewRenter)
    );

    if (!renter) {
      return;
    }

    state.activeRenter = renter;
    renderRenterDetail();
    openRenterModal();
  });

  elements.productModalBody?.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-product-detail-form]");

    if (!form) {
      return;
    }

    event.preventDefault();
    saveProductDetail();
  });

  elements.productModalBody?.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-product-modal]");
    if (closeButton) {
      closeProductModal();
      return;
    }

    const editorButton = event.target.closest("[data-editor-action]");
    if (!editorButton) {
      return;
    }

    runEditorAction(editorButton.dataset.editorAction, editorButton.dataset.editorTarget);
  });

  elements.productModalBody?.addEventListener("input", (event) => {
    if (event.target.matches('[name="thumbnailUrl"]')) {
      updatePreviewImage();
    }

    if (event.target.matches("[data-rich-editor]")) {
      normalizeEditorSurface(event.target);
    }
  });

  elements.productModalBody?.addEventListener("blur", (event) => {
    if (event.target.matches("[data-rich-editor]")) {
      normalizeEditorSurface(event.target);
    }
  }, true);

  activateTab("orders");

  (async () => {
    const canAccessAdmin = await ensureAdminAccess();

    if (!canAccessAdmin) {
      return;
    }

    await loadDashboard();
  })();
}
