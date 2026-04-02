import {
  activateTab,
  closeProductModal,
  closeRenterModal,
  elements,
  state,
} from "./state.js";
import { bindOrderEvents, renderOrders, renderStatusOptions, renderSummary } from "./orders.js";
import { bindProductEvents, renderCategoryOptions, renderProducts } from "./products.js";
import { bindReviewEvents, renderReviews } from "./reviews.js";
import { bindRenterEvents, renderRenters } from "./renters.js";
import { setStatus } from "./utils.js";

let hasBoundEvents = false;

function redirectTo(path) {
  window.location.href = path;
}

async function ensureAdminAccess() {
  const storedUser = window.focusStorefront?.getAuthUser?.() || null;

  if (!storedUser) {
    redirectTo("./dang-nhap.html");
    return false;
  }

  try {
    const response = await window.focusStorefront.request("/auth/me", {
      withCart: false,
    });
    const user = response?.user || null;

    if (!user) {
      redirectTo("./dang-nhap.html");
      return false;
    }

    if (!(user.isAdmin || user.role === "admin")) {
      redirectTo("./tai-khoan.html");
      return false;
    }

    return true;
  } catch (error) {
    window.focusStorefront?.clearAuthSession?.();
    redirectTo("./dang-nhap.html");
    return false;
  }
}

function hydrateDashboardState(payload = {}) {
  state.summary = payload.summary || {};
  state.statusOptions = Array.isArray(payload.statusOptions) ? payload.statusOptions : [];
  state.orders = Array.isArray(payload.orders) ? payload.orders : [];
  state.products = Array.isArray(payload.products) ? payload.products : [];
  state.renters = Array.isArray(payload.renters) ? payload.renters : [];
  state.categories = Array.isArray(payload.categories) ? payload.categories : [];
  state.companies = Array.isArray(payload.companies) ? payload.companies : [];
  state.reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
}

function renderDashboard() {
  renderSummary();
  renderStatusOptions();
  renderCategoryOptions();
  renderOrders();
  renderProducts();
  renderRenters();
  renderReviews();
}

export async function loadDashboard() {
  setStatus("Dang tai du lieu quan tri...", "info");

  try {
    const dashboard = await window.focusStorefront.request("/admin/dashboard", {
      withCart: false,
    });

    hydrateDashboardState(dashboard);
    renderDashboard();
    setStatus("Du lieu quan tri da san sang.", "success");
  } catch (error) {
    const message = String(error.message || "");

    if (/dang nhap|401/i.test(message)) {
      redirectTo("./dang-nhap.html");
      return;
    }

    if (/quyen|403/i.test(message)) {
      redirectTo("./tai-khoan.html");
      return;
    }

    setStatus(message || "Khong the tai du lieu quan tri.", "error");
  }
}

function bindTabEvents() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.adminTab || "orders");
    });
  });
}

function bindModalEvents() {
  elements.productModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeProductModal);
  });

  elements.renterModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeRenterModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (elements.productModal && !elements.productModal.hidden) {
      closeProductModal();
      return;
    }

    if (elements.renterModal && !elements.renterModal.hidden) {
      closeRenterModal();
    }
  });
}

function bindSharedEvents() {
  if (hasBoundEvents) {
    return;
  }

  hasBoundEvents = true;
  bindTabEvents();
  bindModalEvents();
  bindOrderEvents();
  bindProductEvents();
  bindRenterEvents();
  bindReviewEvents();

  elements.refreshButton?.addEventListener("click", () => {
    loadDashboard();
  });
}

async function initializeAdminPage() {
  if (!elements.page || !window.focusStorefront) {
    return;
  }

  activateTab("orders");
  bindSharedEvents();

  const hasAccess = await ensureAdminAccess();
  if (!hasAccess) {
    return;
  }

  await loadDashboard();
}

initializeAdminPage();
