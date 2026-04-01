const SITE_CONTENT = Object.freeze({
  name: "FOCUS CAMERA",
  slogan: "Focus Camera – Focus on You",
  phoneRaw: "0123456789",
  phoneDisplay: "0123.456.789",
  addressDisplay: "Số 102 Xô Viết Nghệ Tĩnh, Hòa Cường, Đà Nẵng",
  fanpageLabel: "FOCUS CAMERA - Cho thuê máy ảnh, lens, phụ kiện ở Đà Nẵng",
  fanpageHref: "#",
  appStoreImage: "https://dathanhcamera.com/assets/img/appstore.svg",
  playStoreImage: "https://dathanhcamera.com/assets/img/googleplay.svg",
});

window.SITE_CONTENT = SITE_CONTENT;

function getPageId(element) {
  return element.dataset.page || document.body.dataset.page || "";
}

function getStoredUser() {
  try {
    const rawUser = window.localStorage.getItem("focusAuthUser");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
}

function isAdminUser(user) {
  return Boolean(user && (user.isAdmin || user.role === "admin"));
}

function buildAccountNav(storedUser, accountActive) {
  if (!storedUser) {
    return `
      <a href="./dang-nhap.html" class="account-link${accountActive ? " nav-link-active" : ""}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.2c-4 0-7.3 2.1-8.2 5.1c-.2.6.3 1.2.9 1.2h14.6c.7 0 1.1-.6.9-1.2c-.9-3-4.2-5.1-8.2-5.1Z"
          />
        </svg>
        <span>Đăng nhập / Đăng ký</span>
      </a>
    `;
  }

  const shortName = storedUser.fullName?.split(" ").slice(-1)[0] || "Bạn";
  const adminLink = isAdminUser(storedUser) ? '<a href="./admin.html">Quản trị</a>' : "";

  return `
    <div class="nav-item has-dropdown account-dropdown">
      <button type="button" class="nav-trigger account-trigger${accountActive ? " nav-link-active" : ""}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.2c-4 0-7.3 2.1-8.2 5.1c-.2.6.3 1.2.9 1.2h14.6c.7 0 1.1-.6.9-1.2c-.9-3-4.2-5.1-8.2-5.1Z"
          />
        </svg>
        <span>Hi! ${shortName}</span>
        <span class="caret"></span>
      </button>
      <div class="dropdown-menu account-menu">
        <a href="./tai-khoan.html">Thông tin tài khoản</a>
        <a href="./tai-khoan.html#doi-mat-khau">Đổi mật khẩu</a>
        <a href="./tai-khoan.html#lich-su-thue">Lịch sử thuê</a>
        ${adminLink}
        <button type="button" data-header-logout>Đăng xuất</button>
      </div>
    </div>
  `;
}

function buildHeader(page) {
  const aboutActive = page === "about";
  const serviceActive = page === "listing" || page === "detail";
  const policyActive = page === "policy";
  const contactActive = page === "contact";
  const cartActive = page === "cart";
  const storedUser = getStoredUser();
  const accountActive =
    page === "account" ||
    page === "admin" ||
    (!storedUser && (page === "login" || page === "register"));

  return `
    <header class="site-header">
      <div class="container header-inner">
        <button
          class="icon-button mobile-only"
          type="button"
          aria-label="Mở menu"
          data-menu-toggle
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <a class="brand" href="./index.html" aria-label="${SITE_CONTENT.name}">
          <span class="brand-mark" aria-hidden="true">
            <img src="./assets/images/icon_web_index.png" alt="" class="brand-logo-image" />
          </span>
          <span class="brand-copy">
            <span class="brand-name">${SITE_CONTENT.name}</span>
            <span class="brand-tagline">${SITE_CONTENT.slogan}</span>
          </span>
        </a>

        <nav class="main-nav" data-menu>
          <a href="./gioi-thieu.html"${aboutActive ? ' class="nav-link-active"' : ""}>Giới thiệu</a>
          <div class="nav-item has-dropdown">
            <button type="button" class="nav-trigger${serviceActive ? " nav-link-active" : ""}">
              Dịch vụ cho thuê
              <span class="caret"></span>
            </button>
            <div class="dropdown-menu">
              <a href="./danh-muc.html?category=thue-camera-may-anh">Thuê Camera (Máy ảnh)</a>
              <a href="./danh-muc.html?category=thue-phu-kien">Thuê Phụ kiện</a>
            </div>
          </div>
          <a href="./chinh-sach.html"${policyActive ? ' class="nav-link-active"' : ""}>Chính sách</a>
          <a href="./lien-he.html"${contactActive ? ' class="nav-link-active"' : ""}>Liên hệ</a>
          <a href="./gio-hang.html" class="nav-icon cart-link${cartActive ? " nav-icon-active" : ""}" aria-label="Giỏ hàng">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 4H3v2h2.2l2.1 9.2a2 2 0 0 0 2 1.6h8.8v-2H9.3l-.4-1.8h9.6l2.1-6.2H8.4L7.9 4.6A1 1 0 0 0 7 4Zm2.5 15.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3Z"
              />
            </svg>
            <span class="cart-badge">0</span>
          </a>
          ${buildAccountNav(storedUser, accountActive)}
        </nav>

        <button class="icon-search mobile-only" type="button" aria-label="Tìm kiếm">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10.5 4a6.5 6.5 0 1 0 3.9 11.7l4 4l1.4-1.4l-4-4A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9a4.5 4.5 0 0 1 0-9Z"
            />
          </svg>
        </button>
      </div>
    </header>
  `;
}

function buildFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-main">
        <div class="container footer-inner">
          <a class="footer-brand" href="./index.html" aria-label="${SITE_CONTENT.name}">
            <span class="footer-brand-mark" aria-hidden="true">
              <img src="./assets/images/icon_web_index.png" alt="" class="footer-brand-logo-image" />
            </span>
            <span class="footer-brand-copy">
              <span class="footer-brand-name">${SITE_CONTENT.name}</span>
              <span class="footer-brand-slogan">${SITE_CONTENT.slogan}</span>
            </span>
          </a>

          <div class="footer-about">
            <p class="footer-slogan">${SITE_CONTENT.slogan}</p>
            <p>
              Hotline:
              <a href="tel:${SITE_CONTENT.phoneRaw}">${SITE_CONTENT.phoneDisplay}</a>
            </p>
            <p>Địa chỉ: ${SITE_CONTENT.addressDisplay}</p>
          </div>

          <div class="store-badges">
            <img
              src="${SITE_CONTENT.appStoreImage}"
              alt="Tải app trên App Store"
              loading="lazy"
            />
            <img
              src="${SITE_CONTENT.playStoreImage}"
              alt="Tải app trên Google Play"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </footer>
  `;
}

function setCartBadgeCount(count) {
  document.querySelectorAll(".cart-badge").forEach((badge) => {
    badge.textContent = String(Math.max(0, Number(count) || 0));
  });
}

async function syncCartBadge(detail = {}) {
  const cart = detail?.cart;

  if (cart && Array.isArray(cart.items)) {
    setCartBadgeCount(cart.items.length);
    return;
  }

  const cartToken = window.localStorage.getItem("focusCartToken") || "";

  if (!cartToken) {
    setCartBadgeCount(0);
    return;
  }

  try {
    const response = await fetch("/api/cart", {
      headers: {
        "X-Cart-Token": cartToken,
      },
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      setCartBadgeCount(0);
      return;
    }

    setCartBadgeCount(Array.isArray(json?.cart?.items) ? json.cart.items.length : 0);
  } catch (error) {
    setCartBadgeCount(0);
  }
}

async function handleHeaderLogout() {
  try {
    if (window.focusStorefront) {
      await window.focusStorefront.request("/auth/logout", {
        method: "POST",
        withCart: false,
      });
      window.focusStorefront.clearAuthSession();
    }
  } catch (error) {
    window.focusStorefront?.clearAuthSession();
  } finally {
    window.location.href = "./dang-nhap.html";
  }
}

class SiteHeaderElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = buildHeader(getPageId(this));
    this.addEventListener("click", async (event) => {
      const logoutButton = event.target.closest("[data-header-logout]");

      if (!logoutButton) {
        return;
      }

      event.preventDefault();
      await handleHeaderLogout();
    });

    queueMicrotask(() => {
      syncCartBadge();
    });
  }
}

class SiteFooterElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = buildFooter();
  }
}

if (!customElements.get("site-header")) {
  customElements.define("site-header", SiteHeaderElement);
}

if (!customElements.get("site-footer")) {
  customElements.define("site-footer", SiteFooterElement);
}

window.addEventListener("focus-cart:changed", (event) => {
  syncCartBadge(event.detail || {});
});

window.addEventListener("storage", (event) => {
  if (event.key === "focusCartToken") {
    syncCartBadge();
  }
});
