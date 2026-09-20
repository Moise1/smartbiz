import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Search, Star, Users as UsersIcon, X, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';

const ROLE_STYLES = {
  admin: 'bg-purple-50 text-purple-700',
  business_owner: 'bg-brand-50 text-brand-700',
  user: 'bg-gray-100 text-gray-600',
};
const ROLE_LABELS = { admin: 'Admin', business_owner: 'Business owner', user: 'Customer' };

export default function UsersSection() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => setActionError(err?.message || 'Could not delete the user.'),
  });

  function handleDelete(u) {
    setActionError(null);
    const extra = u.business_count > 0
      ? ` This also deletes their ${u.business_count} business${u.business_count === 1 ? '' : 'es'}.`
      : '';
    if (window.confirm(`Delete ${u.name}?${extra} This cannot be undone.`)) {
      deleteMutation.mutate(u.id);
    }
  }

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-user', selectedId],
    queryFn: () => api.get(`/users/${selectedId}`),
    enabled: selectedId != null,
  });

  // Client-side filter across name, email, and role — instant as you type.
  const q = search.trim().toLowerCase();
  const filtered = q
    ? users?.filter((u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (ROLE_LABELS[u.role] || u.role).toLowerCase().includes(q)
      )
    : users;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Users</h1>
          <p className="text-gray-500 text-sm">
            Everyone registered on SmartBiz{users ? ` — ${users.length} accounts` : ''}
            {q && filtered ? ` · ${filtered.length} matching` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or role…"
              className="input pl-9"
            />
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary whitespace-nowrap">
            <UserPlus className="w-4 h-4" />
            Add Business Owner
          </button>
        </div>
      </div>

      {showAdd && <AddOwnerModal onClose={() => setShowAdd(false)} qc={qc} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} qc={qc} />}

      {actionError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{actionError}</p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Businesses</th>
                <th className="px-4 py-3 text-right">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {q ? <>No users match “{search}”.</> : 'No users yet.'}
                  </td>
                </tr>
              ) : filtered?.map((u, idx) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-gray-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[u.role] || ROLE_STYLES.user}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{u.business_count}</td>
                  <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionError(null); setEditUser(u); }}
                        disabled={u.is_superadmin}
                        className="btn-secondary py-1 px-2.5 disabled:opacity-40"
                        title={u.is_superadmin ? 'The super admin cannot be edited' : 'Edit user'}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(u); }}
                        disabled={deleteMutation.isPending || u.is_superadmin}
                        className="btn-secondary py-1 px-2.5 text-red-500 hover:bg-red-50 disabled:opacity-40"
                        title={u.is_superadmin ? 'The super admin cannot be deleted' : 'Delete user'}
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
      </div>

      {/* User detail card */}
      {selectedId != null && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="card w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {detailLoading || !detail ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-6 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-24 bg-gray-100 rounded" />
              </div>
            ) : (
              <>
                {/* Owner details */}
                <div className="flex items-center gap-4 mb-1">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg shrink-0">
                    {detail.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 truncate">{detail.name}</h2>
                    <p className="text-sm text-gray-500 truncate">{detail.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 mb-6 text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[detail.role] || ROLE_STYLES.user}`}>
                    {ROLE_LABELS[detail.role] || detail.role}
                  </span>
                  <span className="text-gray-400">
                    Joined {new Date(detail.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Their businesses */}
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-brand-500" />
                  Businesses ({detail.businesses.length})
                </h3>
                {detail.businesses.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                    This user doesn't own any businesses yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.businesses.map((b) => (
                      <Link
                        key={b.id}
                        to={`/businesses/${b.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:border-brand-200 hover:bg-brand-50/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{b.name}</p>
                          <p className="text-xs text-gray-500">{b.category_name ?? '—'} · {b.city}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          {b.plan_active && (
                            <span className="capitalize bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                              {b.plan}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span className="text-gray-700">{Number(b.avg_rating).toFixed(1)}</span>
                            <span className="text-gray-400">({b.review_count})</span>
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function AddOwnerModal({ onClose, qc }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [business, setBusiness] = useState({ name: '', description: '', category_id: '', city: 'Kigali' });
  const [created, setCreated] = useState(null);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setBiz = (field) => (e) => setBusiness((b) => ({ ...b, [field]: e.target.value }));

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/users/business-owners', { ...form, business }),
    onSuccess: (user) => {
      setCreated(user);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['all-businesses-admin'] });
      qc.invalidateQueries({ queryKey: ['businesses'] });
    },
  });

  function errorText(err) {
    if (Array.isArray(err?.errors) && err.errors.length) return err.errors.map((e) => e.msg).join('. ');
    return err?.message || 'Could not create the account.';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[88vh] overflow-y-auto p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700" title="Close">
          <X className="w-5 h-5" />
        </button>

        {created ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Business owner created</h2>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-700">{created.name}</span> can now sign in with{' '}
              <span className="font-medium text-gray-700">{created.email}</span> and the password you set.
              {created.business && (
                <> Their business <span className="font-medium text-gray-700">{created.business.name}</span> was created and linked to them.</>
              )}
            </p>
            <button onClick={onClose} className="btn-primary mt-5 justify-center">Done</button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand-500" />
              Add Business Owner
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Create a business-owner account and their first business — both are created together.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
              className="space-y-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Owner</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input required value={form.name} onChange={set('name')} className="input" placeholder="Jane Uwase" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={form.email} onChange={set('email')} className="input" placeholder="owner@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary password</label>
                <input type="text" required minLength={6} value={form.password} onChange={set('password')} className="input" placeholder="Min. 6 characters" />
                <p className="text-xs text-gray-400 mt-1">Share this with the owner so they can sign in.</p>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-2">Their business</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
                <input required value={business.name} onChange={setBiz('name')} className="input" placeholder="e.g. Kigali Coffee House" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required rows={2} value={business.description} onChange={setBiz('description')} className="input resize-none" placeholder="Describe the business…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select required value={business.category_id} onChange={setBiz('category_id')} className="input">
                    <option value="">Select category</option>
                    {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City / District</label>
                  <input required value={business.city} onChange={setBiz('city')} className="input" placeholder="e.g. Gasabo" />
                </div>
              </div>

              {mutation.error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorText(mutation.error)}</p>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
                  {mutation.isPending ? 'Creating…' : 'Create owner & business'}
                </button>
                <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, qc }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => api.put(`/users/${user.id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user', user.id] });
      onClose();
    },
  });

  function errorText(err) {
    if (Array.isArray(err?.errors) && err.errors.length) return err.errors.map((e) => e.msg).join('. ');
    return err?.message || 'Could not update the user.';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700" title="Close">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Pencil className="w-5 h-5 text-brand-500" />
          Edit user
        </h2>
        <p className="text-sm text-gray-500 mb-4">Update this user's details and role.</p>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input required value={form.name} onChange={set('name')} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={set('email')} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={set('role')} className="input">
              <option value="user">Customer</option>
              <option value="business_owner">Business owner</option>
            </select>
          </div>
          {mutation.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorText(mutation.error)}</p>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
