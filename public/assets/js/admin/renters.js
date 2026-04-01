import { elements, state, openRenterModal } from "./state.js";
import { escapeHtml, formatPrice } from "./utils.js";

function getDocumentPreviewMarkup(document) {
  if (!document?.href) return '<div class="admin-empty">Chưa có file tải lên.</div>';
  const href = String(document.href || "");
  const lowerHref = href.toLowerCase();
  const isPdf = lowerHref.endsWith(".pdf");
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerHref);
  if (isImage) {
    return `<div class="admin-renter-preview-card"><div class="admin-renter-preview-card__head"><strong>${escapeHtml(
      document.label
    )}</strong><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Mở file gốc</a></div><div class="admin-renter-preview-card__body"><img src="${escapeHtml(
      href
    )}" alt="${escapeHtml(document.label)}" loading="lazy" /></div></div>`;
  }
  if (isPdf) {
    return `<div class="admin-renter-preview-card"><div class="admin-renter-preview-card__head"><strong>${escapeHtml(
      document.label
    )}</strong><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Mở file gốc</a></div><div class="admin-renter-preview-card__body admin-renter-preview-card__body--pdf"><iframe src="${escapeHtml(
      href
    )}" title="${escapeHtml(document.label)}"></iframe></div></div>`;
  }
  return `<div class="admin-renter-preview-card"><div class="admin-renter-preview-card__head"><strong>${escapeHtml(
    document.label
  )}</strong><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Mở file gốc</a></div><div class="admin-renter-preview-card__body admin-renter-preview-card__body--file"><p>Không thể preview trực tiếp định dạng này trong trình duyệt.</p></div></div>`;
}

function getFilteredRenters() {
  const keyword = String(elements.renterSearch.value || "").trim().toLowerCase();
  return state.renters.filter((renter) => {
    const searchable = [renter.fullName, renter.phone, renter.email, renter.identityNumber]
      .join(" ")
      .toLowerCase();
    return !keyword || searchable.includes(keyword);
  });
}

export function renderRenters() {
  const renters = getFilteredRenters();
  if (!renters.length) {
    elements.rentersGrid.innerHTML = '<div class="admin-empty">Chưa có người thuê phù hợp với bộ lọc hiện tại.</div>';
    return;
  }

  elements.rentersGrid.innerHTML = renters
    .map((renter) => {
      const documents = [
        renter.documents.cccdFront ? { label: "CCCD mặt trước", href: renter.documents.cccdFront } : null,
        renter.documents.cccdBack ? { label: "CCCD mặt sau", href: renter.documents.cccdBack } : null,
        renter.documents.personalOther ? { label: "Giấy tờ khác", href: renter.documents.personalOther } : null,
      ].filter(Boolean);

      const docsHtml = documents.length
        ? documents
            .map(
              (document) =>
                `<a class="admin-renter-doc-chip" href="${escapeHtml(
                  document.href
                )}" target="_blank" rel="noreferrer">${escapeHtml(document.label)}</a>`
            )
            .join("")
        : '<span class="admin-renter-doc-empty">Chưa có giấy tờ</span>';

      return `<article class="admin-renter-card"><div class="admin-renter-row">
        <div class="admin-renter-col admin-renter-col--identity"><div class="admin-renter-avatar" aria-hidden="true">${escapeHtml(
          (renter.fullName || "?").trim().charAt(0).toUpperCase() || "?"
        )}</div><div class="admin-renter-identity-copy"><h3>${escapeHtml(
          renter.fullName
        )}</h3><p>Tạo lúc ${new Date(renter.createdAt).toLocaleDateString("vi-VN")}</p></div></div>
        <div class="admin-renter-col"><span class="admin-renter-col-label">Liên hệ</span><strong>${escapeHtml(
          renter.email || "Chưa cập nhật"
        )}</strong><p>${escapeHtml(renter.phone || "Chưa cập nhật")}</p></div>
        <div class="admin-renter-col"><span class="admin-renter-col-label">Hồ sơ</span><strong>${escapeHtml(
          renter.identityNumber || "Chưa có CCCD"
        )}</strong><p>${escapeHtml(renter.birthday || "Chưa cập nhật ngày sinh")}</p></div>
        <div class="admin-renter-col admin-renter-col--address"><span class="admin-renter-col-label">Địa chỉ / Mạng xã hội</span><strong>${escapeHtml(
          renter.address || "Chưa cập nhật địa chỉ"
        )}</strong><p>${escapeHtml(renter.facebookUrl || "Chưa có link Facebook/Zalo")}</p></div>
        <div class="admin-renter-col admin-renter-col--documents"><span class="admin-renter-col-label">Giấy tờ</span><div class="admin-renter-doc-list">${docsHtml}</div></div>
        <div class="admin-renter-col admin-renter-col--action"><span class="admin-renter-col-label">Thao tác</span><strong>${renter.totalOrders} đơn thuê</strong><p>${formatPrice(
          renter.totalSpent
        )}</p><span class="admin-renter-badge ${renter.verificationReady ? "is-ready" : "is-pending"}">${
          renter.verificationReady ? "Đủ CCCD" : "Thiếu CCCD"
        }</span><button class="admin-product-view" type="button" data-view-renter="${escapeHtml(
          renter.id
        )}">Xem chi tiết</button></div>
      </div></article>`;
    })
    .join("");
}

