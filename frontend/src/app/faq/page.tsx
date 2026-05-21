"use client";

import Link from "next/link";

export default function FAQPage() {
  const faqs = [
    {
      question: "How long does it take to craft custom orders?",
      answer: "Custom orders typically take 7-14 business days depending on the material and complexity of the design.",
    },
    {
      question: "Do you ship internationally?",
      answer: "Currently, we ship all across India. We are working on expanding our logistics to support international shipping soon.",
    },
    {
      question: "How can I track my order?",
      answer: "Once your order is confirmed, you can track it live by visiting the 'Orders' section in your account. You will also receive an email with the tracking link.",
    },
    {
      question: "What materials do you use?",
      answer: "We source premium quality Wood, Stone, Metal, and Ceramic from local artisans. Each product listing specifies the exact material used.",
    },
    {
      question: "Can I cancel my order?",
      answer: "Yes, you can cancel your order from your tracking page as long as it hasn't been shipped yet.",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-3xl rounded-md bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-950">Frequently Asked Questions</h1>
        <p className="mt-2 text-gray-600">Find answers to common questions about our products, shipping, and policies.</p>

        <div className="mt-8 space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 pb-4">
              <h2 className="text-lg font-bold text-gray-900">{faq.question}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-md bg-sky-50 p-6 text-center">
          <p className="font-semibold text-gray-900">Still have questions?</p>
          <p className="mt-1 text-sm text-gray-700">Our customer support team is here to help.</p>
          <Link href="/custom-order" className="mt-4 inline-block rounded-md bg-sky-400 px-6 py-2 font-semibold text-gray-900 hover:bg-sky-300">
            Contact Us
          </Link>
        </div>
      </div>
    </main>
  );
}
