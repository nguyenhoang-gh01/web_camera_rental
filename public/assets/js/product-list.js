const productPage = document.querySelector("[data-product-page]");

if (productPage) {
  const CATEGORY_OPTIONS = [
    {
      id: 1,
      slug: "thue-camera-may-anh",
      name: "Thuê Camera (Máy ảnh)",
      fallbackImage:
        "https://api.dathanhcamera.com/image/category/5c3cbcdd3c05d76fb8f17e41213be0fcd3193c3b268c79b2f1.jpeg",
    },
    {
      id: 5,
      slug: "thue-lens-ong-kinh",
      name: "Thuê Lens (Ống kính)",
      fallbackImage:
        "https://api.dathanhcamera.com/image/category/a1c2d01ca7e13205eaee2af1d4415b6f78e374e883a661761b.jpeg",
    },
    {
      id: 6,
      slug: "thue-phu-kien",
      name: "Thuê Phụ kiện",
      fallbackImage:
        "https://api.dathanhcamera.com/image/category/534273b8dd29a62bbc85f0de4f05e2a0f7feb51b3a27ae6cf3.jpeg",
    },
  ];

  const elements = {
    title: document.querySelector("[data-category-title]"),
    breadcrumb: document.querySelector("[data-category-breadcrumb]"),
    count: document.querySelector("[data-product-count]"),
    feedback: document.querySelector("[data-listing-feedback]"),
    form: document.querySelector("[data-filter-form]"),
    category: document.querySelector("[data-filter-category]"),
    company: document.querySelector("[data-filter-company]"),
    sort: document.querySelector("[data-filter-sort]"),
    search: document.querySelector("[data-filter-search]"),
    chips: document.querySelector("[data-brand-chips]"),
    status: document.querySelector("[data-listing-status]"),
    grid: document.querySelector("[data-product-grid]"),
  };

  const productCache = new Map();
  const companyCache = new Map();
  const numberFormatter = new Intl.NumberFormat("vi-VN");
  let feedbackTimer = 0;
  let activeLoadToken = 0;

  const state = {
    categorySlug: CATEGORY_OPTIONS[0].slug,
    companyId: "",
    sort: "asc",
    search: "",
    products: [],
    companies: [],
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

  const getCategoryConfig = (slug) =>
    CATEGORY_OPTIONS.find((item) => item.slug === slug) || CATEGORY_OPTIONS[0];

  const getCurrentCategory = () => getCategoryConfig(state.categorySlug);

  const getCategoryFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("category");
  };

  const updateLocation = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("category", state.categorySlug);
    window.history.replaceState({}, "", url);
  };

  const formatPrice = (value) => numberFormatter.format(Math.round(Number(value) || 0));

  const getSessionPrice = (product) => {
    const sessionPrice = Number(product?.sessionPrice);

    if (Number.isFinite(sessionPrice) && sessionPrice >= 0) {
      return sessionPrice;
    }

    return Math.round(((Number(product?.price) || 0) * 0.7) / 1000) * 1000;
  };

  const getProductImage = (product) =>
    product.thumbnailUrl ||
    product.images?.[0] ||
    getCategoryConfig(product.categorySlug || state.categorySlug).fallbackImage;

  const getCompanyLogo = (company) => company?.imageUrl || "";

  const getProductLink = (product) =>
    `./chi-tiet-san-pham.html?slug=${encodeURIComponent(product.slug)}`;

  const getCompanyById = (companyId) =>
    state.companies.find((item) => String(item.id) === String(companyId));

  const setStatus = (message, type = "loading") => {
    elements.status.hidden = false;
    elements.status.className = type === "error" ? "listing-empty" : "listing-loading";
    elements.status.textContent = message;
    elements.grid.hidden = true;
    elements.grid.innerHTML = "";
  };

  const setFeedback = (message, type = "success") => {
    if (!elements.feedback) {
      return;
    }

    window.clearTimeout(feedbackTimer);
    elements.feedback.hidden = false;
    elements.feedback.className = `listing-feedback is-${type}`;
    elements.feedback.textContent = message;

    feedbackTimer = window.setTimeout(() => {
      elements.feedback.hidden = true;
    }, 2800);
  };

  const syncHeader = () => {
    const category = getCurrentCategory();
    document.title = `${category.name} | ${window.SITE_CONTENT?.name || "FOCUS CAMERA"}`;
    elements.title.textContent = category.name;
    elements.breadcrumb.textContent = category.name;
  };

  const renderCategoryOptions = () => {
    elements.category.innerHTML = CATEGORY_OPTIONS.map(
      (item) => `<option value="${item.slug}">${escapeHtml(item.name)}</option>`
    ).join("");

    elements.category.value = state.categorySlug;
  };

  const renderCompanyOptions = () => {
    const options = ['<option value="">Tất cả các hãng</option>'];

    state.companies.forEach((company) => {
      options.push(
        `<option value="${company.id}">${escapeHtml(company.name || "Khác")}</option>`
      );
    });

    elements.company.innerHTML = options.join("");
    elements.company.value = state.companyId;
  };

  const renderBrandChips = () => {
    const chips = [
      `<button class="brand-chip${state.companyId ? "" : " is-active"}" type="button" data-company-id="">
        <span class="brand-chip-text">Tất cả các hãng</span>
      </button>`,
    ];

    state.companies.forEach((company) => {
      const logo = getCompanyLogo(company);
      const activeClass = String(company.id) === state.companyId ? " is-active" : "";
      const content = logo
        ? `<img src="${logo}" alt="${escapeHtml(company.name)}" loading="lazy" />`
        : `<span class="brand-chip-text">${escapeHtml(company.name || "Khác")}</span>`;

      chips.push(
        `<button class="brand-chip${activeClass}" type="button" data-company-id="${company.id}">
          ${content}
        </button>`
      );
    });

    elements.chips.innerHTML = chips.join("");
  };

  const getFilteredProducts = () => {
    const searchValue = state.search.trim().toLowerCase();
    const filtered = state.products.filter((product) => {
      const matchesCompany =
        !state.companyId || String(product.companyId) === String(state.companyId);
      const matchesSearch =
        !searchValue || String(product.name || "").toLowerCase().includes(searchValue);

      return matchesCompany && matchesSearch;
    });

    filtered.sort((first, second) => {
      const priceA = Number(first.price) || 0;
      const priceB = Number(second.price) || 0;
      return state.sort === "desc" ? priceB - priceA : priceA - priceB;
    });

    return filtered;
  };

  const renderProducts = () => {
    const products = getFilteredProducts();
    const totalProducts = state.products.length;

    elements.count.textContent =
      products.length === totalProducts
        ? `Hiển thị ${totalProducts} sản phẩm`
        : `Hiển thị ${products.length}/${totalProducts} sản phẩm`;

    if (!products.length) {
      setStatus("Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.", "error");
      return;
    }

    elements.status.hidden = true;
    elements.grid.hidden = false;
    elements.grid.innerHTML = products
      .map((product) => {
        const company = getCompanyById(product.companyId);
        const companyLogo = getCompanyLogo(company) || product.companyImageUrl || "";
        const productName = escapeHtml(product.name);
        const imageUrl = getProductImage(product);
        const link = getProductLink(product);

        return `
          <article class="product-card">
            <div class="product-card-top">
              ${
                companyLogo
                  ? `<span class="product-brand">
                      <img src="${companyLogo}" alt="${escapeHtml(company?.name || product.companyName || "Logo hãng")}" loading="lazy" />
                    </span>`
                  : `<span class="product-brand product-brand-text">${escapeHtml(company?.name || product.companyName || "Khác")}</span>`
              }
              <span class="product-rating" aria-hidden="true">★★★★★</span>
            </div>

            <a class="product-image" href="${link}" target="_blank" rel="noreferrer">
              <img src="${imageUrl}" alt="${productName}" loading="lazy" />
            </a>

            <a class="product-name" href="${link}" target="_blank" rel="noreferrer">
              <h2>${productName}</h2>
            </a>

            <div class="product-price">
              <div class="product-price-group">
                <p>${formatPrice(getSessionPrice(product))} <span>đ/buổi</span></p>
                <p>${formatPrice(product.price)} <span>đ/ngày</span></p>
              </div>

              <button class="rent-button" type="button" data-add-to-cart="${escapeHtml(product.slug)}">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 4H3v2h2.2l2.1 9.2a2 2 0 0 0 2 1.6h8.8v-2H9.3l-.4-1.8h9.6l2.1-6.2H8.4L7.9 4.6A1 1 0 0 0 7 4Zm4 4h2v2h2v2h-2v2h-2v-2H9v-2h2Z"
                  />
                </svg>
                <span>Thêm vào giỏ</span>
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const fetchCompanies = async (categorySlug) => {
    if (companyCache.has(categorySlug)) {
      return companyCache.get(categorySlug);
    }

    const response = await fetch(
      `/api/companies?category=${encodeURIComponent(categorySlug)}`
    );
    const json = await response.json();
    const companies = Array.isArray(json?.companies) ? json.companies : [];
    companyCache.set(categorySlug, companies);
    return companies;
  };

  const fetchProducts = async (categorySlug) => {
    if (productCache.has(categorySlug)) {
      return productCache.get(categorySlug);
    }

    const response = await fetch(`/api/products?category=${encodeURIComponent(categorySlug)}`);
    const json = await response.json();
    const products = Array.isArray(json?.products) ? json.products : [];

    productCache.set(categorySlug, products);
    return products;
  };

  const loadCategory = async (categorySlug) => {
    const category = getCategoryConfig(categorySlug);
    const loadToken = ++activeLoadToken;

    state.categorySlug = category.slug;
    state.companyId = "";
    state.sort = "asc";
    state.search = "";
    state.products = [];
    state.companies = [];

    syncHeader();
    updateLocation();
    renderCategoryOptions();
    renderCompanyOptions();
    renderBrandChips();
    elements.sort.value = "asc";
    elements.search.value = "";
    elements.count.textContent = "Đang tải sản phẩm...";
    setStatus("Đang tải sản phẩm...");

    try {
      const [products, companies] = await Promise.all([
        fetchProducts(category.slug),
        fetchCompanies(category.slug),
      ]);

      if (loadToken !== activeLoadToken) {
        return;
      }

      state.products = products;
      state.companies = companies;

      renderCompanyOptions();
      renderBrandChips();
      renderProducts();
    } catch (error) {
      if (loadToken !== activeLoadToken) {
        return;
      }

      console.error(error);
      elements.count.textContent = "Không thể tải sản phẩm";
      setStatus("Không thể tải danh sách sản phẩm lúc này.", "error");
    }
  };

  elements.form?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  elements.category?.addEventListener("change", (event) => {
    loadCategory(event.target.value);
  });

  elements.company?.addEventListener("change", (event) => {
    state.companyId = event.target.value;
    renderBrandChips();
    renderProducts();
  });

  elements.sort?.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderProducts();
  });

  elements.search?.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderProducts();
  });

  elements.chips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-company-id]");

    if (!button) {
      return;
    }

    state.companyId = button.dataset.companyId || "";
    elements.company.value = state.companyId;
    renderBrandChips();
    renderProducts();
  });

  elements.grid?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-add-to-cart]");

    if (!button || !window.focusStorefront) {
      return;
    }

    const buttonLabel = button.querySelector("span");
    const originalLabel = buttonLabel?.textContent || "Thêm vào giỏ";

    button.disabled = true;

    if (buttonLabel) {
      buttonLabel.textContent = "Đang thêm...";
    }

    try {
      await window.focusStorefront.request("/cart/items", {
        method: "POST",
        body: {
          productSlug: button.dataset.addToCart,
          rentalDays: 1,
          rentalStart: new Date().toISOString(),
        },
      });

      button.classList.add("is-added");

      if (buttonLabel) {
        buttonLabel.textContent = "Đã thêm";
      }

      setFeedback("Đã thêm sản phẩm vào giỏ hàng.", "success");

      window.setTimeout(() => {
        button.classList.remove("is-added");

        if (buttonLabel) {
          buttonLabel.textContent = originalLabel;
        }
      }, 1800);
    } catch (error) {
      if (buttonLabel) {
        buttonLabel.textContent = originalLabel;
      }

      setFeedback(error.message || "Không thể thêm sản phẩm vào giỏ hàng.", "error");
    } finally {
      window.setTimeout(() => {
        button.disabled = false;
      }, 250);
    }
  });

  loadCategory(getCategoryFromQuery());
}
