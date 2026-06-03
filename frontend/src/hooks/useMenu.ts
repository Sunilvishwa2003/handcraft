"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { storefrontFeaturedCategories } from '@/lib/catalog';

export const fetchMenuData = async () => {
  const result = await apiFetch<{ success: boolean; data: string[] }>('/products/menu');
  return result.data || [];
};

export default function useMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: fetchMenuData,
    placeholderData: [...storefrontFeaturedCategories],
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 6,
    retry: 1,
  });
}
