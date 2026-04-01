const cartPage = document.querySelector("[data-cart-page]");

if (cartPage) {
  const statusElement = document.querySelector("[data-cart-status]");
  const layoutElement = document.querySelector("[data-cart-layout]");
  const listElement = document.querySelector("[data-cart-list]");
  const emptyElement = document.querySelector("[data-cart-empty]");
  const countElement = document.querySelector("[data-cart-count]");
  const summaryCountElement = document.querySelector("[data-cart-summary-count]");
  const subtotalElement = document.querySelector("[data-cart-subtotal]");
  const totalElement = document.querySelector("[data-cart-total]");
  const couponForm = document.querySelector("[data-cart-coupon-form]");
  const couponNote = document.querySelector("[data-cart-coupon-note]");
  const checkoutButton = document.querySelector("[data-cart-checkout]");
  const numberFormatter = new Intl.NumberFormat("vi-VN");

  const formatPrice = (value) => `${numberFormatter.format(Math.round(Number(value) || 0))} đ`;

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entityMap[character] || character;
    });

  const toLocalDateTimeValue = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const toDisplayDateTime = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const buildRentalOptions = (selectedValue) =>
    Array.from({ length: 30 }, (_, index) => {
      const value = index + 1;
      const selected = Number(selectedValue) === value ? " selected" : "";
      return `<option value="${value}"${selected}>${value} ngày</option>`;
    }).join("");

  const setStatus = (message, type = "info") => {
    if (!statusElement) {
      return;
    }

    statusElement.hidden = false;
    statusElement.className = `cart-status is-${type}`;
    statusElement.textContent = message;
  };

  const clearStatus = () => {
    if (!statusElement) {
      return;
    }

    statusElement.hidden = true;
  };

  const setSummary = (cart) => {
    const itemCount = cart.items.length;

    if (countElement) {
      countElement.textContent = `${itemCount} sản phẩm`;
    }

    if (summaryCountElement) {
      summaryCountElement.textContent = String(itemCount);
    }

    if (subtotalElement) {
      subtotalElement.textContent = formatPrice(cart.totalPrice);
    }

    if (totalElement) {
      totalElement.textContent = formatPrice(cart.totalPrice);
    }
  };

  const renderCartItems = (cart) => {
    if (!listElement || !emptyElement || !layoutElement) {
      return;
    }

    layoutElement.hidden = false;
    setSummary(cart);

    if (!cart.items.length) {
      listElement.innerHTML = "";
      emptyElement.hidden = false;
      setStatus("Giỏ hàng của bạn đang trống.");
      return;
    }

    clearStatus();
    emptyElement.hidden = true;
    listElement.innerHTML = cart.items
      .map((item) => {
        const sessionPrice = Math.round((Number(item.price) * 0.7) / 1000) * 1000;
        const productHref = `./chi-tiet-san-pham.html?slug=${encodeURIComponent(item.productSlug)}`;

        return `
          <article class="cart-item-card" data-cart-item="${item.id}">
            <div class="cart-item-order">${item.index}</div>

            <a class="cart-item-media" href="${productHref}">
              <img
                src="${escapeHtml(item.imageUrl || "")}"
                alt="${escapeHtml(item.productName)}"
                loading="lazy"
              />
            </a>

            <div class="cart-item-content">
              <div class="cart-item-head">
                <div>
                  <a class="cart-item-name" href="${productHref}">
                    ${escapeHtml(item.productName)}
                  </a>
                  <p class="cart-item-meta">
                    Cập nhật linh hoạt thời gian thuê để nhận tạm tính chính xác hơn.
                  </p>
                </div>
                <button class="cart-remove-button" type="button" data-cart-remove="${item.id}">
                  Xóa
                </button>
              </div>

              <div class="cart-item-prices">
                <p>${formatPrice(sessionPrice)}<span>/buổi</span></p>
                <p>${formatPrice(item.price)}<span>/ngày</span></p>
              </div>

              <div class="cart-item-controls">
                <label class="cart-control-field">
                  <span>Thời điểm thuê</span>
                  <input
                    type="datetime-local"
                    value="${toLocalDateTimeValue(item.rentalStart)}"
                    data-cart-rental-start="${item.id}"
                  />
                </label>

                <label class="cart-control-field cart-control-field-small">
                  <span>Số ngày thuê</span>
                  <select data-cart-rental-days="${item.id}">
                    ${buildRentalOptions(item.rentalDays)}
                  </select>
                </label>
              </div>

              <div class="cart-item-footer">
                <p>Nhận thiết bị: <strong>${escapeHtml(toDisplayDateTime(item.rentalStart))}</strong></p>
                <p class="cart-item-total">Tạm tính: <strong>${formatPrice(item.totalPrice)}</strong></p>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const renderCart = (cart) => {
    renderCartItems(cart);
  };

  const loadCart = async () => {
    setStatus("Đang tải giỏ hàng...");

    try {
      const json = await window.focusStorefront.request("/cart");
      renderCart(json.cart);
    } catch (error) {
      setStatus(error.message, "error");
    }
  };

  const updateCartItem = async (itemId, payload) => {
    setStatus("Đang cập nhật giỏ hàng...");

    try {
      const json = await window.focusStorefront.request(`/cart/items/${itemId}`, {
        method: "PATCH",
        body: payload,
      });
      renderCart(json.cart);
    } catch (error) {
      setStatus(error.message, "error");
    }
  };

  listElement?.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("[data-cart-remove]");

    if (!removeButton) {
      return;
    }

    setStatus("Đang xóa sản phẩm khỏi giỏ hàng...");

    try {
      const json = await window.focusStorefront.request(
        `/cart/items/${removeButton.dataset.cartRemove}`,
        {
          method: "DELETE",
        }
      );
      renderCart(json.cart);
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  listElement?.addEventListener("change", async (event) => {
    const daysField = event.target.closest("[data-cart-rental-days]");
    const startField = event.target.closest("[data-cart-rental-start]");

    if (!daysField && !startField) {
      return;
    }

    const itemCard = event.target.closest("[data-cart-item]");

    if (!itemCard) {
      return;
    }

    const itemId = itemCard.dataset.cartItem;
    const rentalDays = itemCard.querySelector("[data-cart-rental-days]")?.value || "1";
    const rentalStart = itemCard.querySelector("[data-cart-rental-start]")?.value || "";

    await updateCartItem(itemId, {
      rentalDays,
      rentalStart,
    });
  });

  couponForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (couponNote) {
      couponNote.textContent =
        "Mã giảm giá sẽ được kiểm tra ở bước xử lý đơn thuê tiếp theo.";
    }

    setStatus("Đã ghi nhận mã giảm giá. Bạn có thể hoàn tất đơn thuê ngay khi hồ sơ đã đủ CCCD 2 mặt.");
  });

  checkoutButton?.addEventListener("click", async () => {
    checkoutButton.disabled = true;
    setStatus("Đang tạo đơn thuê...", "info");

    try {
      const json = await window.focusStorefront.request("/rentals/checkout", {
        method: "POST",
      });

      renderCart(json.cart);
      setStatus(
        `Đã tạo đơn thuê ${json.order?.orderCode || ""}. Đang chuyển tới lịch sử thuê...`,
        "success"
      );

      window.setTimeout(() => {
        window.location.href = "./tai-khoan.html#lich-su-thue";
      }, 900);
    } catch (error) {
      const message = String(error.message || "");

      if (/đăng nhập/i.test(message)) {
        setStatus("Vui lòng đăng nhập trước khi tạo đơn thuê.", "error");
        window.setTimeout(() => {
          window.location.href = "./dang-nhap.html";
        }, 900);
      } else if (/CCCD/i.test(message)) {
        setStatus(message, "error");
        window.setTimeout(() => {
          window.location.href = "./tai-khoan.html#thong-tin-tai-khoan";
        }, 1200);
      } else {
        setStatus(message, "error");
      }
    } finally {
      checkoutButton.disabled = false;
    }
  });

  loadCart();
}
