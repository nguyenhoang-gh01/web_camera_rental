const accountPage = document.querySelector("[data-account-page]");

if (accountPage) {
  const elements = {
    status: document.querySelector("[data-account-status]"),
    greeting: document.querySelector("[data-account-greeting]"),
    form: document.querySelector("[data-account-form]"),
    passwordForm: document.querySelector("[data-password-form]"),
    historyList: document.querySelector("[data-rental-history-list]"),
    paymentModal: document.querySelector("[data-payment-modal]"),
    paymentQr: document.querySelector("[data-payment-qr]"),
    paymentOrderCode: document.querySelector("[data-payment-order-code]"),
    paymentBankName: document.querySelector("[data-payment-bank-name]"),
    paymentAccountNumber: document.querySelector("[data-payment-account-number]"),
    paymentAccountName: document.querySelector("[data-payment-account-name]"),
    paymentAmount: document.querySelector("[data-payment-amount]"),
    paymentContent: document.querySelector("[data-payment-content]"),
    paymentNote: document.querySelector("[data-payment-note]"),
    paymentCloseButtons: document.querySelectorAll("[data-payment-close]"),
    paymentCopyButtons: document.querySelectorAll("[data-payment-copy]"),
    panels: document.querySelectorAll("[data-account-panel]"),
    tabButtons: document.querySelectorAll("[data-account-tab]"),
    readyPill: document.querySelector("[data-account-ready-pill]"),
    requirementNote: document.querySelector("[data-account-requirement-note]"),
    logoutButtons: document.querySelectorAll("[data-account-logout]"),
  };

  const documentMeta = {
    cccdFront: document.querySelector('[data-document-meta="cccdFront"]'),
    cccdBack: document.querySelector('[data-document-meta="cccdBack"]'),
    personalOther: document.querySelector('[data-document-meta="personalOther"]'),
  };

  const documentLinks = {
    cccdFront: document.querySelector('[data-document-link="cccdFront"]'),
    cccdBack: document.querySelector('[data-document-link="cccdBack"]'),
    personalOther: document.querySelector('[data-document-link="personalOther"]'),
  };

  const previewElements = {
    cccdFront: document.querySelector('[data-document-preview="cccdFront"]'),
    cccdBack: document.querySelector('[data-document-preview="cccdBack"]'),
    personalOther: document.querySelector('[data-document-preview="personalOther"]'),
  };

  const numberFormatter = new Intl.NumberFormat("vi-VN");
  let profileState = null;
  let rentalOrders = [];
  let activePaymentOrder = null;
  const autoOpenOrderId = new URLSearchParams(window.location.search).get("order") || "";

  function formatPrice(value) {
    return `${numberFormatter.format(Math.round(Number(value) || 0))} đ`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character] || character;
    });
  }

  function formatRentalDuration(value) {
    const rentalDays = Number(value) || 0;
    return rentalDays === 0.5 ? "1 buổi" : `${numberFormatter.format(rentalDays)} ngày`;
  }

  function formatOrderStatus(status) {
    const normalizedStatus = String(status || "").toLowerCase();
    const labels = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      completed: "Hoàn tất",
      cancelled: "Đã hủy",
    };

    return labels[normalizedStatus] || "Đang xử lý";
  }

  function clearAutoOpenOrderParam() {
    const url = new URL(window.location.href);
    url.searchParams.delete("order");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function getTabFromHash() {
    if (window.location.hash === "#doi-mat-khau") {
      return "password";
    }

    if (window.location.hash === "#lich-su-thue") {
      return "history";
    }

    return "profile";
  }

  function setStatus(message, type = "info") {
    if (!elements.status) {
      return;
    }

    elements.status.hidden = false;
    elements.status.className = `account-status is-${type}`;
    elements.status.textContent = message;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = String(reader.result || "");
        const [, base64 = ""] = result.split(",");

        resolve({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          data: base64,
        });
      };

      reader.onerror = () => reject(new Error("Không thể đọc file tải lên."));
      reader.readAsDataURL(file);
    });
  }

  function activateTab(tabName, syncHash = true) {
    elements.tabButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.accountTab === tabName);
    });

    elements.panels.forEach((panel) => {
      panel.hidden = panel.dataset.accountPanel !== tabName;
    });

    if (syncHash) {
      const nextHash =
        tabName === "password"
          ? "#doi-mat-khau"
          : tabName === "history"
            ? "#lich-su-thue"
            : "#thong-tin-tai-khoan";
      window.history.replaceState({}, "", nextHash);
    }
  }

  function setPreviewFromUrl(key, url, label = "") {
    const preview = previewElements[key];

    if (!preview) {
      return;
    }

    if (!url) {
      preview.innerHTML = `<span>Chưa có preview</span>`;
      preview.classList.remove("has-image", "has-file");
      return;
    }

    if (/\.(pdf)(\?|$)/i.test(url)) {
      preview.innerHTML = `<div class="account-preview-file">${label || "Tài liệu PDF đã tải lên"}</div>`;
      preview.classList.remove("has-image");
      preview.classList.add("has-file");
      return;
    }

    preview.innerHTML = `<img src="${url}" alt="${label || "Tài liệu tải lên"}" />`;
    preview.classList.remove("has-file");
    preview.classList.add("has-image");
  }

  function previewSelectedFile(key, file) {
    const preview = previewElements[key];

    if (!preview || !file) {
      return;
    }

    if (file.type === "application/pdf") {
      preview.innerHTML = `<div class="account-preview-file">${file.name}</div>`;
      preview.classList.remove("has-image");
      preview.classList.add("has-file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      preview.innerHTML = `<img src="${reader.result}" alt="${file.name}" />`;
      preview.classList.remove("has-file");
      preview.classList.add("has-image");
    };
    reader.readAsDataURL(file);
  }

  function bindDocument(metaElement, linkElement, documentInfo, previewKey) {
    if (!metaElement || !linkElement) {
      return;
    }

    if (!documentInfo) {
      linkElement.hidden = true;
      linkElement.removeAttribute("href");
      setPreviewFromUrl(previewKey, "");
      return;
    }

    metaElement.textContent = `Đã tải: ${documentInfo.originalName}`;
    linkElement.hidden = false;
    linkElement.href = documentInfo.filePath;
    setPreviewFromUrl(previewKey, documentInfo.filePath, documentInfo.originalName);
  }

  function setPaymentModal(order) {
    activePaymentOrder = order || null;

    if (!order?.payment) {
      return;
    }

    elements.paymentOrderCode.textContent = order.orderCode || "Đơn thuê";
    elements.paymentBankName.textContent = order.payment.bankName || "MB Bank";
    elements.paymentAccountNumber.textContent =
      order.payment.accountNumberDisplay || order.payment.accountNumber || "";
    elements.paymentAccountName.textContent = order.payment.accountName || "";
    elements.paymentAmount.textContent = formatPrice(order.payment.amount || 0);
    elements.paymentContent.textContent = order.payment.transferContent || "";
    elements.paymentQr.src = order.payment.qrUrl || "";
    elements.paymentQr.alt = `Mã QR thanh toán cho đơn ${order.orderCode || ""}`.trim();
    elements.paymentNote.textContent =
      "Vui lòng chuyển khoản đúng số tiền và đúng nội dung để Focus Camera xác nhận đơn thuê nhanh hơn.";
  }

  function openPaymentModal(order) {
    if (!order?.payment || !elements.paymentModal) {
      return;
    }

    setPaymentModal(order);
    elements.paymentModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closePaymentModal() {
    if (!elements.paymentModal) {
      return;
    }

    elements.paymentModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  async function copyPaymentField(field) {
    if (!activePaymentOrder?.payment) {
      return;
    }

    const textToCopy =
      field === "accountNumber"
        ? activePaymentOrder.payment.accountNumberDisplay || activePaymentOrder.payment.accountNumber || ""
        : activePaymentOrder.payment.transferContent || "";

    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setStatus("Đã sao chép thông tin thanh toán.", "success");
    } catch (error) {
      setStatus("Không thể sao chép tự động. Vui lòng thử lại.", "error");
    }
  }

  function maybeOpenLatestPaymentQr() {
    if (!autoOpenOrderId || !rentalOrders.length) {
      return;
    }

    const matchedOrder = rentalOrders.find((order) => order.id === autoOpenOrderId);

    if (matchedOrder) {
      activateTab("history");
      openPaymentModal(matchedOrder);
      clearAutoOpenOrderParam();
    }
  }

  function renderHistory(orders = []) {
    if (!elements.historyList) {
      return;
    }

    rentalOrders = orders;

    if (!orders.length) {
      elements.historyList.innerHTML = `
        <div class="account-empty-history">
          Chưa có đơn thuê nào. Hãy thêm thiết bị vào giỏ và bấm "Thuê ngay" để tạo đơn đầu tiên.
        </div>
      `;
      return;
    }

    elements.historyList.innerHTML = orders
      .map((order) => {
        const itemHtml = order.items
          .map(
            (item) => `
              <article class="account-history-item">
                <img src="${item.imageUrl || ""}" alt="${item.productName}" loading="lazy" />
                <div>
                  <h4>${escapeHtml(item.productName)}</h4>
                  <p>${formatRentalDuration(item.rentalDays)} • Nhận thiết bị: ${new Date(item.rentalStart).toLocaleString("vi-VN")}</p>
                </div>
                <strong>${formatPrice(item.totalPrice)}</strong>
              </article>
            `
          )
          .join("");

        return `
          <section class="account-history-card">
            <div class="account-history-head">
              <div>
                <h3>${escapeHtml(order.orderCode)}</h3>
                <p>Tạo lúc ${new Date(order.createdAt).toLocaleString("vi-VN")}</p>
              </div>
              <div class="account-history-meta">
                <span class="account-history-status">${formatOrderStatus(order.status)}</span>
                <strong>${formatPrice(order.totalPrice)}</strong>
                <button
                  class="account-history-payment-button"
                  type="button"
                  data-order-payment="${order.id}"
                >
                  Mở QR chuyển khoản
                </button>
              </div>
            </div>
            <div class="account-history-items">
              ${itemHtml}
            </div>
          </section>
        `;
      })
      .join("");

    maybeOpenLatestPaymentQr();
  }

  function renderProfile(data) {
    profileState = data;

    const user = data.user || {};
    const profile = data.profile || {};
    const documents = profile.documents || {};
    const requirements = profile.requirements || { canRent: false, missingDocuments: [] };

    elements.form.querySelector('[name="email"]').value = user.email || "";
    elements.form.querySelector('[name="fullName"]').value = user.fullName || "";
    elements.form.querySelector('[name="address"]').value = profile.address || "";
    elements.form.querySelector('[name="birthday"]').value = profile.birthday || "";
    elements.form.querySelector('[name="identityNumber"]').value = profile.identityNumber || "";
    elements.form.querySelector('[name="phone"]').value = user.phone || "";
    elements.form.querySelector('[name="facebookUrl"]').value = profile.facebookUrl || "";

    elements.greeting.textContent = `Xin chào ${user.fullName || ""}`.trim();
    elements.readyPill.textContent = requirements.canRent
      ? "Đã đủ hồ sơ thuê"
      : "Thiếu hồ sơ thuê";
    elements.readyPill.className = `account-ready-pill${requirements.canRent ? " is-ready" : ""}`;
    elements.requirementNote.textContent = requirements.canRent
      ? "Hồ sơ của bạn đã sẵn sàng để xác nhận thuê thiết bị."
      : "CCCD 2 mặt là bắt buộc trước khi xác nhận đơn thuê.";

    documentMeta.cccdFront.textContent = documents.cccdFront
      ? `Đã tải: ${documents.cccdFront.originalName}`
      : "Chưa tải lên";
    documentMeta.cccdBack.textContent = documents.cccdBack
      ? `Đã tải: ${documents.cccdBack.originalName}`
      : "Chưa tải lên";
    documentMeta.personalOther.textContent =
      documents.personalOther?.[0]
        ? `Đã tải: ${documents.personalOther[0].originalName}`
        : "Không bắt buộc. Có thể tải bằng lái, hộ chiếu, thẻ sinh viên hoặc PDF liên quan.";

    bindDocument(documentMeta.cccdFront, documentLinks.cccdFront, documents.cccdFront, "cccdFront");
    bindDocument(documentMeta.cccdBack, documentLinks.cccdBack, documents.cccdBack, "cccdBack");
    bindDocument(
      documentMeta.personalOther,
      documentLinks.personalOther,
      documents.personalOther?.[0],
      "personalOther"
    );
  }

  async function loadProfile() {
    setStatus("Đang tải thông tin tài khoản...", "info");

    try {
      const [profileData, historyData] = await Promise.all([
        window.focusStorefront.request("/account/profile", { withCart: false }),
        window.focusStorefront.request("/account/rentals", { withCart: false }),
      ]);

      renderProfile(profileData);
      renderHistory(historyData.orders || []);
      setStatus("Bạn có thể cập nhật hồ sơ thuê, đổi mật khẩu và xem lịch sử thuê tại đây.", "success");
    } catch (error) {
      setStatus(error.message, "error");

      window.setTimeout(() => {
        window.location.href = "./dang-nhap.html";
      }, 900);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    const submitButton = elements.form.querySelector('[type="submit"]');
    const existingOtherIds =
      profileState?.profile?.documents?.personalOther?.map((item) => item.id) || [];

    submitButton.disabled = true;
    setStatus("Đang lưu thông tin tài khoản...", "info");

    try {
      const cccdFrontFile = elements.form.querySelector('[name="cccdFront"]').files[0];
      const cccdBackFile = elements.form.querySelector('[name="cccdBack"]').files[0];
      const personalOtherFile = elements.form.querySelector('[name="personalOther"]').files[0];

      const payload = {
        email: elements.form.querySelector('[name="email"]').value.trim(),
        fullName: elements.form.querySelector('[name="fullName"]').value.trim(),
        address: elements.form.querySelector('[name="address"]').value.trim(),
        birthday: elements.form.querySelector('[name="birthday"]').value,
        identityNumber: elements.form.querySelector('[name="identityNumber"]').value.trim(),
        phone: elements.form.querySelector('[name="phone"]').value.trim(),
        facebookUrl: elements.form.querySelector('[name="facebookUrl"]').value.trim(),
        removeDocumentIds: personalOtherFile ? existingOtherIds : [],
        documents: {
          cccdFront: cccdFrontFile ? await fileToBase64(cccdFrontFile) : null,
          cccdBack: cccdBackFile ? await fileToBase64(cccdBackFile) : null,
          personalOther: personalOtherFile ? [await fileToBase64(personalOtherFile)] : [],
        },
      };

      const data = await window.focusStorefront.request("/account/profile", {
        method: "POST",
        body: payload,
        withCart: false,
      });

      renderProfile(data);
      elements.form.querySelector('[name="cccdFront"]').value = "";
      elements.form.querySelector('[name="cccdBack"]').value = "";
      elements.form.querySelector('[name="personalOther"]').value = "";
      setStatus("Đã lưu thông tin tài khoản thành công.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    const submitButton = elements.passwordForm.querySelector('[type="submit"]');
    const payload = {
      currentPassword: elements.passwordForm.querySelector('[name="currentPassword"]').value,
      newPassword: elements.passwordForm.querySelector('[name="newPassword"]').value,
      confirmPassword: elements.passwordForm.querySelector('[name="confirmPassword"]').value,
    };

    submitButton.disabled = true;
    setStatus("Đang cập nhật mật khẩu...", "info");

    try {
      await window.focusStorefront.request("/account/password", {
        method: "POST",
        body: payload,
        withCart: false,
      });

      elements.passwordForm.reset();
      setStatus("Đã đổi mật khẩu thành công.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleLogout() {
    try {
      await window.focusStorefront.request("/auth/logout", {
        method: "POST",
        withCart: false,
      });
    } catch (error) {
      // Continue clearing local session even if request fails.
    }

    window.focusStorefront.clearAuthSession();
    window.location.href = "./dang-nhap.html";
  }

  elements.historyList?.addEventListener("click", (event) => {
    const paymentButton = event.target.closest("[data-order-payment]");

    if (!paymentButton) {
      return;
    }

    const order = rentalOrders.find((item) => item.id === paymentButton.dataset.orderPayment);
    if (order) {
      openPaymentModal(order);
    }
  });

  elements.paymentCloseButtons.forEach((button) => {
    button.addEventListener("click", closePaymentModal);
  });

  elements.paymentCopyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      copyPaymentField(button.dataset.paymentCopy);
    });
  });

  ["cccdFront", "cccdBack", "personalOther"].forEach((key) => {
    const field = elements.form?.querySelector(`[name="${key}"]`);

    field?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      previewSelectedFile(key, file);
      documentMeta[key].textContent = `Đã chọn: ${file.name}`;
      documentLinks[key].hidden = true;
      documentLinks[key].removeAttribute("href");
    });
  });

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.accountTab);
    });
  });

  elements.logoutButtons.forEach((button) => {
    button.addEventListener("click", handleLogout);
  });

  elements.form?.addEventListener("submit", handleProfileSubmit);
  elements.passwordForm?.addEventListener("submit", handlePasswordSubmit);

  window.addEventListener("hashchange", () => {
    activateTab(getTabFromHash(), false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.paymentModal?.hidden) {
      closePaymentModal();
    }
  });

  activateTab(getTabFromHash(), false);
  loadProfile();
}
