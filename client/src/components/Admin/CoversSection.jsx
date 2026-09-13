import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Images, Search, SlidersHorizontal } from 'lucide-react';
import api from '../../api/client.js';
import BusinessCard from '../Business/BusinessCard.jsx';
import CategoryIcon from '../Business/CategoryIcon.jsx';

const PAGE_SIZE = 12;

// Group an already-ordered list into consecutive category sections.
function groupByCategory(list = []) {
  const groups = [];
  for (const b of list) {
    const name = b.category_name || 'Other';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(b);
    else groups.push({ name, items: [b] });
  }
  return groups;
}

// Every business across all categories, as cards, with cover upload/delete on
// each. Admins manage any business, so the controls always show.
export default function CoversSection() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);

  // Live search 300ms after typing stops, back to page 1.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [categoryId]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-covers', page, search, categoryId],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (search) params.set('search', search);
      if (categoryId) params.set('category_id', categoryId);
      return api.get(`/businesses?${params}`);
    },
    keepPreviousData: true,
  });

  const businesses = data?.businesses ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const grouped = !search && !categoryId;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['admin-covers'] });
    qc.invalidateQueries({ queryKey: ['businesses'] });
    qc.invalidateQueries({ queryKey: ['all-businesses-admin'] });
  }

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }) => {
      const fd = new FormData();
      fd.append('image', file);
      return api.post(`/businesses/${id}/cover`, fd);
    },
    onMutate: ({ id }) => { setBusyId(id); setError(null); },
    onSuccess: invalidate,
    onError: (err) => setError(err?.message || 'Could not upload the image.'),
    onSettled: () => setBusyId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/businesses/${id}`),
    onMutate: (id) => { setBusyId(id); setError(null); },
    onSuccess: invalidate,
    onError: (err) => setError(err?.message || 'Could not delete the business.'),
    onSettled: () => setBusyId(null),
  });

  function manageProps(b) {
    return {
      canManage: true,
      busy: busyId === b.id,
      onUpload: (file) => uploadMutation.mutate({ id: b.id, file }),
      onDelete: () => {
        if (window.confirm(`Delete "${b.name}"? It disappears from all listings.`)) {
          deleteMutation.mutate(b.id);
        }
      },
    };
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-1 flex items-center gap-1.5">
        <Images className="w-3.5 h-3.5" />
        Super Admin
      </p>
      <h1 className="text-2xl font-bold text-gray-900">Business Categories</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Every business, across all categories. Hover a cover to replace its photo or delete the business.
      </p>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search businesses…"
            className="input pl-9"
          />
        </div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input sm:w-56">
          <option value="">All categories</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 card animate-pulse bg-gray-100" />)}
        </div>
      ) : businesses.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No businesses match your filters.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{total} businesses</p>
          {grouped ? (
            groupByCategory(businesses).map((g) => (
              <div key={g.name} className="mb-10">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <CategoryIcon category={g.name} className="w-5 h-5 text-brand-500" />
                  {g.name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {g.items.map((b) => <BusinessCard key={b.id} business={b} {...manageProps(b)} />)}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {businesses.map((b) => <BusinessCard key={b.id} business={b} {...manageProps(b)} />)}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary">Previous</button>
              <span className="flex items-center px-4 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
