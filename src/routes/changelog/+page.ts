
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ fetch, url }) => {
  const page = Number(url.searchParams.get('page')) || 1;

  try {
    const response = await fetch(`/api/changelog?page=${page}`);

    if (!response.ok) {
      throw error(response.status, 'Failed to fetch changelog');
    }

    const data = await response.json();

    return {
      films: data.films,
      page: data.page,
      hasNext: data.hasNext,
      totalCount: data.totalCount,
      pagination: data.pagination,
      error: data.error
    };
  } catch (e) {
    console.error("Load error:", e);
    return {
      films: [],
      page,
      hasNext: false,
      totalCount: 0,
      pagination: null,
      error: "Failed to load data"
    };
  }
};
