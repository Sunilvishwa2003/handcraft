import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const execFileAsync = promisify(execFile);
const timestamp = Date.now();

const API_BASE = process.env.SMOKE_API_BASE_URL || "http://localhost:5000/api";
const FRONTEND_BASE = process.env.SMOKE_FRONTEND_BASE_URL || process.env.CLIENT_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "sunilvishwa200@gmail.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "codex-admin-123";
const SAMPLE_FILE = process.env.SMOKE_UPLOAD_FILE || path.resolve(process.cwd(), "test-upload.png");
const SCREENSHOT_PATH = path.resolve(process.cwd(), ".codex-logs", `smoke-ad-${timestamp}.png`);
const AD_TITLE = `Smoke Ad ${timestamp}`;
const AD_TARGET_URL = "/products";

const EDGE_CANDIDATES = [
  process.env.SMOKE_EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

class HttpError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

const cleanup = {
  adminToken: null,
  adId: null,
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function request(pathname, { method = "GET", body, token, rawBody } = {}) {
  const headers = new Headers();

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers,
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new HttpError(`${method} ${pathname} failed`, response.status, data);
  }

  return data;
}

async function ensureSampleFile() {
  if (fs.existsSync(SAMPLE_FILE)) {
    return SAMPLE_FILE;
  }

  const pixel =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAuwB9pJ+bQAAAABJRU5ErkJggg==";
  await fsp.writeFile(SAMPLE_FILE, Buffer.from(pixel, "base64"));
  return SAMPLE_FILE;
}

async function ensureAdminToken() {
  try {
    const login = await request("/auth/login", {
      method: "POST",
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    return login.token;
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 401) {
      throw error;
    }
  }

  try {
    const registered = await request("/auth/register", {
      method: "POST",
      body: { name: "Codex Smoke Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    return registered.token;
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 400) {
      throw error;
    }
  }

  const forgot = await request("/auth/forgot-password", {
    method: "POST",
    body: { email: ADMIN_EMAIL },
  });

  assert.ok(forgot?.resetToken, "forgot-password should return a reset token outside production");

  await request(`/auth/reset-password/${forgot.resetToken}`, {
    method: "POST",
    body: { password: ADMIN_PASSWORD },
  });

  const resetLogin = await request("/auth/login", {
    method: "POST",
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  return resetLogin.token;
}

async function uploadAdImage(token) {
  const sampleFile = await ensureSampleFile();
  const fileBuffer = await fsp.readFile(sampleFile);
  const form = new FormData();
  form.append("assets", new Blob([fileBuffer], { type: "image/png" }), path.basename(sampleFile));

  const response = await fetch(`${API_BASE}/admin/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new HttpError("POST /admin/upload failed", response.status, payload);
  }

  assert.ok(Array.isArray(payload.files) && payload.files.length > 0, "upload should return at least one file");
  return payload.files[0];
}

async function createAd(token, imageUrl) {
  const ad = await request("/admin/ads", {
    method: "POST",
    token,
    body: {
      title: AD_TITLE,
      description: "Smoke test homepage banner",
      imageUrl,
      desktopImage: imageUrl,
      tabletImage: imageUrl,
      mobileImage: imageUrl,
      targetUrl: AD_TARGET_URL,
      active: true,
      sortOrder: -9999,
      placements: ["home"],
    },
  });

  cleanup.adId = ad._id;
  return ad;
}

async function verifyHomepageApi(expectedImageUrl) {
  const homepage = await request("/ai/homepage");
  const matched = homepage.ads?.find((ad) => ad.title === AD_TITLE);

  assert.ok(matched, "homepage payload should include the smoke ad");
  assert.equal(matched.desktopImage || matched.imageUrl, expectedImageUrl, "homepage payload should return the uploaded image URL");

  return {
    totalAds: homepage.ads?.length || 0,
    matchedAdId: matched._id,
  };
}

function findEdgePath() {
  return EDGE_CANDIDATES.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

async function verifyRenderedHome(expectedImageUrl) {
  const edgePath = findEdgePath();
  assert.ok(edgePath, "Microsoft Edge is required for rendered homepage verification");

  await fsp.mkdir(path.dirname(SCREENSHOT_PATH), { recursive: true });

  const { stdout } = await execFileAsync(
    edgePath,
    [
      "--headless",
      "--disable-gpu",
      "--virtual-time-budget=10000",
      "--window-size=1440,900",
      `--screenshot=${SCREENSHOT_PATH}`,
      "--dump-dom",
      `${FRONTEND_BASE}/`,
    ],
    {
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  assert.match(stdout, new RegExp(escapeRegExp(AD_TITLE)), "rendered homepage DOM should include the smoke ad title");
  assert.match(stdout, new RegExp(escapeRegExp(expectedImageUrl)), "rendered homepage DOM should include the uploaded image URL");
  assert.ok(fs.existsSync(SCREENSHOT_PATH), "headless browser should save a homepage screenshot");

  return {
    screenshotPath: SCREENSHOT_PATH,
    domContainsTitle: true,
    domContainsImageUrl: true,
  };
}

async function verifyUploadedImage(imageUrl) {
  const response = await fetch(imageUrl);
  assert.ok(response.ok, "uploaded image URL should be reachable");

  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
  };
}

async function run() {
  cleanup.adminToken = await ensureAdminToken();
  const uploaded = await uploadAdImage(cleanup.adminToken);
  const ad = await createAd(cleanup.adminToken, uploaded.url);
  const assetCheck = await verifyUploadedImage(uploaded.url);
  const apiCheck = await verifyHomepageApi(uploaded.url);
  const renderCheck = await verifyRenderedHome(uploaded.url);

  console.log(
    JSON.stringify(
      {
        apiBase: API_BASE,
        frontendBase: FRONTEND_BASE,
        adminEmail: ADMIN_EMAIL,
        ad: {
          id: ad._id,
          title: ad.title,
          targetUrl: ad.targetUrl,
        },
        upload: {
          originalName: uploaded.originalName,
          url: uploaded.url,
          mimetype: uploaded.mimetype,
          size: uploaded.size,
        },
        uploadedAsset: assetCheck,
        homepageApi: apiCheck,
        renderedHome: renderCheck,
      },
      null,
      2,
    ),
  );
}

try {
  await run();
} finally {
  if (cleanup.adId && cleanup.adminToken) {
    await request(`/admin/ads/${cleanup.adId}`, {
      method: "DELETE",
      token: cleanup.adminToken,
    }).catch(() => undefined);
  }
}
