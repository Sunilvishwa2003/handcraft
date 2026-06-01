"use client";

import React, { useEffect, useState } from 'react';
import ImageLightbox from './ImageLightbox';
import { motion } from 'framer-motion';
import { getProductImageAlt, getProductImageUrl, ProductImageSource } from '@/lib/api';

type NormalizedImage = { url: string; alt?: string };

type Props = {
  images: import('@/lib/api').ProductImageSource[];
  selectedIndex?: number;
  onSelectedIndexChange?: (idx: number) => void;
};

export default function ProductImageGallery({
  images,
  selectedIndex,
  onSelectedIndexChange,
}: Props) {
  const normalized = images
    .map((img) => {
      const url = getProductImageUrl(img as ProductImageSource);
      const alt = getProductImageAlt(img as ProductImageSource);
      return url ? { url, alt } : null;
    })
    .filter(Boolean) as NormalizedImage[];
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);

  const setSelectedImage = (idx: number) => {
    if (idx < 0 || idx >= normalized.length) {
      return;
    }
    setSelected(idx);
    if (onSelectedIndexChange) {
      onSelectedIndexChange(idx);
    }
  };

  const openAt = (idx: number) => {
    if (idx < 0 || idx >= normalized.length) {
      return;
    }
    setSelectedImage(idx);
    setOpen(true);
  };

  useEffect(() => {
    if (selectedIndex !== undefined && selectedIndex !== selected) {
      setSelected(Math.min(Math.max(0, selectedIndex), normalized.length - 1));
    }
  }, [selectedIndex, normalized.length, selected]);

  useEffect(() => {
    if (selected >= normalized.length) {
      setSelected(0);
      if (onSelectedIndexChange) {
        onSelectedIndexChange(0);
      }
    }
  }, [normalized.length, onSelectedIndexChange, selected]);

  return (
    <div>
      <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <motion.button
          type="button"
          onClick={() => openAt(selected)}
          className="relative flex h-[280px] sm:h-[400px] md:h-[480px] items-center justify-center bg-gray-50 w-full cursor-zoom-in"
        >
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
            type="button"
            onClick={() => setSelectedImage(idx)}
            aria-label={`View image ${idx + 1}`}
            aria-pressed={selected === idx}
            className={`relative h-14 sm:h-16 overflow-hidden rounded-lg border-2 p-0.5 transition ${
              selected === idx ? 'border-sky-500' : 'border-gray-200'
            } cursor-pointer`}
          >
            <img src={img.url} alt={img.alt || ''} className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      <ImageLightbox
        images={normalized}
        initialIndex={selected}
        open={open}
        onClose={() => setOpen(false)}
        onIndexChange={(i) => setSelectedImage(i)}
      />
    </div>
  );
}
