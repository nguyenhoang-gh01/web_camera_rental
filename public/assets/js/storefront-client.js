(function bootstrapStorefrontClient() {
  const API_BASE = "/api";
  const AUTH_TOKEN_KEY = "focusAuthToken";
  const AUTH_USER_KEY = "focusAuthUser";
  const CART_TOKEN_KEY = "focusCartToken";
  const CART_CHANGE_EVENT = "focus-cart:changed";

  function emitCartChanged(payload = {}) {
    window.dispatchEvent(
      new CustomEvent(CART_CHANGE_EVENT, {
        detail: payload,
      })
    );
  }

  function readJsonStorage(key) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function writeJsonStorage(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function getAuthToken() {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
  }

  function getAuthUser() {
    return readJsonStorage(AUTH_USER_KEY);
  }

  function setAuthSession(authToken, user) {
    if (authToken) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    }

    if (user) {
      writeJsonStorage(AUTH_USER_KEY, user);
    }
  }

  function clearAuthSession() {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
  }

  function getCartToken() {
    return window.localStorage.getItem(CART_TOKEN_KEY) || "";
  }

  function setCartToken(token) {
    if (token) {
      window.localStorage.setItem(CART_TOKEN_KEY, token);
    }
  }

  async function request(path, options = {}) {
    const {
      method = "GET",
      body,
      headers = {},
      withAuth = true,
      withCart = true,
    } = options;
    const requestHeaders = { ...headers };

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

    if (body !== undefined && !isFormData) {
      requestHeaders["Content-Type"] = "application/json";
    }

    if (withAuth && getAuthToken()) {
      requestHeaders.Authorization = `Bearer ${getAuthToken()}`;
    }

    if (withCart && getCartToken()) {
      requestHeaders["X-Cart-Token"] = getCartToken();
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });

    const json = await response.json().catch(() => ({}));

    if (json?.authToken || json?.user) {
      setAuthSession(json.authToken, json.user);
    }

    if (json?.cartToken) {
      setCartToken(json.cartToken);
    }

    if (json?.cart || json?.cartToken) {
      emitCartChanged({
        cart: json.cart || null,
        cartToken: json.cartToken || getCartToken(),
      });
    }

    if (!response.ok) {
      throw new Error(json?.error || "Yêu cầu thất bại.");
    }

    return json;
  }

  window.focusStorefront = {
    request,
    getAuthToken,
    getAuthUser,
    setAuthSession,
    clearAuthSession,
    getCartToken,
    setCartToken,
    emitCartChanged,
  };
})();
