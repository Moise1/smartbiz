import { Link } from 'react-router-dom';
import { Building2, CreditCard } from 'lucide-react';

const PLAN_STYLES = {
  premium: 'bg-brand-50 text-brand-700',
  standard: 'bg-orange-50 text-orange-600',
  basic: 'bg-blue-50 text-blue-600',
};

function planChip(b) {
  const active =
    b.plan && b.plan !== 'free' && (!b.plan_expires_at || new Date(b.plan_expires_at) > new Date());
  if (!active) {
    return <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">Free</span>;
  }
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize shrink-0 ${PLAN_STYLES[b.plan] || ''}`}>
      {b.plan}
    </span>
  );
}

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

export default function OwnerSidebar({ businesses = [], subscriptions = [] }) {
  const active = subscriptions.filter((s) => s.is_current);
  const monthlySpend = active.reduce((sum, s) => sum + Number(s.amount_rwf || 0), 0);
  const allTimeSpend = subscriptions.reduce((sum, s) => sum + Number(s.amount_rwf || 0), 0);

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-6">
      <div className="card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Building2 className="w-4 h-4 text-brand-500" />
          My Businesses
          <span className="ml-auto text-xs font-medium text-gray-400">{businesses.length}</span>
        </h3>
        {businesses.length === 0 ? (
          <p className="mt-3 px-2 text-sm text-gray-400">No businesses yet</p>
        ) : (
          <ul className="mt-2 space-y-0.5 max-h-80 overflow-y-auto pr-1">
            {businesses.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/businesses/${b.id}`}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-600"
                >
                  <span className="truncate">{b.name}</span>
                  {planChip(b)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
          <CreditCard className="w-4 h-4 text-brand-500" />
          Subscriptions
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Active plans</dt>
            <dd className="font-semibold text-gray-900">{active.length}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Monthly spend</dt>
            <dd className="font-semibold text-gray-900">{fmt(monthlySpend)} RWF</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">All-time spend</dt>
            <dd className="font-semibold text-gray-900">{fmt(allTimeSpend)} RWF</dd>
          </div>
        </dl>
        <Link to="/subscribe" className="btn-secondary w-full mt-4 text-sm py-1.5 justify-center">
          Manage subscriptions
        </Link>
      </div>
    </aside>
  );
}
