const loginForm = document.querySelector("[data-login-form]");
const registerForm = document.querySelector("[data-register-form]");
const authStatus = document.querySelector("[data-auth-status]");

function setAuthStatus(message, type = "info") {
  if (!authStatus) {
    return;
  }

  authStatus.hidden = false;
  authStatus.className = `auth-form-status is-${type}`;
  authStatus.textContent = message;
}

function getFieldValue(form, name) {
  return String(new FormData(form).get(name) || "").trim();
}

function getPostAuthRedirect(user) {
  return user?.isAdmin || user?.role === "admin" ? "./admin.html" : "./tai-khoan.html";
}

async function handleLogin(event) {
  event.preventDefault();

  const identifier = getFieldValue(loginForm, "identifier");
  const password = getFieldValue(loginForm, "password");
  const submitButton = loginForm.querySelector('[type="submit"]');

  submitButton.disabled = true;
  setAuthStatus("Đang đăng nhập...", "info");

  try {
    const result = await window.focusStorefront.request("/auth/login", {
      method: "POST",
      body: { identifier, password },
      withCart: false,
    });

    setAuthStatus("Đăng nhập thành công. Đang chuyển trang...", "success");
    window.setTimeout(() => {
      window.location.href = getPostAuthRedirect(result?.user);
    }, 700);
  } catch (error) {
    setAuthStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const fullName = getFieldValue(registerForm, "fullName");
  const phone = getFieldValue(registerForm, "phone");
  const email = getFieldValue(registerForm, "email");
  const password = getFieldValue(registerForm, "password");
  const confirmPassword = getFieldValue(registerForm, "confirmPassword");
  const accepted = registerForm.querySelector('[name="acceptTerms"]')?.checked;
  const submitButton = registerForm.querySelector('[type="submit"]');

  if (password !== confirmPassword) {
    setAuthStatus("Mật khẩu nhập lại chưa khớp.", "error");
    return;
  }

  if (!accepted) {
    setAuthStatus("Bạn cần đồng ý điều khoản để tiếp tục.", "error");
    return;
  }

  submitButton.disabled = true;
  setAuthStatus("Đang tạo tài khoản...", "info");

  try {
    const result = await window.focusStorefront.request("/auth/register", {
      method: "POST",
      body: { fullName, phone, email, password },
      withCart: false,
    });

    setAuthStatus("Tạo tài khoản thành công. Đang chuyển trang...", "success");
    window.setTimeout(() => {
      window.location.href = getPostAuthRedirect(result?.user);
    }, 700);
  } catch (error) {
    setAuthStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

if (registerForm) {
  registerForm.addEventListener("submit", handleRegister);
}
