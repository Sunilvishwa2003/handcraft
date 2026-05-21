"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiFetch, getStoredUser } from "@/lib/api";
import { Product } from "@/lib/types";

type Message = {
  role: "user" | "assistant";
  text: string;
  products?: Product[];
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Ask me for product ideas, coupon help, or order tracking." },
  ]);
  const [loading, setLoading] = useState(false);
  const quickPrompts = [
    "Find gift recommendations",
    "Track my order",
    "Apply coupons",
    "Show handcrafted decor",
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim()) {
      return;
    }

    setInput("");
    setMessages((items) => [...items, { role: "user", text }]);
    setLoading(true);

    try {
      const user = getStoredUser();
      const response = await apiFetch<{ answer: string; products?: Product[] }>("/ai/chatbot", {
        method: "POST",
        body: JSON.stringify({ message: text, userId: user?._id }),
      });
      setMessages((items) => [...items, { role: "assistant", text: response.answer, products: response.products }]);
    } catch (error) {
      setMessages((items) => [...items, { role: "assistant", text: error instanceof Error ? error.message : "Chat is unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    await sendMessage(input.trim());
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <section className="w-[min(360px,calc(100vw-32px))] rounded-md border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <h2 className="font-semibold text-gray-900">AI shopping assistant</h2>
            <button className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="border-b border-gray-200 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Try a quick prompt</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 hover:border-sky-300 hover:text-sky-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          <div role="status" aria-live="polite" className="max-h-72 space-y-3 overflow-y-auto p-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                <p className={`inline-block rounded-md px-3 py-2 text-sm ${message.role === "user" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
                  {message.text}
                </p>
                {message.products?.length ? (
                  <div className="mt-2 grid gap-2 text-left">
                    {message.products.map((product) => (
                      <Link key={product._id} href={`/products/${product._id}`} className="rounded-md border border-gray-200 p-2 text-xs text-gray-700 hover:bg-gray-50">
                        {product.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? <p className="text-xs text-gray-500">Thinking...</p> : null}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-gray-200 p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500"
              placeholder="Search, compare, track..."
            />
            <button className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white">Send</button>
          </form>
        </section>
      ) : null}
      <button onClick={() => setOpen(true)} className="mt-3 rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
        AI chat
      </button>
    </div>
  );
}
