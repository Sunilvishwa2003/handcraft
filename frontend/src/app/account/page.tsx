"use client";

import { FormEvent, Suspense, useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { apiFetch, setStoredUser } from "@/lib/api";
import { User } from "@/lib/types";

type Mode = "login" | "register" | "forgot" | "reset";

type AuthFormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type ResetFormState = {
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof AuthFormState, string>>;
type ResetErrors = Partial<Record<keyof ResetFormState, string>>;

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonOptions = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: "signin" | "signup" | "use";
};

type GoogleOriginIssue = {
  currentOrigin: string;
  allowedOrigins: string[];
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (element: HTMLElement, options: GoogleButtonOptions) => void;
        };
      };
    };
  }
}

const initialAuthForm: AuthFormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const initialResetForm = (email?: string, token?: string): ResetFormState => ({
  email: email || "",
  token: token || "",
  password: "",
  confirmPassword: "",
});

const DEFAULT_GOOGLE_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

const normalizeOrigin = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).origin.toLowerCase();
  } catch {
    return "";
  }
};

const getConfiguredGoogleAllowedOrigins = () => {
  const explicitOrigins = (process.env.NEXT_PUBLIC_GOOGLE_ALLOWED_ORIGINS || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
  const publicUrlOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_URL?.trim() || "");

  return Array.from(new Set([...DEFAULT_GOOGLE_ALLOWED_ORIGINS, ...(publicUrlOrigin ? [publicUrlOrigin] : []), ...explicitOrigins]));
};

const subscribeToOriginChanges = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("hashchange", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("hashchange", onStoreChange);
  };
};

