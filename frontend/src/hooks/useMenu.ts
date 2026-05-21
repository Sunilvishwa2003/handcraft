"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export const fetchMenuData = async () => {
  const result = await apiFetch<{ success: boolean; data: string[] }>('/products/menu');
  return result.data || [];
};

export default function useMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: fetchMenuData,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
}
