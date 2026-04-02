import { elements, state, statusLabels } from "./state.js";
import { escapeHtml, formatPrice, setStatus } from "./utils.js";

export function renderSummary() {
  elements.summaryOrders.textContent = String(state.summary?.totalOrders || 0);
  elements.summaryPending.textContent = String(state.summary?.pendingOrders || 0);
  elements.summaryRenters.textContent = String(state.summary?.totalRenters || 0);
  elements.summaryProducts.textContent = String(state.summary?.totalProducts || 0);
  elements.summaryRevenue.textContent = formatPrice(state.summary?.totalRevenue || 0);
  if (elements.summaryReviews) {
    elements.summaryReviews.textContent = String(state.summary?.featuredReviews || 0);
  }
}

export function renderStatusOptions() {
  const current = elements.orderStatusFilter.value || "";
  elements.orderStatusFilter.innerHTML = [
    '<option value="">Tất cả trạng thái</option>',
    ...state.statusOptions.map(
      (status) => `<option value="${status}">${escapeHtml(statusLabels[status] || status)}</option>`
    ),
  ].join("");
  elements.orderStatusFilter.value = current;
}

function getFilteredOrders() {
  const keyword = String(elements.orderSearch.value || "").trim().toLowerCase();
  const status = String(elements.orderStatusFilter.value || "");
  return state.orders.filter((order) => {
    const matchesStatus = !status || order.status === status;
    const searchable = [order.orderCode, order.renter?.fullName, order.renter?.phone, order.renter?.email]
      .join(" ")
      .toLowerCase();
    return matchesStatus && (!keyword || searchable.includes(keyword));
  });
}

export function renderOrders() {
  const orders = getFilteredOrders();
  if (!orders.length) {
    elements.ordersList.innerHTML = '<div class="admin-empty">Chưa có đơn thuê phù hợp với bộ lọc hiện tại.</div>';
    return;
  }

  elements.ordersList.innerHTML = orders
    .map((order) => {
      const optionHtml = state.statusOptions
        .map(
          (status) =>
            `<option value="${status}"${order.status === status ? " selected" : ""}>${escapeHtml(
              statusLabels[status] || status
            )}</option>`
        )
        .join("");

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

      return `
        <section class="admin-order-card">
          <div class="admin-order-head">
            <div>
              <h3>${escapeHtml(order.orderCode)}</h3>
              <p>Người thuê: ${escapeHtml(order.renter.fullName || "")} • ${escapeHtml(order.renter.phone || "")}</p>
            </div>
            <span class="admin-order-badge is-${escapeHtml(order.status)}">${escapeHtml(
              statusLabels[order.status] || order.status
            )}</span>
          </div>
          <div class="admin-order-grid">
            <div class="admin-order-meta"><strong>Liên hệ</strong><p>${escapeHtml(
              order.renter.email || "-"
            )}</p><p>${escapeHtml(order.renter.address || "Chưa cập nhật địa chỉ")}</p></div>
            <div class="admin-order-meta"><strong>Thông tin đơn</strong><p>${order.itemCount} sản phẩm</p><p>Tạo lúc ${new Date(
              order.createdAt
            ).toLocaleString("vi-VN")}</p></div>
            <div class="admin-order-meta"><strong>Tạm tính</strong><p>${formatPrice(
              order.totalPrice
            )}</p><p>CCCD: ${escapeHtml(order.renter.identityNumber || "Chưa cập nhật")}</p></div>
          </div>
          <div class="admin-order-items">${itemsHtml}</div>
          <div class="admin-order-actions">
            <select class="admin-order-status-select" data-order-status-select="${order.id}">${optionHtml}</select>
            <button type="button" data-save-order-status="${order.id}">Lưu trạng thái</button>
          </div>
        </section>
      `;
    })
    .join("");
}

export async function saveOrderStatus(orderId) {
  const select = document.querySelector(`[data-order-status-select="${orderId}"]`);
  if (!select) return;
  setStatus("Đang cập nhật trạng thái đơn thuê...", "info");
  try {
    const json = await window.focusStorefront.request(`/admin/orders/${orderId}`, {
      method: "PATCH",
      body: { status: select.value },
      withCart: false,
    });
    state.orders = state.orders.map((order) => (order.id === orderId ? json.order || order : order));
    renderOrders();
    setStatus("Đã cập nhật trạng thái đơn thuê.", "success");
  } catch (error) {
    setStatus(error.message || "Không thể cập nhật trạng thái đơn thuê.", "error");
  }
}

export function bindOrderEvents() {
  elements.orderSearch?.addEventListener("input", renderOrders);
  elements.orderStatusFilter?.addEventListener("change", renderOrders);
  elements.ordersList?.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save-order-status]");
    if (saveButton) saveOrderStatus(saveButton.dataset.saveOrderStatus);
  });
}
