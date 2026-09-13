import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react';
import api from '../api/client.js';
import BusinessCard from '../components/Business/BusinessCard.jsx';
import CategoryIcon from '../components/Business/CategoryIcon.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

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

export default function Businesses() {
  const { t, translateCategory } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);
  const [manageError, setManageError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
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

  // A logged-in owner gets upload/delete controls on their own businesses
  // (an admin gets them on every business), same as the superadmin's
  // Featured section. The API enforces ownership on both endpoints.
  const isOwnerRole = user?.role === 'business_owner' || user?.role === 'admin';
  const { data: myBusinesses } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => api.get('/businesses/mine'),
    enabled: isOwnerRole,
  });
  const ownedIds = new Set((myBusinesses || []).map((b) => b.id));

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['businesses'] });
    qc.invalidateQueries({ queryKey: ['my-businesses'] });
  }

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }) => {
      const fd = new FormData();
      fd.append('image', file);
      return api.post(`/businesses/${id}/cover`, fd);
    },
    onMutate: ({ id }) => { setBusyId(id); setManageError(null); },
    onSuccess: invalidate,
    onError: (err) => setManageError(err?.message || 'Could not upload the image.'),
    onSettled: () => setBusyId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/businesses/${id}`),
    onMutate: (id) => { setBusyId(id); setManageError(null); },
    onSuccess: invalidate,
    onError: (err) => setManageError(err?.message || 'Could not delete the business.'),
    onSettled: () => setBusyId(null),
  });

  // Props BusinessCard needs to show the cover controls, or none at all
  function manageProps(b) {
    if (!isOwnerRole || (user.role !== 'admin' && !ownedIds.has(b.id))) return {};
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

  // Live filtering: apply the search text 300ms after the user stops typing,
  // no button click or Enter needed.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

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
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Local Businesses</h1>

      {/* Filters */}
      <form
        onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}
        className="card p-4 mb-8 flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('hero.searchPlaceholder')}
            className="input pl-9"
          />
        </div>
        <button type="submit" className="btn-primary whitespace-nowrap">{t('hero.search')}</button>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input sm:w-52"
        >
          <option value="">{t('categories.all')}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{translateCategory(c.name)}</option>
          ))}
        </select>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City…"
          className="input sm:w-36"
        />
      </form>

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
          {manageError && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{manageError}</p>
          )}
          {!categoryId && !search ? (
            // Grouped browse: every category leads with its premium subscribers
            groupByCategory(data?.businesses).map((g) => (
              <div key={g.name} className="mb-10">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <CategoryIcon category={g.name} className="w-5 h-5 text-brand-500" />
                  {translateCategory(g.name)}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {g.items.map((b) => (
                    <BusinessCard key={b.id} business={b} {...manageProps(b)} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.businesses?.map((b) => (
                <BusinessCard key={b.id} business={b} {...manageProps(b)} />
              ))}
            </div>
          )}
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
