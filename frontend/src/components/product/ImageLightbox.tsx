"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoChevronBackSharp, IoChevronForwardSharp } from 'react-icons/io5';

type Props = {
  images: { url: string; alt?: string }[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  onIndexChange?: (idx: number) => void;
};

export default function ImageLightbox({ images, initialIndex, open, onClose, onIndexChange }: Props) {
  const [index, setIndex] = useState(initialIndex || 0);
  const [zoom, setZoom] = useState(1);
  const [pointerStart, setPointerStart] = useState<{ x: number; y: number } | null>(null);

  const clampZoom = (value: number) => Math.max(1, Math.min(3, value));

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setIndex(initialIndex || 0);
      setZoom(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, initialIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length, onClose]);

  useEffect(() => {
    if (onIndexChange) onIndexChange(index);
  }, [index, onIndexChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setPointerStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart) return;
    const deltaX = e.clientX - pointerStart.x;
    const deltaY = e.clientY - pointerStart.y;
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        setIndex((i) => Math.min(images.length - 1, i + 1));
      } else {
        setIndex((i) => Math.max(0, i - 1));
      }
    }
    setPointerStart(null);
  };

  const toggleZoom = () => {
    setZoom((current) => (current > 1 ? 1 : 2));
  };

  if (!images || !images.length) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          aria-modal
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <div className="relative max-w-[96%] max-h-[92%] w-full">
            <button
              aria-label="Close"
              onClick={onClose}
              className="absolute right-2 top-2 z-50 rounded-full bg-black/30 p-2 text-white"
            >
              <IoClose size={20} />
            </button>

            <button
              aria-label="Previous"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="absolute left-2 top-1/2 z-40 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white"
            >
              <IoChevronBackSharp size={22} />
            </button>

            <button
              aria-label="Next"
              onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}
              className="absolute right-12 top-1/2 z-40 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white"
            >
              <IoChevronForwardSharp size={22} />
            </button>

            <div className="flex items-center justify-center h-full w-full">
              <motion.img
                key={images[index].url}
                src={images[index].url}
                alt={images[index].alt || ''}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="max-h-[80vh] max-w-full object-contain"
                style={{ transform: `scale(${zoom})` }}
                onDoubleClick={toggleZoom}
              />
            </div>

            {/* Thumbnails */}
            <div className="absolute left-2 top-2 z-40 flex items-center gap-2">
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((current) => clampZoom(current - 0.25))}
                className="rounded-full bg-black/30 p-2 text-white"
              >
                −
              </button>
              <button
                aria-label="Zoom reset"
                onClick={() => setZoom(1)}
                className="rounded-full bg-black/30 p-2 text-white"
              >
                1x
              </button>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((current) => clampZoom(current + 0.25))}
                className="rounded-full bg-black/30 p-2 text-white"
              >
                +
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 overflow-auto">
              {images.map((img, i) => (
                <button
                  key={img.url + i}
                  onClick={() => setIndex(i)}
                  className={`h-16 w-16 overflow-hidden rounded-md border-2 p-0 ${i === index ? 'border-sky-500' : 'border-transparent'}`}
                >
                  <img src={img.url} alt={img.alt || ''} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
