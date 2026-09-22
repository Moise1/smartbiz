import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Building2, Star, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import AdminSidebar from '../components/Admin/AdminSidebar.jsx';
import UsersSection from '../components/Admin/UsersSection.jsx';
import SubscriptionsSection from '../components/Admin/SubscriptionsSection.jsx';
import CoversSection from '../components/Admin/CoversSection.jsx';

const PAGE_SIZE = 10;

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('businesses');

  // Live search: filter the table 300ms after typing stops, back on page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['all-businesses-admin', page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (search) params.set('search', search);
      return api.get(`/businesses?${params}`);
    },
    keepPreviousData: true,
  });

  const businesses = data?.businesses ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  // Super admin can remove any business (moderation) but not edit its details —
  // owners edit their own from their dashboard.
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/businesses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-businesses-admin'] }),
  });

  return (
    <div className="flex">
      <AdminSidebar section={section} onSelect={setSection} />
      <div className="flex-1 min-w-0 max-w-7xl px-4 sm:px-8 py-10">
      {section === 'covers' && <CoversSection />}
      {section === 'users' && <UsersSection />}
      {section === 'subscriptions' && <SubscriptionsSection />}
      {section === 'businesses' && (
      <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">Super Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Business Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {user?.name}. New businesses are added when you create a business owner.
          </p>
        </div>
      </div>

      {/* Table */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-500" />
            All Businesses
            {total > 0 && <span className="text-sm font-normal text-gray-400">({total})</span>}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search businesses…"
                className="input pl-9"
              />
            </div>
            {total > 0 && (
              <p className="text-sm text-gray-500 whitespace-nowrap hidden md:block">
                Showing {from}–{to} of {total}
              </p>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3 text-center">Verified</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No businesses match “{search}”.
                    </td>
                  </tr>
                ) : businesses.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 tabular-nums">{from + idx}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px]">
                      <Link to={`/businesses/${b.id}`} className="hover:text-brand-600 truncate block">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.category_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.city}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
                        <span className="text-gray-700">{Number(b.avg_rating).toFixed(1)}</span>
                        <span className="text-gray-400 text-xs">({b.review_count})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.is_verified
                        ? <span className="inline-block w-2 h-2 rounded-full bg-brand-500" title="Verified" />
                        : <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="Unverified" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${b.name}"? It disappears from all listings.`)) {
                              deleteMutation.mutate(b.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="btn-secondary py-1 px-2.5 text-red-500 hover:bg-red-50"
                          title="Delete business"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          p === page
                            ? 'bg-brand-600 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>
      </>
      )}
      </div>
    </div>
  );
}
