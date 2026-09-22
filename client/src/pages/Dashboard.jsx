import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Star, Edit, Trash2, Eye, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import OwnerSidebar from '../components/Dashboard/OwnerSidebar.jsx';
import ViewsChart from '../components/Dashboard/ViewsChart.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [coverFile, setCoverFile] = useState(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const isOwner = user?.role === 'business_owner' || user?.role === 'admin';

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setCoverFile(null);
    setShowNewCat(false);
    setNewCatName('');
  }

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const { data: myBusinesses, isLoading } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => api.get('/businesses/mine'),
    enabled: isOwner,
  });

  const { data: mySubscriptions } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => api.get('/subscriptions/mine'),
    enabled: isOwner,
  });

  const { data: viewsSeries } = useQuery({
    queryKey: ['my-business-views'],
    queryFn: () => api.get('/businesses/mine/views?days=30'),
    enabled: isOwner,
  });

  const totalViews = (myBusinesses || []).reduce((sum, b) => sum + Number(b.viewed_times || 0), 0);

  const saveMutation = useMutation({
    // Save the business, then (optionally) upload a chosen cover photo to it.
    mutationFn: async (data) => {
      const saved = editingId
        ? await api.put(`/businesses/${editingId}`, data)
        : await api.post('/businesses', data);
      const id = saved?.id || editingId;
      if (coverFile && id) {
        const fd = new FormData();
        fd.append('image', coverFile);
        await api.post(`/businesses/${id}/cover`, fd);
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-businesses'] });
      qc.invalidateQueries({ queryKey: ['businesses'] });
      resetForm();
    },
  });

  const createCatMutation = useMutation({
    mutationFn: (name) => api.post('/categories', { name }),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setForm((f) => ({ ...f, category_id: String(cat.id) }));
      setShowNewCat(false);
      setNewCatName('');
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
    setCoverFile(null);
    setShowNewCat(false);
    setNewCatName('');
    setShowForm(true);
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Empty optional fields must go to the API as null — Postgres rejects ''
  // for numeric columns like latitude/longitude.
  function buildPayload() {
    const clean = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);
    return {
      ...form,
      phone: clean(form.phone),
      email: clean(form.email),
      website: clean(form.website),
      address: clean(form.address),
      latitude: clean(form.latitude),
      longitude: clean(form.longitude),
    };
  }

  function errorText(err) {
    if (Array.isArray(err?.errors) && err.errors.length) {
      return err.errors.map((e) => e.msg).join('. ');
    }
    return err?.message || 'Could not save the business. Please try again.';
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex items-start gap-8">
      {isOwner && (
        <OwnerSidebar businesses={myBusinesses || []} subscriptions={mySubscriptions || []} />
      )}

      <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
        </div>
        {isOwner && (
          <button onClick={() => (showForm ? resetForm() : (resetForm(), setShowForm(true)))} className="btn-primary">
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-600">Category *</label>
                <button
                  type="button"
                  onClick={() => { setShowNewCat((s) => !s); createCatMutation.reset(); }}
                  className="text-xs text-brand-600 hover:underline"
                >
                  {showNewCat ? 'Choose existing' : '+ New category'}
                </button>
              </div>
              {showNewCat ? (
                <div className="flex gap-2">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="input"
                    placeholder="New category name"
                  />
                  <button
                    type="button"
                    onClick={() => createCatMutation.mutate(newCatName.trim())}
                    disabled={!newCatName.trim() || createCatMutation.isPending}
                    className="btn-primary whitespace-nowrap"
                  >
                    {createCatMutation.isPending ? 'Adding…' : 'Add'}
                  </button>
                </div>
              ) : (
                <select value={form.category_id} onChange={set('category_id')} className="input">
                  <option value="">Select category</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {createCatMutation.error && (
                <p className="text-xs text-red-500 mt-1">
                  {createCatMutation.error?.message || 'Could not create the category.'}
                </p>
              )}
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Latitude (optional)</label>
              <input type="number" step="any" value={form.latitude} onChange={set('latitude')} className="input" placeholder="-1.9441" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Longitude (optional)</label>
              <input type="number" step="any" value={form.longitude} onChange={set('longitude')} className="input" placeholder="30.0619" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Business picture (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:font-medium hover:file:bg-brand-100"
              />
              <p className="text-xs text-gray-400 mt-1">
                {coverFile
                  ? `Selected: ${coverFile.name}`
                  : "Optional — if you don't upload one, an image based on the category is shown."}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => saveMutation.mutate(buildPayload())}
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
            <button onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          </div>
          {saveMutation.error && (
            <p className="mt-3 text-sm text-red-500">{errorText(saveMutation.error)}</p>
          )}
        </div>
      )}

      {/* Profile views */}
      {isOwner && (
        <section className="card p-6 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-500" />
              Profile views
            </h2>
            <span className="text-sm text-gray-500 flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {totalViews.toLocaleString('en-US')} all-time
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            How many times the public viewed your business profiles — last 30 days
          </p>
          <ViewsChart data={viewsSeries || []} />
        </section>
      )}

      {/* My Businesses */}
      {isOwner && (
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
                    <div className="flex items-center gap-3 text-sm mt-1">
                      <span className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {Number(b.avg_rating).toFixed(1)} ({b.review_count} reviews)
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Eye className="w-3.5 h-3.5" />
                        {Number(b.viewed_times || 0).toLocaleString('en-US')} views
                      </span>
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
    </div>
  );
}

function emptyForm() {
  return { name: '', description: '', category_id: '', phone: '', email: '', website: '', address: '', city: 'Kigali', latitude: '', longitude: '' };
}
