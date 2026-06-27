import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Star, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const { data: myBusinesses, isLoading } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => api.get('/businesses/mine'),
    enabled: user?.role === 'business_owner' || user?.role === 'admin',
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingId ? api.put(`/businesses/${editingId}`, data) : api.post('/businesses', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-businesses'] });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/businesses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-businesses'] }),
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
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
        </div>
        {(user?.role === 'business_owner' || user?.role === 'admin') && (
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Business
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">{editingId ? 'Edit Business' : 'New Business'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Name *</label>
              <input value={form.name} onChange={set('name')} className="input" placeholder="e.g. Kigali Coffee House" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <textarea value={form.description} onChange={set('description')} rows={3} className="input resize-none" placeholder="Describe your business…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
              <select value={form.category_id} onChange={set('category_id')} className="input">
                <option value="">Select category</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
              <input value={form.city} onChange={set('city')} className="input" placeholder="Kigali" />
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
              <input value={form.address} onChange={set('address')} className="input" placeholder="Street, District" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
              <input value={form.website} onChange={set('website')} className="input" placeholder="https://…" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-secondary">
              Cancel
            </button>
          </div>
          {saveMutation.error && (
            <p className="mt-3 text-sm text-red-500">{saveMutation.error.message}</p>
          )}
        </div>
      )}

      {/* My Businesses */}
      {(user?.role === 'business_owner' || user?.role === 'admin') && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-500" />
            My Businesses
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-20 card animate-pulse bg-gray-100" />)}
            </div>
          ) : myBusinesses?.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>You haven't listed any businesses yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myBusinesses?.map((b) => (
                <div key={b.id} className="card p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/businesses/${b.id}`} className="font-semibold text-gray-900 hover:text-brand-600 truncate">
                        {b.name}
                      </Link>
                      {b.is_verified && <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">Verified</span>}
                    </div>
                    <p className="text-sm text-gray-500">{b.category_name} · {b.city}</p>
                    <div className="flex items-center gap-1 text-sm text-amber-500 mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {Number(b.avg_rating).toFixed(1)} ({b.review_count} reviews)
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(b)} className="btn-secondary py-1.5 px-3">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(b.id)}
                      disabled={deleteMutation.isPending}
                      className="btn-secondary py-1.5 px-3 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {user?.role === 'user' && (
        <div className="card p-8 text-center text-gray-500">
          <p className="mb-3">You're logged in as a customer.</p>
          <Link to="/businesses" className="btn-primary inline-flex">Browse Businesses</Link>
        </div>
      )}
    </div>
  );
}

function emptyForm() {
  return { name: '', description: '', category_id: '', phone: '', email: '', website: '', address: '', city: 'Kigali', latitude: '', longitude: '' };
}
