"use client";

import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-3xl rounded-md bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-950">Return & Refund Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: April 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Returns</h2>
            <p className="mt-2">
              We want you to be completely satisfied with your handcrafted purchase. You have 7 days from the date of delivery to request a return if the item is defective, damaged, or not as described. To be eligible for a return, your item must be unused, in the same condition that you received it, and in its original packaging.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">2. Exceptions / Non-returnable Items</h2>
            <p className="mt-2">
              Please note that custom or personalized orders cannot be returned unless they arrive damaged or defective. Perishable goods and intimate items are also non-returnable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">3. Refunds</h2>
            <p className="mt-2">
              Once we receive and inspect your return, we will notify you of the approval or rejection of your refund. If approved, the refund will be processed and credited to your original method of payment within 5-7 business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">4. Shipping for Returns</h2>
            <p className="mt-2">
              You will be responsible for paying your own shipping costs for returning your item, unless the return is due to our error (e.g., defective or incorrect item). Shipping costs are non-refundable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">5. Cancellations</h2>
            <p className="mt-2">
              You can cancel your order directly from your account dashboard anytime before the order has been marked as &quot;packed&quot; or &quot;shipped&quot;. Once shipped, the order cannot be cancelled, but you may initiate a return upon delivery.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <Link href="/" className="text-cyan-700 hover:underline font-semibold">
            &larr; Back to Shop
          </Link>
        </div>
      </div>
    </main>
  );
}
