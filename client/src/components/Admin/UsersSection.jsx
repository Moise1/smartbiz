import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Search, Star, Users as UsersIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';

const ROLE_STYLES = {
  admin: 'bg-purple-50 text-purple-700',
  business_owner: 'bg-brand-50 text-brand-700',
  user: 'bg-gray-100 text-gray-600',
};
const ROLE_LABELS = { admin: 'Admin', business_owner: 'Business owner', user: 'Customer' };

export default function UsersSection() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users'),
  });

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
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role…"
            className="input pl-9"
          />
        </div>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
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
