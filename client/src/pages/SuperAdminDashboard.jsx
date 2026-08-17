import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Plus, Building2, Star, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PAGE_SIZE = 10;

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [page, setPage] = useState(1);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['all-businesses-admin', page],
    queryFn: () => api.get(`/businesses?page=${page}&limit=${PAGE_SIZE}`),
    keepPreviousData: true,
  });

  const businesses = data?.businesses ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingId ? api.put(`/businesses/${editingId}`, payload) : api.post('/businesses', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-businesses-admin'] });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/businesses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-businesses-admin'] }),
  });

  function openEdit(b) {
    setForm({
      name: b.name || '',
      description: b.description || '',
      category_id: b.category_id || '',
      phone: b.phone || '',
      email: b.email || '',
      website: b.website || '',
      address: b.address || '',
      city: b.city || '',
      latitude: b.latitude || '',
      longitude: b.longitude || '',
    });
    setEditingId(b.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">Super Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Business Management</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome, {user?.name}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()); }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Business
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card p-6 mb-8 border border-brand-200">
          <h2 className="font-semibold text-gray-900 mb-4">{editingId ? 'Edit Business' : 'New Business'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Name *</label>
              <input value={form.name} onChange={set('name')} className="input" placeholder="e.g. Kigali Coffee House" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <textarea value={form.description} onChange={set('description')} rows={3} className="input resize-none" placeholder="Describe the business…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
              <select value={form.category_id} onChange={set('category_id')} className="input">
                <option value="">Select category</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City / District *</label>
              <input value={form.city} onChange={set('city')} className="input" placeholder="e.g. Gasabo" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={form.phone} onChange={set('phone')} className="input" placeholder="+250 7xx xxx xxx" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="contact@business.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <input value={form.address} onChange={set('address')} className="input" placeholder="Street, District, Rwanda" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
              <input value={form.website} onChange={set('website')} className="input" placeholder="https://…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
              <input value={form.latitude} onChange={set('latitude')} className="input" placeholder="-1.94" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
              <input value={form.longitude} onChange={set('longitude')} className="input" placeholder="30.06" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Update' : 'Create Business'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-secondary">Cancel</button>
          </div>
          {saveMutation.error && <p className="mt-3 text-sm text-red-500">{saveMutation.error.message}</p>}
        </div>
      )}

      {/* Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-500" />
            All Businesses
            {total > 0 && <span className="text-sm font-normal text-gray-400">({total})</span>}
          </h2>
          {total > 0 && (
            <p className="text-sm text-gray-500">
              Showing {from}–{to} of {total}
            </p>
          )}
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
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(b)} className="btn-secondary py-1 px-2.5" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(b.id)}
                          disabled={deleteMutation.isPending}
                          className="btn-secondary py-1 px-2.5 text-red-500 hover:bg-red-50"
                          title="Delete"
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
    </div>
  );
}

function emptyForm() {
  return { name: '', description: '', category_id: '', phone: '', email: '', website: '', address: '', city: 'Kigali', latitude: '', longitude: '' };
}
