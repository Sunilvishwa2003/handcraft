import { apiFetch } from "@/lib/api";
import { Order } from "@/lib/types";

type RazorpayCreateOrderResponse = {
  keyId: string;
  orderId: string;
  order_id?: string;
  amount: number;
  currency: string;
};

type RazorpayVerifyResponse = {
  verified: boolean;
  order: Order;
};

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessPayload) => void | Promise<void>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (eventName: "payment.failed", listener: (response: RazorpayFailurePayload) => void) => void;
};

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

type RazorpayFailurePayload = {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
};

type WindowWithRazorpay = Window & {
  Razorpay?: RazorpayConstructor;
};

type LaunchRazorpayCheckoutParams = {
  createOrderPayload: Record<string, unknown>;
  verifyPayload: Record<string, unknown>;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  description?: string;
  dismissMessage?: string;
};

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-script";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptLoadPromise: Promise<void> | null = null;

const loadRazorpayScript = async () => {
  if (typeof window === "undefined") {
    throw new Error("Razorpay checkout is only available in the browser.");
  }

  const razorpayWindow = window as WindowWithRazorpay;
  if (razorpayWindow.Razorpay) {
    return;
  }

  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Could not load Razorpay checkout.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = RAZORPAY_SCRIPT_ID;
      script.src = RAZORPAY_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
      document.body.appendChild(script);
    });
  }

  await scriptLoadPromise;
};

export const launchRazorpayCheckout = async ({
  createOrderPayload,
  verifyPayload,
  customer,
  description = "Secure online payment",
  dismissMessage = "Payment window closed before the payment could be completed.",
}: LaunchRazorpayCheckoutParams) => {
  await loadRazorpayScript();

  const checkoutOrder = await apiFetch<RazorpayCreateOrderResponse>("/payment/create-order", {
    method: "POST",
    body: JSON.stringify(createOrderPayload),
  });

  return new Promise<Order>((resolve, reject) => {
    const razorpayWindow = window as WindowWithRazorpay;
    const Razorpay = razorpayWindow.Razorpay;
    const publicKey = checkoutOrder.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    if (!Razorpay) {
      reject(new Error("Razorpay checkout is unavailable right now."));
      return;
    }
    if (!publicKey) {
      reject(new Error("NEXT_PUBLIC_RAZORPAY_KEY_ID is not configured."));
      return;
    }

    const resolvedOrderId = checkoutOrder.orderId || checkoutOrder.order_id || "";
    if (!resolvedOrderId) {
      reject(new Error("The server did not return a Razorpay order ID."));
      return;
    }

    let settled = false;
    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      callback();
    };

    const razorpay = new Razorpay({
      key: publicKey,
      amount: checkoutOrder.amount,
      currency: checkoutOrder.currency,
      name: "MahabsCrafto",
      description,
      order_id: resolvedOrderId,
      prefill: customer,
      theme: {
        color: "#0f766e",
      },
      modal: {
        ondismiss: () => settle(() => reject(new Error(dismissMessage))),
      },
      handler: async (response) => {
        try {
          const verification = await apiFetch<RazorpayVerifyResponse>("/payment/verify", {
            method: "POST",
            body: JSON.stringify({
              ...verifyPayload,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          settle(() => resolve(verification.order));
        } catch (error) {
          settle(() =>
            reject(error instanceof Error ? error : new Error("Could not verify the Razorpay payment."))
          );
        }
      },
    });

    razorpay.on("payment.failed", (response) => {
      const description = response.error?.description || "Payment failed before completion.";
      const reason = response.error?.reason ? ` ${response.error.reason}` : "";
      settle(() => reject(new Error(`${description}${reason}`.trim())));
    });

    razorpay.open();
  });
};
