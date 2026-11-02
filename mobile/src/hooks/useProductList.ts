import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage, ProductQuery } from '../api/client';
import type { Product } from '../api/types';

const PAGE_SIZE = 10;

/**
 * Tải danh sách sản phẩm có phân trang (cuộn tới cuối thì tải thêm 10 sản phẩm).
 * Khi bộ lọc thay đổi sẽ tải lại từ trang 1; kết quả của lần gọi cũ bị bỏ qua.
 */
export function useProductList(query: Omit<ProductQuery, 'page' | 'limit'>, enabled = true) {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const key = JSON.stringify(query);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const id = ++requestId.current;
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const res = await api.products({ ...JSON.parse(key), page: 1, limit: PAGE_SIZE });
        if (id !== requestId.current) return;
        setItems(res.items);
        setTotal(res.total);
        setPage(1);
        setHasMore(res.hasMore);
      } catch (e) {
        if (id === requestId.current) setError(errorMessage(e));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [key],
  );

  useEffect(() => {
    if (enabled) load('initial');
  }, [load, enabled]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await api.products({ ...JSON.parse(key), page: page + 1, limit: PAGE_SIZE });
      if (id !== requestId.current) return;
      // Bỏ trùng phòng khi dữ liệu thay đổi giữa 2 lần gọi
      setItems((prev) => [...prev, ...res.items.filter((p) => !prev.some((x) => x.id === p.id))]);
      setPage(res.page);
      setHasMore(res.hasMore);
    } catch {
      // Lỗi khi tải thêm: giữ danh sách hiện tại, lần cuộn sau sẽ thử lại
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, key, page]);

  return {
    items,
    total,
    hasMore,
    loading,
    loadingMore,
    refreshing,
    error,
    loadMore,
    refresh: () => load('refresh'),
    retry: () => load('initial'),
  };
}
