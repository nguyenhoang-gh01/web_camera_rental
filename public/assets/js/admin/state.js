export const elements = {
  page: document.querySelector("[data-admin-page]"),
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
  createProductButton: document.querySelector("[data-create-product]"),
  productsBody: document.querySelector("[data-admin-products-body]"),
  renterSearch: document.querySelector("[data-renter-search]"),
  rentersGrid: document.querySelector("[data-admin-renters-grid]"),
  productModal: document.querySelector("[data-product-modal]"),
  productModalTitle: document.querySelector("#admin-product-modal-title"),
  productModalStatus: document.querySelector("[data-product-detail-status]"),
  productModalBody: document.querySelector("[data-product-detail-body]"),
  productModalCloseButtons: document.querySelectorAll("[data-close-product-modal]"),
  renterModal: document.querySelector("[data-renter-modal]"),
  renterDetailBody: document.querySelector("[data-renter-detail-body]"),
  renterModalCloseButtons: document.querySelectorAll("[data-close-renter-modal]"),
};

export const statusLabels = {
  pending: "Cho xu ly",
  confirmed: "Da xac nhan",
  renting: "Dang cho thue",
  completed: "Hoan tat",
  cancelled: "Da huy",
};

export const state = {
  statusOptions: [],
  summary: {},
  orders: [],
  products: [],
  categories: [],
  companies: [],
  renters: [],
  activeProductId: "",
  activeRenter: null,
  productDetail: null,
  productModalMode: "edit",
};

export function activateTab(tabName) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminTab === tabName);
  });
  elements.panels.forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== tabName;
  });
}

export function openProductModal() {
  if (!elements.productModal) return;
  elements.productModal.hidden = false;
  document.body.style.overflow = "hidden";
}

export function closeProductModal() {
  if (!elements.productModal) return;
  elements.productModal.hidden = true;
  document.body.style.overflow = "";
  state.activeProductId = "";
  state.productDetail = null;
  state.productModalMode = "edit";
}

export function openRenterModal() {
  if (!elements.renterModal) return;
  elements.renterModal.hidden = false;
  document.body.style.overflow = "hidden";
}

export function closeRenterModal() {
  if (!elements.renterModal) return;
  elements.renterModal.hidden = true;
  document.body.style.overflow = "";
}
