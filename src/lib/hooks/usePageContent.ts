'use client';
import { useEffect, useState } from 'react';

type Content = Record<string, Record<string, string>>;

export function usePageContent(page: string) {
  const [content, setContent] = useState<Content>({});
  useEffect(() => {
    fetch(`/api/page-content?page=${page}`)
      .then(r => r.json())
      .then(d => setContent(d))
      .catch(() => {});
  }, [page]);

  function get(section: string, key: string, fallback = '') {
    return content[section]?.[key] ?? fallback;
  }
  return { content, get };
}
