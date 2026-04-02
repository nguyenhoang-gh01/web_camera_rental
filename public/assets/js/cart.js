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
  const paymentModal = document.querySelector("[data-cart-payment-modal]");
  const paymentQr = document.querySelector("[data-cart-payment-qr]");
  const paymentBankName = document.querySelector("[data-cart-payment-bank-name]");
  const paymentAccountNumber = document.querySelector("[data-cart-payment-account-number]");
  const paymentAccountName = document.querySelector("[data-cart-payment-account-name]");
  const paymentAmount = document.querySelector("[data-cart-payment-amount]");
  const paymentContent = document.querySelector("[data-cart-payment-content]");
  const paymentCloseButtons = document.querySelectorAll("[data-cart-payment-close]");
  const paymentCopyButtons = document.querySelectorAll("[data-cart-payment-copy]");
  const paymentHistoryLink = document.querySelector("[data-cart-payment-history]");
  const numberFormatter = new Intl.NumberFormat("vi-VN");
  let latestOrder = null;
  const RENTAL_OPTIONS = [
    { value: 0.5, label: "1 buổi" },
    { value: 1, label: "1 ngày" },
    { value: 2, label: "2 ngày" },
    { value: 3, label: "3 ngày" },
    { value: 6, label: "6 ngày" },
  ];

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
    RENTAL_OPTIONS.map((option) => {
      const selected = Number(selectedValue) === option.value ? " selected" : "";
      return `<option value="${option.value}"${selected}>${option.label}</option>`;
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

  const openPaymentModal = () => {
    if (!paymentModal) {
      return;
    }

    paymentModal.hidden = false;
    document.body.classList.add("modal-open");
  };

  const closePaymentModal = () => {
    if (!paymentModal) {
      return;
    }

    paymentModal.hidden = true;
    document.body.classList.remove("modal-open");
  };

  const renderPaymentModal = (order) => {
    latestOrder = order || null;

    if (!order?.payment) {
      return;
    }

    paymentQr.src = order.payment.qrUrl || "";
    paymentQr.alt = `Mã QR thanh toán cho đơn ${order.orderCode || ""}`.trim();
    paymentBankName.textContent = order.payment.bankName || "MB Bank";
    paymentAccountNumber.textContent =
      order.payment.accountNumberDisplay || order.payment.accountNumber || "";
    paymentAccountName.textContent = order.payment.accountName || "";
    paymentAmount.textContent = formatPrice(order.payment.amount || 0);
    paymentContent.textContent = order.payment.transferContent || "";

    if (paymentHistoryLink && order.id) {
      paymentHistoryLink.href = `./tai-khoan.html?order=${encodeURIComponent(order.id)}#lich-su-thue`;
    }
  };

  const copyPaymentValue = async (field) => {
    const payment = latestOrder?.payment;

    if (!payment) {
      return;
    }

    const value =
      field === "accountNumber"
        ? payment.accountNumberDisplay || payment.accountNumber || ""
        : payment.transferContent || "";

    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setStatus("Đã sao chép thông tin thanh toán.", "success");
    } catch (error) {
      setStatus("Không thể sao chép tự động. Vui lòng thử lại.", "error");
    }
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
                <p>${formatPrice(item.sessionPrice)}<span>/buổi</span></p>
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

  paymentCloseButtons.forEach((button) => {
    button.addEventListener("click", closePaymentModal);
  });

  paymentCopyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      copyPaymentValue(button.dataset.cartPaymentCopy);
    });
  });

  checkoutButton?.addEventListener("click", async () => {
    checkoutButton.disabled = true;
    setStatus("Đang tạo đơn thuê...", "info");

    try {
      const json = await window.focusStorefront.request("/rentals/checkout", {
        method: "POST",
      });

      renderCart(json.cart);
      renderPaymentModal(json.order);
      setStatus(
        `Đã tạo đơn thuê ${json.order?.orderCode || ""}. Bạn có thể thanh toán ngay bằng mã QR bên dưới.`,
        "success"
      );
      openPaymentModal();
    } catch (error) {
      const message = String(error.message || "");

      if (/đăng nhập|dang nhap/i.test(message)) {
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

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && paymentModal && !paymentModal.hidden) {
      closePaymentModal();
    }
  });

  loadCart();
}