const getOriginSnapshot = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin.toLowerCase();
};

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountPageFallback />}>
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const urlMode = searchParams.get("mode");
  const urlToken = searchParams.get("token") || "";
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
  const googleAllowedOrigins = useMemo(() => getConfiguredGoogleAllowedOrigins(), []);
  const initialMode: Mode = urlMode === "reset" ? "reset" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState<AuthFormState>(initialAuthForm);
  const [resetForm, setResetForm] = useState<ResetFormState>(initialResetForm("", urlToken));
  const [errors, setErrors] = useState<FormErrors>({});
  const [resetErrors, setResetErrors] = useState<ResetErrors>({});
  const [message, setMessage] = useState("");
  const [resetDetails, setResetDetails] = useState<{ token?: string; url?: string; expiresInMinutes?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(() => typeof window !== "undefined" && Boolean(window.google?.accounts?.id));
  const [googleScriptError, setGoogleScriptError] = useState("");
  const currentOrigin = useSyncExternalStore(subscribeToOriginChanges, getOriginSnapshot, () => "");

  const redirectTarget = useMemo(() => {
    const requested = searchParams.get("redirect");
    return requested && requested !== "/account" ? requested : null;
  }, [searchParams]);

  const googleOriginIssue = useMemo<GoogleOriginIssue | null>(() => {
    if (!googleClientId || !currentOrigin) {
      return null;
    }

    if (googleAllowedOrigins.includes(currentOrigin)) {
      return null;
    }

    return {
      currentOrigin,
      allowedOrigins: googleAllowedOrigins,
    };
  }, [currentOrigin, googleAllowedOrigins, googleClientId]);
  const canRenderGoogleButton = Boolean(googleClientId && currentOrigin && !googleOriginIssue);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setErrors({});
    setResetErrors({});
    setMessage("");
    if (nextMode !== "forgot") {
      setResetDetails(null);
    }
  };

  const submitGoogle = useEffectEvent(async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      setMessage("Google sign-in did not return a credential.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const user = await apiFetch<User>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: response.credential }),
      });

      setStoredUser(user);
      router.push(redirectTarget || (user.isAdmin ? "/admin" : "/account/dashboard"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (mode !== "login" && mode !== "register") {
      return;
    }

    if (!canRenderGoogleButton) {
      return;
    }

    if (!googleScriptLoaded || !window.google?.accounts?.id || !googleButtonRef.current) {
      return;
    }

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: submitGoogle,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: mode === "register" ? "signup" : "signin",
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      text: mode === "register" ? "signup_with" : "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: Math.max(googleButtonRef.current.offsetWidth, 280),
    });
  }, [canRenderGoogleButton, googleClientId, googleScriptLoaded, mode]);

  const googleUiError = !googleClientId
    ? "Google sign-in is not configured for the frontend yet."
    : googleOriginIssue
      ? `Google sign-in is disabled on this origin (${googleOriginIssue.currentOrigin}). Add this exact origin to the Google Cloud Console Authorized JavaScript origins for your web client, or open the app from one of the configured origins below.`
      : googleScriptError;

  const validateAuth = () => {
    const nextErrors: FormErrors = {};

    if (mode === "register" && !form.name.trim()) {
      nextErrors.name = "Enter your full name.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Enter your email address.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Enter your password.";
    } else if (form.password.length < 6) {
      nextErrors.password = "Use at least 6 characters.";
    }

    if (mode === "register") {
      if (!form.confirmPassword) {
        nextErrors.confirmPassword = "Confirm your password.";
      } else if (form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = "Passwords do not match.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateForgot = () => {
    const nextErrors: ResetErrors = {};
    if (!resetForm.email.trim()) {
      nextErrors.email = "Enter your email address.";
    } else if (!/^\S+@\S+\.\S+$/.test(resetForm.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    setResetErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateReset = () => {
    const nextErrors: ResetErrors = {};

    if (!resetForm.token.trim()) {
      nextErrors.token = "Enter the reset token.";
    }

    if (!resetForm.password) {
      nextErrors.password = "Enter a new password.";
    } else if (resetForm.password.length < 6) {
      nextErrors.password = "Use at least 6 characters.";
    }

    if (!resetForm.confirmPassword) {
      nextErrors.confirmPassword = "Confirm the new password.";
    } else if (resetForm.password !== resetForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setResetErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!validateAuth()) {
      return;
    }

    setLoading(true);

    try {
      const user = await apiFetch<User>(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      setStoredUser(user);
      router.push(redirectTarget || (user.isAdmin ? "/admin" : "/account/dashboard"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!validateForgot()) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch<{ message: string; resetToken?: string; resetUrl?: string; expiresInMinutes?: number }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: resetForm.email.trim().toLowerCase() }),
      });

      setMessage(response.message);
      setResetDetails({
        token: response.resetToken,
        url: response.resetUrl,
        expiresInMinutes: response.expiresInMinutes,
      });

      if (response.resetToken) {
        setResetForm((current) => ({
          ...current,
          token: response.resetToken || current.token,
        }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare password reset");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!validateReset()) {
      return;
    }

    setLoading(true);

    try {
      const user = await apiFetch<User & { message?: string }>(`/auth/reset-password/${encodeURIComponent(resetForm.token.trim())}`, {
        method: "POST",
        body: JSON.stringify({ password: resetForm.password }),
      });

      setStoredUser(user);
      router.push(redirectTarget || (user.isAdmin ? "/admin" : "/account/dashboard"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === "login"
      ? "Welcome back"
      : mode === "register"
        ? "Create your account"
        : mode === "forgot"
          ? "Forgot password"
          : "Reset password";

  const helperText =
    mode === "login"
      ? "Use your email and password to continue shopping, track orders, and manage your wishlist."
      : mode === "register"
        ? "Create an account to unlock synced carts, notifications, reviews, and personalized recommendations."
        : mode === "forgot"
          ? "Enter your account email. In development, you’ll see the reset token and direct link here immediately."
          : "Paste the token from the reset link, set a new password, and you’ll be signed in automatically.";

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 md:px-6">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptLoaded(true)}
        onError={() => setGoogleScriptError("Google sign-in script could not be loaded.")}
      />
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-md bg-[#232f3e] p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">Account access</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Sign in once and the shop starts feeling like yours.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-gray-200">
            Your account keeps wishlist items, synced carts, verified reviews, live order updates, personalized recommendations, and now password recovery in one place.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Saved wishlist and recently viewed items",
              "Persistent cart across devices",
              "Verified reviews after purchase",
              "Live order tracking and notifications",
            ].map((item) => (
              <div key={item} className="rounded-md border border-white/15 bg-white/5 p-4 text-sm">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-md border border-sky-300/30 bg-sky-300/10 p-4 text-sm text-sky-100">
            {redirectTarget
              ? `You will continue to ${redirectTarget} after signing in.`
              : "Admin accounts land directly on the product and order dashboard."}
          </div>
        </section>

        <section className="rounded-md bg-white p-6 shadow-sm">
          <div className="flex rounded-md bg-gray-100 p-1">
            <button
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-gray-950 shadow-sm" : "text-gray-600"}`}
            >
              Login
            </button>
            <button
              onClick={() => switchMode("register")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-white text-gray-950 shadow-sm" : "text-gray-600"}`}
            >
              Create account
            </button>
          </div>

          <div className="mt-5">
            <h2 className="text-2xl font-bold text-gray-950">{heading}</h2>
            <p className="mt-2 text-sm text-gray-600">{helperText}</p>
          </div>

          {message ? <div className="mt-4 rounded-md bg-sky-50 p-3 text-sm text-sky-800">{message}</div> : null}

          {(mode === "login" || mode === "register") && (
            <form onSubmit={submitAuth} className="mt-5 space-y-4">
              {mode === "register" ? (
                <Field
                  label="Full name"
                  value={form.name}
                  onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                  error={errors.name}
                  autoComplete="name"
                  placeholder="Aarav Kumar"
                />
              ) : null}

              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                error={errors.email}
                autoComplete="email"
                placeholder="you@example.com"
              />

              <PasswordField
                label="Password"
                value={form.password}
                onChange={(value) => setForm((current) => ({ ...current, password: value }))}
                error={errors.password}
                shown={showPassword}
                setShown={setShowPassword}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />

              {mode === "register" ? (
                <PasswordField
                  label="Confirm password"
                  value={form.confirmPassword}
                  onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
                  error={errors.confirmPassword}
                  shown={showConfirmPassword}
                  setShown={setShowConfirmPassword}
                  autoComplete="new-password"
                />
              ) : null}

              <button
                disabled={loading}
                className="w-full rounded-md bg-gray-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
              </button>
            </form>
          )}

          {(mode === "login" || mode === "register") && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {canRenderGoogleButton ? <div ref={googleButtonRef} className="min-h-11 w-full overflow-hidden rounded-md" /> : null}
                {googleUiError ? <p className="text-sm text-amber-700">{googleUiError}</p> : null}
                {googleOriginIssue ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <p className="font-semibold">Configured origins</p>
                    <p className="mt-2 break-words font-mono">{googleOriginIssue.allowedOrigins.join(", ")}</p>
                    <p className="mt-2">
                      If you are testing on a LAN IP or a different port, add that exact origin in Google Cloud Console and to
                      <code> NEXT_PUBLIC_GOOGLE_ALLOWED_ORIGINS</code>.
                    </p>
                  </div>
                ) : null}
                {googleClientId && currentOrigin ? (
                  <p className="text-xs text-gray-500">
                    Current origin: <code>{currentOrigin}</code>. Google Cloud Console must list this exact value under
                    Authorized JavaScript origins for the web client.
                  </p>
                ) : null}
                {!googleClientId ? (
                  <p className="text-xs text-gray-500">
                    Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable Google sign-in in this environment.
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {mode === "forgot" && (
            <form onSubmit={submitForgot} className="mt-5 space-y-4">
              <Field
                label="Account email"
                type="email"
                value={resetForm.email}
                onChange={(value) => setResetForm((current) => ({ ...current, email: value }))}
                error={resetErrors.email}
                autoComplete="email"
                placeholder="you@example.com"
              />
              <button disabled={loading} className="w-full rounded-md bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-60">
                {loading ? "Preparing reset..." : "Generate reset token"}
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={submitReset} className="mt-5 space-y-4">
              <Field
                label="Reset token"
                value={resetForm.token}
                onChange={(value) => setResetForm((current) => ({ ...current, token: value }))}
                error={resetErrors.token}
                placeholder="Paste the token from the reset link"
              />
              <PasswordField
                label="New password"
                value={resetForm.password}
                onChange={(value) => setResetForm((current) => ({ ...current, password: value }))}
                error={resetErrors.password}
                shown={showResetPassword}
                setShown={setShowResetPassword}
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm new password"
                value={resetForm.confirmPassword}
                onChange={(value) => setResetForm((current) => ({ ...current, confirmPassword: value }))}
                error={resetErrors.confirmPassword}
                shown={showResetConfirmPassword}
                setShown={setShowResetConfirmPassword}
                autoComplete="new-password"
              />
              <button disabled={loading} className="w-full rounded-md bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-60">
                {loading ? "Updating password..." : "Reset password"}
              </button>
            </form>
          )}

          <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
            {mode !== "forgot" ? (
              <button onClick={() => switchMode("forgot")} className="text-cyan-700">
                Forgot password?
              </button>
            ) : null}
            {mode !== "reset" ? (
              <button
                onClick={() => {
                  setResetForm((current) => ({ ...current, email: form.email || current.email, token: current.token || urlToken }));
                  switchMode("reset");
                }}
                className="text-cyan-700"
              >
                Already have a reset token?
              </button>
            ) : null}
            {(mode === "forgot" || mode === "reset") ? (
              <button onClick={() => switchMode("login")} className="text-gray-600">
                Back to login
              </button>
            ) : null}
          </div>

          {resetDetails ? (
            <div className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm">
              <p className="font-semibold text-gray-900">Development reset details</p>
              <p className="mt-2 text-gray-600">Use these immediately while email delivery is not configured.</p>
              {resetDetails.token ? (
                <div className="mt-3 rounded-md bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Token</p>
                  <p className="mt-1 break-all font-mono text-sm text-gray-900">{resetDetails.token}</p>
                </div>
              ) : null}
              {resetDetails.url ? (
                <div className="mt-3 rounded-md bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reset URL</p>
                  <p className="mt-1 break-all text-sm text-gray-900">{resetDetails.url}</p>
                </div>
              ) : null}
              {resetDetails.expiresInMinutes ? (
                <p className="mt-3 text-xs text-gray-500">Valid for {resetDetails.expiresInMinutes} minutes.</p>
              ) : null}
              <button
                onClick={() => {
                  setResetForm((current) => ({ ...current, token: resetDetails.token || current.token }));
                  switchMode("reset");
                }}
                className="mt-4 rounded-md bg-gray-900 px-4 py-2 font-semibold text-white"
              >
                Continue to reset
              </button>
            </div>
          ) : null}

          <div className="mt-5 rounded-md bg-gray-50 p-4 text-xs leading-6 text-gray-600">
            {mode === "login"
              ? "Tip: admin users are redirected to the dashboard automatically after login."
              : mode === "register"
                ? "Your account starts with wishlist, cart sync, notification support, and verified review eligibility after purchase."
                : mode === "forgot"
                  ? "Production setup should send the reset link by email. Until then, the development token shown here works immediately."
                  : "Once reset succeeds, you will be signed in automatically with the new password."}
          </div>
        </section>
      </div>
    </main>
  );
}

function AccountPageFallback() {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 md:px-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-md bg-[#232f3e] p-6 text-white shadow-sm">
          <div className="h-4 w-32 rounded bg-white/15" />
          <div className="mt-4 h-10 w-4/5 rounded bg-white/10" />
          <div className="mt-3 h-4 w-3/4 rounded bg-white/10" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-20 rounded-md border border-white/15 bg-white/5" />
            ))}
          </div>
        </section>
        <section className="rounded-md bg-white p-6 shadow-sm">
          <div className="h-10 rounded-md bg-gray-100" />
          <div className="mt-5 h-8 w-1/2 rounded bg-gray-100" />
          <div className="mt-3 h-4 w-3/4 rounded bg-gray-100" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-14 rounded-md bg-gray-100" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`customer-input mt-1 w-full rounded-md border px-3 py-2 font-normal text-gray-950 placeholder:text-slate-400 outline-none ${error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white focus:border-sky-500"}`}
      />
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  error,
  shown,
  setShown,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  shown: boolean;
  setShown: (shown: boolean) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <div className="relative mt-1">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className={`customer-input w-full rounded-md border px-3 py-2 pr-20 font-normal text-gray-950 placeholder:text-slate-400 outline-none ${error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white focus:border-sky-500"}`}
        />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}
