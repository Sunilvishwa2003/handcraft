"use client";

import React, { useState } from 'react';
import ImageLightbox from './ImageLightbox';
import { motion } from 'framer-motion';
import { getProductImageAlt, getProductImageUrl, ProductImageSource } from '@/lib/api';

type NormalizedImage = { url: string; alt?: string };

export default function ProductImageGallery({ images }: { images: import('@/lib/api').ProductImageSource[] }) {
  const normalized = images
    .map((img) => {
      const url = getProductImageUrl(img as ProductImageSource);
      const alt = getProductImageAlt(img as ProductImageSource);
      return url ? { url, alt } : null;
    })
    .filter(Boolean) as NormalizedImage[];
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);

  const openAt = (idx: number) => {
    setSelected(idx);
    setOpen(true);
  };

  return (
    <div>
      <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <motion.button onClick={() => openAt(selected)} className="relative flex h-[280px] sm:h-[400px] md:h-[480px] items-center justify-center bg-gray-50 w-full">
          {normalized[selected]?.url ? (
            <img
              src={normalized[selected].url}
              alt={normalized[selected].alt || ''}
              className="h-full w-full object-contain p-4"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">No image available</div>
          )}
        </motion.button>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {normalized.map((img, idx) => (
          <button
            key={img.url + idx}
            onClick={() => setSelected(idx)}
            aria-label={`View image ${idx + 1}`}
            className={`relative h-14 sm:h-16 overflow-hidden rounded-lg border-2 p-0.5 transition ${
              selected === idx ? 'border-sky-500' : 'border-gray-200'
            }`}
          >
            <img src={img.url} alt={img.alt || ''} className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      <ImageLightbox images={normalized} initialIndex={selected} open={open} onClose={() => setOpen(false)} onIndexChange={(i) => setSelected(i)} />
    </div>
  );
}