export function renderRenterModal() {
  const renter = state.activeRenter;
  if (!renter || !elements.renterDetailBody) return;
  const documents = [
    renter.documents.cccdFront ? { label: "CCCD mặt trước", href: renter.documents.cccdFront } : null,
    renter.documents.cccdBack ? { label: "CCCD mặt sau", href: renter.documents.cccdBack } : null,
    renter.documents.personalOther ? { label: "Giấy tờ khác", href: renter.documents.personalOther } : null,
  ].filter(Boolean);
  const docsHtml = documents.length
    ? documents.map((document) => getDocumentPreviewMarkup(document)).join("")
    : '<div class="admin-empty">Người dùng này chưa tải giấy tờ lên.</div>';

  elements.renterDetailBody.innerHTML = `<div class="admin-renter-detail"><section class="admin-renter-detail__summary"><div class="admin-renter-detail__identity"><div class="admin-renter-avatar admin-renter-avatar--large" aria-hidden="true">${escapeHtml(
    (renter.fullName || "?").trim().charAt(0).toUpperCase() || "?"
  )}</div><div><h3>${escapeHtml(renter.fullName || "Người thuê")}</h3><p>${escapeHtml(
    renter.email || "Chưa cập nhật email"
  )}</p></div></div><div class="admin-renter-detail__stats"><article class="admin-renter-detail-stat"><span>Tổng đơn thuê</span><strong>${renter.totalOrders}</strong></article><article class="admin-renter-detail-stat"><span>Tổng chi</span><strong>${formatPrice(
    renter.totalSpent
  )}</strong></article><article class="admin-renter-detail-stat"><span>Trạng thái hồ sơ</span><strong>${
    renter.verificationReady ? "Đã đủ CCCD" : "Thiếu CCCD"
  }</strong></article></div></section><section class="admin-renter-detail__section"><div class="admin-renter-detail__section-head"><strong>Preview CCCD và giấy tờ</strong></div><div class="admin-renter-preview-grid">${docsHtml}</div></section></div>`;
}

export function bindRenterEvents() {
  elements.renterSearch?.addEventListener("input", renderRenters);
  elements.rentersGrid?.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-renter]");
    if (!viewButton) return;
    const renter = state.renters.find((item) => String(item.id) === String(viewButton.dataset.viewRenter));
    if (!renter) return;
    state.activeRenter = renter;
    renderRenterModal();
    openRenterModal();
  });
}
