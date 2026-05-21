import assert from "node:assert/strict";

const API_BASE = process.env.SMOKE_API_BASE_URL || "http://localhost:5001/api";
const FRONTEND_BASE = process.env.SMOKE_FRONTEND_BASE_URL || "http://localhost:3000";
const timestamp = Date.now();

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function requestPage(path) {
  const response = await fetch(`${FRONTEND_BASE}${path}`);
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status}`);
  }
  return html;
}

const cleanup = {
  couponId: null,
  createdProductId: null,
  importedProductId: null,
  productId: null,
  userToken: null,
  adminToken: null,
};

async function run() {
  const admin = await request("/auth/login", {
    method: "POST",
    body: { email: "admin@example.com", password: "password123" },
  });
  cleanup.adminToken = admin.token;

  const registeredEmail = `smoke+${timestamp}@example.com`;
  const user = await request("/auth/register", {
    method: "POST",
    body: { name: "Smoke User", email: registeredEmail, password: "secret123" },
  });
  assert.ok(user.token, "user registration should return a token");

  const forgot = await request("/auth/forgot-password", {
    method: "POST",
    body: { email: registeredEmail },
  });
  assert.ok(forgot.resetToken, "forgot-password should return a reset token outside production");

  const reset = await request(`/auth/reset-password/${forgot.resetToken}`, {
    method: "POST",
    body: { password: "reset789" },
  });
  assert.equal(reset.message, "Password updated successfully");

  const authenticatedUser = await request("/auth/login", {
    method: "POST",
    body: { email: registeredEmail, password: "reset789" },
  });
  cleanup.userToken = authenticatedUser.token;

  const catalog = await request("/products");
  assert.ok(Array.isArray(catalog.products) && catalog.products.length > 0, "catalog should contain products");
  cleanup.productId = catalog.products[0]._id;

  const [facets, productDetail, related, homepage, aiSearch, aiChat] = await Promise.all([
    request("/products/facets"),
    request(`/products/${cleanup.productId}`),
    request(`/products/${cleanup.productId}/related`),
    request("/ai/homepage"),
    request("/ai/search?q=decor"),
    request("/ai/chatbot", {
      method: "POST",
      body: { message: "Show me decor gifts", userId: authenticatedUser._id },
    }),
  ]);

  assert.ok(productDetail._id, "product detail should load");
  assert.ok(Array.isArray(facets.categories), "facets should include categories");
  assert.ok(Array.isArray(related), "related products should return an array");
  assert.ok(Array.isArray(homepage.recommended), "homepage should include recommended products");
  assert.ok(Array.isArray(aiSearch.results), "AI search should return results");
  assert.ok(typeof aiChat.answer === "string" && aiChat.answer.length > 0, "chatbot should return an answer");

  const couponCode = `SMOKE${timestamp}`;
  const coupon = await request("/admin/coupons", {
    method: "POST",
    token: cleanup.adminToken,
    body: {
      code: couponCode,
      description: "Smoke coupon",
      type: "percentage",
      value: 10,
      minOrderAmount: 0,
      isActive: true,
    },
  });
  cleanup.couponId = coupon._id;

  const cartEmpty = await request("/cart", { token: cleanup.userToken });
  assert.equal(cartEmpty.items.length, 0, "new user cart should start empty");

  const cartWithItem = await request("/cart/items", {
    method: "PUT",
    token: cleanup.userToken,
    body: { productId: cleanup.productId, qty: 2 },
  });
  assert.equal(cartWithItem.items.length, 1, "cart should contain one item after add");

  const cartWithCoupon = await request("/cart/coupon", {
    method: "POST",
    token: cleanup.userToken,
    body: { code: couponCode },
  });
  assert.ok(cartWithCoupon.total <= cartWithItem.total, "coupon should not increase the cart total");

  const wishlistAfterAdd = await request(`/wishlist/${cleanup.productId}`, {
    method: "POST",
    token: cleanup.userToken,
  });
  assert.ok(wishlistAfterAdd.some((item) => item._id === cleanup.productId), "wishlist add should include the product");

  const guestSummary = await request("/orders/summary", {
    method: "POST",
    body: {
      paymentMethod: "upi",
      items: [{ product: cleanup.productId, qty: 1 }],
    },
  });
  assert.ok(guestSummary.totalPrice > 0, "guest summary should calculate totals");

  const guestOrder = await request("/orders", {
    method: "POST",
    body: {
      paymentMethod: "cod",
      shippingAddress: {
        address: "1 Guest Street",
        city: "Chennai",
        postalCode: "600001",
        country: "India",
        phone: "9000000000",
      },
      items: [{ product: cleanup.productId, qty: 1 }],
    },
  });
  assert.ok(guestOrder._id, "guest checkout should create an order");

  const userSummary = await request("/orders/summary", {
    method: "POST",
    token: cleanup.userToken,
    body: { paymentMethod: "card" },
  });
  assert.ok(userSummary.totalPrice > 0, "logged-in summary should use the saved cart");

  const userOrder = await request("/orders", {
    method: "POST",
    token: cleanup.userToken,
    body: {
      paymentMethod: "card",
      shippingAddress: {
        address: "99 Test Road",
        city: "Bengaluru",
        postalCode: "560001",
        country: "India",
        phone: "9876543210",
      },
    },
  });
  assert.ok(userOrder._id, "logged-in checkout should create an order");

  const paidOrder = await request(`/orders/${userOrder._id}/pay`, {
    method: "POST",
    token: cleanup.userToken,
    body: {
      paymentResult: {
        id: `pay_${timestamp}`,
        status: "paid",
        email_address: authenticatedUser.email,
      },
    },
  });
  assert.equal(paidOrder.isPaid, true, "pay endpoint should mark the order as paid");

  const review = await request(`/products/${cleanup.productId}/reviews`, {
    method: "POST",
    token: cleanup.userToken,
    body: { rating: 5, comment: "Smoke test review" },
  });
  assert.equal(review.rating, 5, "review endpoint should persist the rating");

  const packedOrder = await request(`/orders/${userOrder._id}/status`, {
    method: "PATCH",
    token: cleanup.adminToken,
    body: {
      status: "packed",
      message: "Packed during smoke test",
      location: "Test Hub",
    },
  });
  assert.equal(packedOrder.status, "packed", "admin should be able to update order status");

  const tracking = await request(`/orders/${userOrder._id}/tracking`, {
    token: cleanup.userToken,
  });
  assert.ok(tracking.trackingEvents.length >= 2, "tracking should include multiple events");

  const cancelled = await request(`/orders/${userOrder._id}/cancel`, {
    method: "POST",
    token: cleanup.userToken,
  });
  assert.equal(cancelled.status, "cancelled", "user should be able to cancel a packed order");

  const myOrders = await request("/orders/my", { token: cleanup.userToken });
  assert.ok(myOrders.some((order) => order._id === userOrder._id), "order history should include the new order");

  const notifications = await request("/notifications", { token: cleanup.userToken });
  assert.ok(Array.isArray(notifications), "notifications should return a list");
  if (notifications[0]) {
    const readNotification = await request(`/notifications/${notifications[0]._id}/read`, {
      method: "PATCH",
      token: cleanup.userToken,
      body: {},
    });
    assert.equal(readNotification.read, true, "notification read endpoint should update the item");
  }

  const customOrder = await request("/custom-orders", {
    method: "POST",
    token: cleanup.userToken,
    body: {
      name: "Smoke Custom",
      email: authenticatedUser.email,
      material: "Wood",
      description: "Custom carved panel",
      dimensions: "12x18",
      budget: "5000",
    },
  });
  assert.ok(customOrder._id, "custom order request should be created");

  const customOrders = await request("/custom-orders", { token: cleanup.adminToken });
  assert.ok(customOrders.some((entry) => entry._id === customOrder._id), "admin should see submitted custom orders");

  const createdProduct = await request("/products", {
    method: "POST",
    token: cleanup.adminToken,
    body: {
      name: `Smoke Product ${timestamp}`,
      description: "Created by smoke test",
      price: 499,
      originalPrice: 699,
      brand: "Smoke Brand",
      category: "Testing",
      subcategory: "Automation",
      images: ["https://example.com/test-product.jpg"],
      countInStock: 7,
      stockAlertThreshold: 2,
      specs: ["Spec 1"],
      tags: ["smoke"],
      semanticKeywords: ["automation"],
      featured: false,
    },
  });
  cleanup.createdProductId = createdProduct._id;

  const dynamicPricing = await request(`/ai/dynamic-pricing/${createdProduct._id}`, {
    token: cleanup.adminToken,
  });
  assert.ok(dynamicPricing.suggestedPrice > 0, "dynamic pricing should return a suggested price");

  const updatedProduct = await request(`/products/${createdProduct._id}`, {
    method: "PUT",
    token: cleanup.adminToken,
    body: {
      name: `Smoke Product ${timestamp} Updated`,
      description: "Updated by smoke test",
      price: 549,
      originalPrice: 749,
      brand: "Smoke Brand",
      category: "Testing",
      subcategory: "Automation",
      images: ["https://example.com/test-product.jpg"],
      countInStock: 9,
      stockAlertThreshold: 3,
      specs: ["Spec 2"],
      tags: ["smoke", "updated"],
      semanticKeywords: ["automation"],
      featured: true,
    },
  });
  assert.ok(updatedProduct.name.includes("Updated"), "admin should be able to update products");

  const importedName = `Imported Smoke ${timestamp}`;
  const importResult = await request("/admin/products/import", {
    method: "POST",
    token: cleanup.adminToken,
    body: {
      products: [
        {
          name: importedName,
          description: "Imported by smoke test",
          price: 899,
          brand: "Smoke Brand",
          category: "Testing",
          images: ["https://example.com/imported.jpg"],
          countInStock: 4,
          stockAlertThreshold: 1,
        },
      ],
    },
  });
  assert.equal(importResult.created, 1, "bulk import should create one product");

  const [adminProducts, adminOrders, dashboard, analytics, inventory] = await Promise.all([
    request("/admin/products", { token: cleanup.adminToken }),
    request("/admin/orders", { token: cleanup.adminToken }),
    request("/admin/dashboard", { token: cleanup.adminToken }),
    request("/admin/analytics", { token: cleanup.adminToken }),
    request("/admin/inventory", { token: cleanup.adminToken }),
  ]);

  cleanup.importedProductId = adminProducts.find((product) => product.name === importedName)?._id || null;
  assert.ok(cleanup.importedProductId, "imported product should appear in the admin product list");
  assert.ok(adminOrders.some((order) => order._id === userOrder._id), "admin orders should include the new order");
  assert.ok(dashboard.metrics.orders >= 1, "dashboard should include order metrics");
  assert.ok(Array.isArray(analytics.statusBreakdown), "analytics should include a status breakdown");
  assert.ok(Array.isArray(inventory.products), "inventory should include products");

  const [homeHtml, accountHtml, productsHtml, productHtml, cartHtml, checkoutHtml, ordersHtml, adminHtml, customOrderHtml, faqHtml, refundHtml] =
    await Promise.all([
      requestPage("/"),
      requestPage("/account"),
      requestPage("/products"),
      requestPage(`/products/${cleanup.productId}`),
      requestPage("/cart"),
      requestPage("/checkout"),
      requestPage("/orders"),
      requestPage("/admin"),
      requestPage("/custom-order"),
      requestPage("/faq"),
      requestPage("/refund-policy"),
    ]);

  assert.ok(homeHtml.includes("Handcrafts"), "homepage should render");
  assert.ok(accountHtml.includes("Welcome back"), "account page should render");
  assert.ok(productsHtml.toLowerCase().includes("products"), "products page should render");
  assert.ok(productHtml.length > 0, "product detail page should render");
  assert.ok(cartHtml.toLowerCase().includes("cart"), "cart page should render");
  assert.ok(checkoutHtml.includes("Checkout"), "checkout page should render");
  assert.ok(ordersHtml.toLowerCase().includes("orders"), "orders page should render");
  assert.ok(adminHtml.toLowerCase().includes("admin"), "admin page should render");
  assert.ok(customOrderHtml.toLowerCase().includes("custom"), "custom-order page should render");
  assert.ok(faqHtml.toLowerCase().includes("faq"), "faq page should render");
  assert.ok(refundHtml.toLowerCase().includes("refund"), "refund page should render");

  console.log(
    JSON.stringify(
      {
        apiBase: API_BASE,
        frontendBase: FRONTEND_BASE,
        catalog: { totalProducts: catalog.total, relatedCount: related.length },
        ai: { searchCount: aiSearch.results.length, chatbotAnswered: true },
        cart: { discountedTotal: cartWithCoupon.total },
        orders: { guestOrderId: guestOrder._id, userOrderId: userOrder._id, myOrders: myOrders.length },
        admin: { dashboardOrders: dashboard.metrics.orders, importedProductId: cleanup.importedProductId },
        notifications: { total: notifications.length },
        routesChecked: 11,
      },
      null,
      2,
    ),
  );
}

try {
  await run();
} finally {
  if (cleanup.createdProductId) {
    await request(`/products/${cleanup.createdProductId}`, {
      method: "DELETE",
      token: cleanup.adminToken,
    }).catch(() => undefined);
  }

  if (cleanup.importedProductId) {
    await request(`/products/${cleanup.importedProductId}`, {
      method: "DELETE",
      token: cleanup.adminToken,
    }).catch(() => undefined);
  }

  if (cleanup.couponId) {
    await request(`/admin/coupons/${cleanup.couponId}`, {
      method: "DELETE",
      token: cleanup.adminToken,
    }).catch(() => undefined);
  }

  if (cleanup.productId && cleanup.userToken) {
    await request(`/wishlist/${cleanup.productId}`, {
      method: "DELETE",
      token: cleanup.userToken,
    }).catch(() => undefined);
  }
}
