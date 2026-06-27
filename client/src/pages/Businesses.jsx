import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import api from '../api/client.js';
import BusinessCard from '../components/Business/BusinessCard.jsx';

export default function Businesses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['businesses', search, categoryId, city, page],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.set('search', search);
      if (categoryId) params.set('category_id', categoryId);
      if (city) params.set('city', city);
      return api.get(`/businesses?${params}`);
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (categoryId) params.category_id = categoryId;
    if (city) params.city = city;
    setSearchParams(params);
    setPage(1);
  }, [search, categoryId, city]);

  const totalPages = data ? Math.ceil(data.total / 12) : 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Local Businesses</h1>

      {/* Filters */}
      <div className="card p-4 mb-8 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses…"
            className="input pl-9"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input sm:w-52"
        >
          <option value="">All Categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City…"
          className="input sm:w-36"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-64 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : data?.businesses?.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No businesses found. Try a different search.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{data?.total} businesses found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.businesses?.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
