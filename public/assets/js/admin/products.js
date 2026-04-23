import { closeProductModal, elements, openProductModal, state } from "./state.js";
import { renderSummary } from "./orders.js";
import {
  escapeHtml,
  getEditorToolbarMarkup,
  getEditorValue,
  normalizeEditorSurface,
  readFileAsBase64,
  runEditorAction,
  setEditorValue,
  setProductModalStatus,
  setStatus,
} from "./utils.js";

function setProductViewMode(mode) {
  const nextMode = mode === "companies" ? "companies" : "products";

  document.querySelectorAll("[data-product-view-mode]").forEach((button) => {
    const isActive = button.dataset.productViewMode === nextMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  document.querySelectorAll("[data-product-view-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.productViewPanel !== nextMode;
  });
}

function getCompaniesByCategory(categoryId) {
  return state.companies.filter((company) => Number(company.categoryId) === Number(categoryId));
}

function buildCompanyOptions(categoryId, companyId) {
  const companies = getCompaniesByCategory(categoryId);
  if (!companies.length) return '<option value="">Chưa có hãng phù hợp</option>';
  return companies
    .map(
      (company) =>
        `<option value="${company.id}"${
          Number(company.id) === Number(companyId) ? " selected" : ""
        }>${escapeHtml(company.name)}</option>`
    )
    .join("");
}

function getImageListFromForm() {
  return Array.from(elements.productModalBody?.querySelectorAll("[data-product-image-url]") || [])
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

function updatePreviewImage() {
  const preview = elements.productModalBody?.querySelector("[data-product-preview-image]");
  const thumbnailInput = elements.productModalBody?.querySelector('[name="thumbnailUrl"]');
  if (!preview || !thumbnailInput) return;
  preview.src = String(thumbnailInput.value || "").trim() || state.productDetail?.images?.[0] || "";
}

function syncThumbnailFieldWithImages() {
  const thumbnailInput = elements.productModalBody?.querySelector('[name="thumbnailUrl"]');
  const images = getImageListFromForm();
  if (!thumbnailInput) return;
  if (!String(thumbnailInput.value || "").trim() && images.length) {
    thumbnailInput.value = images[0];
  }
  updatePreviewImage();
}

function renderProductImageManager(images = []) {
  const uniqueImages = Array.from(new Set(images.map((item) => String(item || "").trim()).filter(Boolean)));
  return `
    <div class="admin-product-image-manager">
      <div class="admin-product-form__field is-full">
        <label for="admin-product-upload">Tải ảnh sản phẩm</label>
        <input id="admin-product-upload" type="file" accept="image/*" multiple data-product-upload-input />
        <p class="admin-product-help">Bạn có thể tải nhiều ảnh và đặt một ảnh làm đại diện.</p>
      </div>
      <div class="admin-product-upload-actions">
        <button class="admin-product-view" type="button" data-upload-product-image>Upload ảnh</button>
      </div>
      <div class="admin-product-upload-list">
        ${
          uniqueImages.length
            ? uniqueImages
                .map(
                  (imageUrl, index) => `
                    <article class="admin-product-upload-item">
                      <img src="${escapeHtml(imageUrl)}" alt="Ảnh sản phẩm ${index + 1}" loading="lazy" />
                      <div class="admin-product-upload-item__meta">
                        <input type="hidden" value="${escapeHtml(imageUrl)}" data-product-image-url />
                        <span>${index === 0 ? "Ảnh đầu tiên" : `Ảnh ${index + 1}`}</span>
                        <div class="admin-product-upload-item__actions">
                          <button type="button" data-set-thumbnail="${escapeHtml(imageUrl)}">Đặt làm đại diện</button>
                          <button type="button" data-remove-image="${escapeHtml(imageUrl)}">Xóa ảnh</button>
                        </div>
                      </div>
                    </article>
                  `
                )
                .join("")
            : '<div class="admin-empty">Chưa có ảnh sản phẩm.</div>'
        }
      </div>
    </div>
  `;
}

function createEmptyProductDraft() {
  const category = state.categories[0] || { id: 0, slug: "", name: "" };
  const company = getCompaniesByCategory(category.id)[0] || { id: 0, name: "" };
  return {
    id: "",
    slug: "",
    name: "",
    price: 0,
    sessionPrice: 0,
    thumbnailUrl: "",
    description: "",
    detail: "",
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: category.name,
    companyId: company.id,
    companyName: company.name,
    images: [],
  };
}

function getCategoryNameById(categoryId) {
  return state.categories.find((item) => Number(item.id) === Number(categoryId))?.name || "-";
}

function renderCompanyCategoryOptions() {
  if (!elements.companyCategorySelect) {
    return;
  }

  const current = String(elements.companyCategorySelect.value || "");

  elements.companyCategorySelect.innerHTML = [
    '<option value="">Chọn danh mục</option>',
    ...state.categories.map(
      (category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`
    ),
  ].join("");

  if (current && state.categories.some((item) => Number(item.id) === Number(current))) {
    elements.companyCategorySelect.value = current;
    return;
  }

  elements.companyCategorySelect.value = state.categories[0] ? String(state.categories[0].id) : "";
}

export function renderCategoryOptions() {
  const current = elements.productCategoryFilter.value || "";
  elements.productCategoryFilter.innerHTML = [
    '<option value="">Tất cả danh mục</option>',
    ...state.categories.map(
      (category) => `<option value="${category.slug}">${escapeHtml(category.name)}</option>`
    ),
  ].join("");
  elements.productCategoryFilter.value = current;
  renderCompanyCategoryOptions();
}

export function renderCompanyManager() {
  if (!elements.companiesBody) {
    return;
  }

  const companies = [...state.companies].sort((first, second) => {
    if (Number(first.categoryId) !== Number(second.categoryId)) {
      return Number(first.categoryId) - Number(second.categoryId);
    }
    return String(first.name || "").localeCompare(String(second.name || ""), "vi");
  });

  if (!companies.length) {
    elements.companiesBody.innerHTML =
      '<tr><td colspan="3"><div class="admin-empty">Chưa có hãng sản phẩm.</div></td></tr>';
    return;
  }

  elements.companiesBody.innerHTML = companies
    .map(
      (company) => `
        <tr>
          <td>${escapeHtml(company.name || "-")}</td>
          <td>${escapeHtml(getCategoryNameById(company.categoryId))}</td>
          <td>
            <div class="admin-product-actions">
              <button class="admin-product-view" type="button" data-rename-company="${company.id}">Đổi tên</button>
              <button class="admin-product-view admin-product-delete" type="button" data-delete-company="${company.id}">Xóa</button>
            </div>
          </td>
        </tr>
      `
    )
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

export function renderProducts() {
  const products = getFilteredProducts();
  if (!products.length) {
    elements.productsBody.innerHTML =
      '<tr><td colspan="6"><div class="admin-empty">Không có sản phẩm phù hợp với bộ lọc hiện tại.</div></td></tr>';
    return;
  }

  elements.productsBody.innerHTML = products
    .map(
      (product) => `
        <tr>
          <td><div class="admin-product-cell"><img src="${escapeHtml(product.thumbnailUrl || "")}" alt="${escapeHtml(
            product.name
          )}" loading="lazy" /><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(
            product.slug
          )}</p></div></div></td>
          <td>${escapeHtml(product.categoryName)}</td>
          <td>${escapeHtml(product.companyName)}</td>
          <td>${new Intl.NumberFormat("vi-VN").format(Math.round(Number(product.price) || 0))} đ</td>
          <td>${new Intl.NumberFormat("vi-VN").format(Math.round(Number(product.sessionPrice) || 0))} đ</td>
          <td><div class="admin-product-actions"><button class="admin-product-view" type="button" data-view-product="${product.id}">Xem / Sửa</button><button class="admin-product-view admin-product-delete" type="button" data-delete-product="${product.id}">Xóa</button></div></td>
        </tr>
      `
    )
    .join("");
}

export function renderProductModal() {
  const product = state.productDetail;
  if (!product || !elements.productModalBody) return;
  if (elements.productModalTitle) {
    elements.productModalTitle.textContent =
      state.productModalMode === "create" ? "Thêm sản phẩm mới" : "Xem và chỉnh sửa hàng hóa";
  }

  const categoryOptions = state.categories
    .map(
      (category) =>
        `<option value="${category.id}"${
          Number(category.id) === Number(product.categoryId) ? " selected" : ""
        }>${escapeHtml(category.name)}</option>`
    )
    .join("");

  elements.productModalBody.innerHTML = `
    <form class="admin-product-detail" data-product-detail-form>
      <div class="admin-product-detail__top">
        <section class="admin-product-preview">
          <div class="admin-product-preview__hero"><img src="${escapeHtml(
            product.thumbnailUrl || product.images?.[0] || ""
          )}" alt="${escapeHtml(product.name || "Sản phẩm")}" loading="lazy" data-product-preview-image /></div>
          <div class="admin-product-preview__thumbs">${
            product.images?.length
              ? product.images
                  .map(
                    (imageUrl) =>
                      `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name || "Ảnh sản phẩm")}" loading="lazy" />`
                  )
                  .join("")
              : '<div class="admin-empty">Chưa có ảnh gallery.</div>'
          }</div>
        </section>
        <section class="admin-product-overview">
          <div class="admin-product-meta">
            <article class="admin-product-meta__card"><strong>Danh mục</strong><span>${escapeHtml(product.categoryName || "-")}</span></article>
            <article class="admin-product-meta__card"><strong>Hãng</strong><span>${escapeHtml(product.companyName || "-")}</span></article>
            <article class="admin-product-meta__card"><strong>Mã sản phẩm</strong><span>${escapeHtml(product.id || "Tạo mới")}</span></article>
            <article class="admin-product-meta__card"><strong>Slug hiện tại</strong><span>${escapeHtml(product.slug || "-")}</span></article>
          </div>
          <div class="admin-product-form__grid">
            <div class="admin-product-form__field is-full"><label for="admin-product-name">Tên sản phẩm</label><input id="admin-product-name" name="name" type="text" value="${escapeHtml(product.name || "")}" required /></div>
            <div class="admin-product-form__field"><label for="admin-product-slug">Slug</label><input id="admin-product-slug" name="slug" type="text" value="${escapeHtml(product.slug || "")}" required /></div>
            <div class="admin-product-form__field"><label for="admin-product-thumbnail">Ảnh đại diện</label><input id="admin-product-thumbnail" name="thumbnailUrl" type="text" value="${escapeHtml(product.thumbnailUrl || "")}" /></div>
            <div class="admin-product-form__field"><label for="admin-product-category">Danh mục</label><select id="admin-product-category" name="categoryId" data-product-category-select required>${categoryOptions}</select></div>
            <div class="admin-product-form__field"><label for="admin-product-company">Hãng</label><select id="admin-product-company" name="companyId" data-product-company-select required>${buildCompanyOptions(
              product.categoryId,
              product.companyId
            )}</select></div>
            <div class="admin-product-form__field"><label for="admin-product-price">Giá thuê theo ngày</label><input id="admin-product-price" name="price" type="number" min="0" value="${Number(
              product.price
            ) || 0}" required /></div>
            <div class="admin-product-form__field"><label for="admin-product-session-price">Giá thuê theo buổi</label><input id="admin-product-session-price" name="sessionPrice" type="number" min="0" value="${Number(
              product.sessionPrice
            ) || 0}" required /></div>
          </div>
        </section>
      </div>
      <section class="admin-product-editor-card"><div class="admin-product-editor-card__head"><div><strong>Ảnh sản phẩm</strong><p>Upload ảnh mới, đặt ảnh đại diện hoặc xóa ảnh khỏi gallery.</p></div></div>${renderProductImageManager(
        product.images || []
      )}</section>
      <section class="admin-product-editor-card"><div class="admin-product-editor-card__head"><div><strong>Thông tin nổi bật</strong><p>Chỉnh trực tiếp như một trình soạn thảo văn bản đơn giản.</p></div></div><div class="admin-rich-editor"><div class="admin-rich-editor__toolbar">${getEditorToolbarMarkup(
        "description"
      )}</div><div class="admin-rich-editor__surface" contenteditable="true" data-rich-editor="description" data-placeholder="Nhập các thông tin nổi bật của sản phẩm..."></div></div></section>
      <section class="admin-product-editor-card"><div class="admin-product-editor-card__head"><div><strong>Nội dung chi tiết</strong><p>Bạn có thể định dạng tiêu đề, đoạn văn, danh sách và liên kết.</p></div></div><div class="admin-rich-editor"><div class="admin-rich-editor__toolbar">${getEditorToolbarMarkup(
        "detail"
      )}</div><div class="admin-rich-editor__surface admin-rich-editor__surface--large" contenteditable="true" data-rich-editor="detail" data-placeholder="Nhập mô tả chi tiết, cách dùng, lưu ý hoặc nội dung giới thiệu..."></div></div></section>
      <div class="admin-product-form__actions">${
        state.productModalMode === "edit"
          ? '<button class="admin-product-view admin-product-delete" type="button" data-delete-active-product>Xóa sản phẩm</button>'
          : ""
      }<button class="admin-product-view" type="button" data-close-product-modal>Đóng</button><button class="admin-product-save" type="submit">${
        state.productModalMode === "create" ? "Tạo sản phẩm" : "Lưu thay đổi"
      }</button></div>
    </form>
  `;

  setEditorValue("description", product.description || "");
  setEditorValue("detail", product.detail || "");
  syncThumbnailFieldWithImages();
}

export function openCreateProductModal() {
  state.productModalMode = "create";
  state.activeProductId = "";
  state.productDetail = createEmptyProductDraft();
  openProductModal();
  renderProductModal();
  setProductModalStatus("Nhập thông tin để tạo sản phẩm mới.", "info");
}

export async function openProductDetail(productId) {
  state.productModalMode = "edit";
  state.activeProductId = String(productId);
  openProductModal();
  setProductModalStatus("Đang tải thông tin sản phẩm...", "info");
  elements.productModalBody.innerHTML = '<div class="admin-empty">Đang tải dữ liệu sản phẩm...</div>';
  try {
    const json = await window.focusStorefront.request(`/admin/products/${productId}`, {
      withCart: false,
    });
    state.productDetail = json.product || null;
    renderProductModal();
    setProductModalStatus("Dữ liệu sản phẩm đã sẵn sàng để chỉnh sửa.", "success");
  } catch (error) {
    state.productDetail = null;
    elements.productModalBody.innerHTML = '<div class="admin-empty">Không thể tải chi tiết sản phẩm.</div>';
    setProductModalStatus(error.message || "Không thể tải chi tiết sản phẩm.", "error");
  }
}

async function uploadSelectedProductImages() {
  const fileInput = elements.productModalBody?.querySelector("[data-product-upload-input]");
  if (!fileInput?.files?.length) {
    setProductModalStatus("Hãy chọn ít nhất một ảnh để upload.", "error");
    return;
  }
  setProductModalStatus("Đang tải ảnh sản phẩm lên...", "info");
  try {
    const uploadedUrls = [];
    for (const file of Array.from(fileInput.files)) {
      const filePayload = await readFileAsBase64(file);
      const json = await window.focusStorefront.request("/admin/uploads/product-image", {
        method: "POST",
        body: { file: filePayload },
        withCart: false,
      });
      uploadedUrls.push(String(json.imageUrl || "").trim());
    }
    state.productDetail = {
      ...(state.productDetail || createEmptyProductDraft()),
      images: [...(state.productDetail?.images || []), ...uploadedUrls].filter(Boolean),
    };
    if (!state.productDetail.thumbnailUrl && uploadedUrls[0]) {
      state.productDetail.thumbnailUrl = uploadedUrls[0];
    }
    renderProductModal();
    setProductModalStatus("Đã upload ảnh sản phẩm.", "success");
  } catch (error) {
    setProductModalStatus(error.message || "Không thể upload ảnh sản phẩm.", "error");
  }
}

async function refreshCatalogData() {
  const dashboard = await window.focusStorefront.request("/admin/dashboard", { withCart: false });
  state.summary = dashboard.summary || {};
  state.products = Array.isArray(dashboard.products) ? dashboard.products : [];
  state.categories = Array.isArray(dashboard.categories) ? dashboard.categories : [];
  state.companies = Array.isArray(dashboard.companies) ? dashboard.companies : [];
  renderSummary();
  renderProducts();
  renderCategoryOptions();
  renderCompanyManager();
}

async function createCompany() {
  const categoryId = Number(elements.companyCategorySelect?.value || 0);
  const name = String(elements.companyNameInput?.value || "").trim();

  if (!categoryId || !name) {
    setStatus("Vui lòng chọn danh mục và nhập tên hãng.", "error");
    return;
  }

  setStatus("Đang tạo hãng sản phẩm...", "info");

  try {
    await window.focusStorefront.request("/admin/companies", {
      method: "POST",
      body: { categoryId, name },
      withCart: false,
    });
    await refreshCatalogData();
    if (elements.companyNameInput) {
      elements.companyNameInput.value = "";
    }
    setStatus("Đã tạo hãng sản phẩm mới.", "success");
  } catch (error) {
    setStatus(error.message || "Không thể tạo hãng sản phẩm.", "error");
  }
}

async function renameCompany(companyId) {
  const current = state.companies.find((item) => String(item.id) === String(companyId));

  if (!current) {
    setStatus("Không tìm thấy hãng để cập nhật.", "error");
    return;
  }

  const nextName = window.prompt("Nhập tên hãng mới", current.name || "");

  if (nextName === null) {
    return;
  }

  const name = String(nextName || "").trim();

  if (!name) {
    setStatus("Tên hãng không được để trống.", "error");
    return;
  }

  setStatus("Đang cập nhật hãng sản phẩm...", "info");

  try {
    await window.focusStorefront.request(`/admin/companies/${encodeURIComponent(companyId)}`, {
      method: "PATCH",
      body: { name },
      withCart: false,
    });
    await refreshCatalogData();
    setStatus("Đã cập nhật tên hãng sản phẩm.", "success");
  } catch (error) {
    setStatus(error.message || "Không thể cập nhật hãng sản phẩm.", "error");
  }
}

async function deleteCompany(companyId) {
  if (!window.confirm("Bạn có chắc muốn xóa hãng này không?")) {
    return;
  }

  setStatus("Đang xóa hãng sản phẩm...", "info");

  try {
    await window.focusStorefront.request(`/admin/companies/${encodeURIComponent(companyId)}`, {
      method: "DELETE",
      withCart: false,
    });
    await refreshCatalogData();
    setStatus("Đã xóa hãng sản phẩm.", "success");
  } catch (error) {
    setStatus(error.message || "Không thể xóa hãng sản phẩm.", "error");
  }
}

async function saveProductDetail() {
  const form = elements.productModalBody?.querySelector("[data-product-detail-form]");
  if (!form) return;
  const formData = new FormData(form);
  const isCreateMode = state.productModalMode === "create";
  const payload = {
    name: String(formData.get("name") || "").trim(),
    slug: String(formData.get("slug") || "").trim(),
    thumbnailUrl: String(formData.get("thumbnailUrl") || "").trim(),
    categoryId: Number(formData.get("categoryId") || 0),
    companyId: Number(formData.get("companyId") || 0),
    price: Number(formData.get("price") || 0),
    sessionPrice: Number(formData.get("sessionPrice") || 0),
    description: getEditorValue("description"),
    detail: getEditorValue("detail"),
    imageUrls: getImageListFromForm(),
  };

  setProductModalStatus(isCreateMode ? "Đang tạo sản phẩm..." : "Đang lưu thay đổi sản phẩm...", "info");

  try {
    const json = await window.focusStorefront.request(
      isCreateMode ? "/admin/products" : `/admin/products/${state.activeProductId}`,
      {
        method: isCreateMode ? "POST" : "PATCH",
        body: payload,
        withCart: false,
      }
    );
    state.productModalMode = "edit";
    state.productDetail = json.product || null;
    state.activeProductId = state.productDetail?.id || "";
    await refreshCatalogData();
    renderProductModal();
    setProductModalStatus(isCreateMode ? "Đã tạo sản phẩm mới." : "Đã lưu thay đổi sản phẩm.", "success");
    setStatus(isCreateMode ? "Sản phẩm mới đã được tạo." : "Sản phẩm đã được cập nhật.", "success");
  } catch (error) {
    setProductModalStatus(error.message || "Không thể lưu sản phẩm.", "error");
  }
}

export async function deleteProduct(productId) {
  if (!productId) return;
  if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này không?")) return;
  setStatus("Đang xóa sản phẩm...", "info");
  try {
    await window.focusStorefront.request(`/admin/products/${productId}`, {
      method: "DELETE",
      withCart: false,
    });
    state.products = state.products.filter((product) => String(product.id) !== String(productId));
    if (String(state.activeProductId) === String(productId)) {
      closeProductModal();
    }
    await refreshCatalogData();
    setStatus("Đã xóa sản phẩm.", "success");
  } catch (error) {
    setStatus(error.message || "Không thể xóa sản phẩm.", "error");
    setProductModalStatus(error.message || "Không thể xóa sản phẩm.", "error");
  }
}

export function bindProductEvents() {
  setProductViewMode("products");

  document.querySelectorAll("[data-product-view-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setProductViewMode(button.dataset.productViewMode);
    });
  });

  elements.productSearch?.addEventListener("input", renderProducts);
  elements.productCategoryFilter?.addEventListener("change", renderProducts);
  elements.createProductButton?.addEventListener("click", openCreateProductModal);
  elements.companyForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    createCompany();
  });

  elements.companiesBody?.addEventListener("click", (event) => {
    const renameButton = event.target.closest("[data-rename-company]");
    if (renameButton) {
      renameCompany(renameButton.dataset.renameCompany);
      return;
    }

    const deleteButton = event.target.closest("[data-delete-company]");
    if (deleteButton) {
      deleteCompany(deleteButton.dataset.deleteCompany);
    }
  });

  elements.productsBody?.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-product]");
    if (viewButton) {
      openProductDetail(viewButton.dataset.viewProduct);
      return;
    }
    const deleteButton = event.target.closest("[data-delete-product]");
    if (deleteButton) {
      deleteProduct(deleteButton.dataset.deleteProduct);
    }
  });

  elements.productModalBody?.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-product-detail-form]");
    if (!form) return;
    event.preventDefault();
    saveProductDetail();
  });

  elements.productModalBody?.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-product-modal]");
    if (closeButton) {
      closeProductModal();
      return;
    }
    const deleteActiveButton = event.target.closest("[data-delete-active-product]");
    if (deleteActiveButton) {
      deleteProduct(state.activeProductId);
      return;
    }
    const uploadButton = event.target.closest("[data-upload-product-image]");
    if (uploadButton) {
      uploadSelectedProductImages();
      return;
    }
    const setThumbnailButton = event.target.closest("[data-set-thumbnail]");
    if (setThumbnailButton) {
      const input = elements.productModalBody?.querySelector('[name="thumbnailUrl"]');
      if (input) {
        input.value = setThumbnailButton.dataset.setThumbnail || "";
        updatePreviewImage();
      }
      return;
    }
    const removeImageButton = event.target.closest("[data-remove-image]");
    if (removeImageButton) {
      const imageUrl = String(removeImageButton.dataset.removeImage || "");
      state.productDetail = {
        ...(state.productDetail || createEmptyProductDraft()),
        images: (state.productDetail?.images || []).filter((item) => item !== imageUrl),
      };
      if (state.productDetail.thumbnailUrl === imageUrl) {
        state.productDetail.thumbnailUrl = state.productDetail.images[0] || "";
      }
      renderProductModal();
      setProductModalStatus("Đã xóa ảnh khỏi danh sách chờ lưu.", "success");
      return;
    }
    const editorButton = event.target.closest("[data-editor-action]");
    if (editorButton) {
      runEditorAction(editorButton.dataset.editorAction, editorButton.dataset.editorTarget);
    }
  });

  elements.productModalBody?.addEventListener("input", (event) => {
    if (event.target.matches('[name="thumbnailUrl"]')) {
      updatePreviewImage();
      return;
    }
    if (event.target.matches("[data-product-category-select]")) {
      const companySelect = elements.productModalBody?.querySelector("[data-product-company-select]");
      const companies = getCompaniesByCategory(event.target.value);
      if (companySelect) {
        companySelect.innerHTML = buildCompanyOptions(event.target.value, companies[0]?.id || "");
      }
      return;
    }
    if (event.target.matches("[data-rich-editor]")) {
      normalizeEditorSurface(event.target);
    }
  });

  elements.productModalBody?.addEventListener(
    "blur",
    (event) => {
      if (event.target.matches("[data-rich-editor]")) {
        normalizeEditorSurface(event.target);
      }
    },
    true
  );
}
