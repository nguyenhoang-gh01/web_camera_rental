import { elements } from "./state.js";

const moneyFormatter = new Intl.NumberFormat("vi-VN");

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character] || character;
  });
}

export function formatPrice(value) {
  return `${moneyFormatter.format(Math.round(Number(value) || 0))} đ`;
}

export function setStatus(message, type = "info") {
  if (!elements.status) return;
  elements.status.className = `admin-status is-${type}`;
  elements.status.textContent = message;
}

export function setProductModalStatus(message, type = "info") {
  if (!elements.productModalStatus) return;
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

export function getEditorToolbarMarkup(editorName) {
  const items = [
    ["heading", "H2"],
    ["paragraph", "Đoạn"],
    ["bold", "Đậm"],
    ["italic", "Nghiêng"],
    ["unorderedList", "• Danh sách"],
    ["orderedList", "1. Danh sách"],
    ["link", "Gắn link"],
    ["clear", "Xóa định dạng"],
  ];
  return items
    .map(
      ([action, label]) =>
        `<button type="button" class="admin-rich-editor__tool" data-editor-action="${action}" data-editor-target="${editorName}">${label}</button>`
    )
    .join("");
}

export function getEditorSurface(name) {
  return elements.productModalBody?.querySelector(`[data-rich-editor="${name}"]`) || null;
}

export function normalizeEditorSurface(surface) {
  if (!surface) return;
  const text = String(surface.textContent || "").replace(/\u00a0/g, " ").trim();
  if (!text && !surface.querySelector("img,iframe,ul,ol,h1,h2,h3,h4,h5,h6")) {
    surface.innerHTML = "";
  }
}

export function setEditorValue(name, html) {
  const surface = getEditorSurface(name);
  if (!surface) return;
  surface.innerHTML = String(html || "").trim();
  normalizeEditorSurface(surface);
}

export function getEditorValue(name) {
  const surface = getEditorSurface(name);
  if (!surface) return "";
  normalizeEditorSurface(surface);
  return String(surface.innerHTML || "").trim();
}

export function runEditorAction(action, editorName) {
  const surface = getEditorSurface(editorName);
  if (!surface) return;
  surface.focus();
  if (action === "heading") return document.execCommand("formatBlock", false, "h2");
  if (action === "paragraph") return document.execCommand("formatBlock", false, "p");
  if (action === "bold") return document.execCommand("bold", false);
  if (action === "italic") return document.execCommand("italic", false);
  if (action === "unorderedList") return document.execCommand("insertUnorderedList", false);
  if (action === "orderedList") return document.execCommand("insertOrderedList", false);
  if (action === "link") {
    const url = window.prompt("Nhập đường dẫn liên kết:", "https://");
    if (url) document.execCommand("createLink", false, url);
    return;
  }
  if (action === "clear") document.execCommand("removeFormat", false);
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const [, base64 = ""] = result.split(",");
      resolve({
        fileName: file.name,
        contentType: file.type,
        data: base64,
      });
    };
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh đã chọn."));
    reader.readAsDataURL(file);
  });
}
