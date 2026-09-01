import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import api from '../../api/client.js';

// Categorical palette (validated: CVD-safe, fixed slot order — never reassign).
// The aqua slot is sub-3:1 on white, so visible labels + the table below are required.
const PLAN_META = {
  basic:    { label: 'Basic',    price: 5000,  color: '#2a78d6' },
  standard: { label: 'Standard', price: 15000, color: '#eb6834' },
  premium:  { label: 'Premium',  price: 30000, color: '#1baf7a' },
};
const PLAN_ORDER = ['basic', 'standard', 'premium'];

const fmt = (n) => n.toLocaleString();

export default function SubscriptionsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription-stats'],
    queryFn: () => api.get('/subscriptions/stats'),
  });

  if (isLoading) {
    return (
      <section>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Subscriptions</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
        <div className="card h-64 animate-pulse bg-gray-100" />
      </section>
    );
  }

  const plans = PLAN_ORDER.map((p) => {
    const row = data?.plans?.find((x) => x.plan === p);
    return {
      plan: p,
      ...PLAN_META[p],
      active: row?.active_count ?? 0,
      total: row?.total_count ?? 0,
      revenueActive: row?.revenue_active_rwf ?? 0,
      revenueTotal: row?.revenue_total_rwf ?? 0,
    };
  });

  const totalActive = plans.reduce((s, p) => s + p.active, 0);
  const activeRevenue = plans.reduce((s, p) => s + p.revenueActive, 0);
  const allTimeRevenue = plans.reduce((s, p) => s + p.revenueTotal, 0);
  const share = (p) => (totalActive ? (p.active / totalActive) * 100 : 0);

  return (
    <section>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscriptions</h1>
      <p className="text-gray-500 text-sm mb-6">Ad plan uptake and revenue across the platform</p>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Active subscriptions" value={fmt(totalActive)} />
        <StatTile label="Active monthly revenue" value={`${fmt(activeRevenue)} RWF`} />
        <StatTile label="All-time revenue" value={`${fmt(allTimeRevenue)} RWF`} />
      </div>

      {totalActive === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No active subscriptions yet. Charts will appear once a business subscribes to a plan.
        </div>
      ) : (
        <>
          {/* Plan share donuts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Active subscriptions by plan</h2>
              <p className="text-xs text-gray-400 mb-2">Hover a slice for details</p>
              <Donut
                data={plans.map((p) => ({ label: p.label, value: p.active, color: p.color }))}
                centerLabel="active"
                centerValue={fmt(totalActive)}
                describe={(d) => `${d.value} · ${((d.value / totalActive) * 100).toFixed(0)}%`}
              />
            </div>
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Active monthly revenue by plan</h2>
              <p className="text-xs text-gray-400 mb-2">Hover a slice for details</p>
              <Donut
                data={plans.map((p) => ({ label: p.label, value: p.revenueActive, color: p.color }))}
                centerLabel="RWF / month"
                centerValue={fmt(activeRevenue)}
                describe={(d) => `${fmt(d.value)} RWF · ${activeRevenue ? ((d.value / activeRevenue) * 100).toFixed(0) : 0}%`}
              />
            </div>
          </div>

          {/* Table view */}
          <div className="card overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Price / month</th>
                  <th className="px-4 py-3 text-right">Active</th>
                  <th className="px-4 py-3 text-right">Share</th>
                  <th className="px-4 py-3 text-right">Active revenue</th>
                  <th className="px-4 py-3 text-right">All-time revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((p) => (
                  <tr key={p.plan}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                        {p.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{fmt(p.price)} RWF</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{p.active}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{share(p).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{fmt(p.revenueActive)} RWF</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{fmt(p.revenueTotal)} RWF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Recent subscriptions */}
      {data?.recent?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent subscriptions</h2>
          <div className="divide-y divide-gray-100">
            {data.recent.map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{s.business_name}</p>
                  <p className="text-gray-400 text-xs">by {s.user_name} · {new Date(s.starts_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1.5 text-gray-600 capitalize">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PLAN_META[s.plan]?.color }} />
                    {s.plan}
                  </span>
                  <span className="tabular-nums text-gray-900">{fmt(s.amount_rwf)} RWF</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// SVG donut: slices with 2px gaps, hover highlights a slice and swaps the
// center readout to its details; the hole always shows the total at rest.
function Donut({ data, centerLabel, centerValue, describe }) {
  const [hovered, setHovered] = useState(null);
  const segments = data.filter((d) => d.value > 0);
  const total = segments.reduce((s, d) => s + d.value, 0);

  const R = 80;
  const STROKE = 26;
  const C = 2 * Math.PI * R;
  const GAP = segments.length > 1 ? 2.5 : 0;

  let offset = 0;
  const arcs = segments.map((d) => {
    const len = (d.value / total) * C;
    const arc = { ...d, dash: Math.max(len - GAP, 0.5), off: offset };
    offset += len;
    return arc;
  });

  const active = hovered != null ? segments[hovered] : null;

  return (
    <div>
      <div className="flex justify-center">
        <div className="relative">
          <svg
            width="220" height="220" viewBox="0 0 220 220" role="img"
            aria-label={data.map((d) => `${d.label}: ${describe(d)}`).join(', ')}
          >
            <g transform="rotate(-90 110 110)">
              {arcs.map((a, i) => (
                <circle
                  key={a.label}
                  cx="110" cy="110" r={R}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={hovered === i ? STROKE + 4 : STROKE}
                  strokeDasharray={`${a.dash} ${C - a.dash}`}
                  strokeDashoffset={-a.off}
                  opacity={hovered == null || hovered === i ? 1 : 0.35}
                  style={{ transition: 'stroke-width 120ms ease, opacity 120ms ease' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-8">
            {active ? (
              <>
                <p className="text-lg font-bold text-gray-900">{describe(active)}</p>
                <p className="text-xs text-gray-500">{active.label}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900">{centerValue}</p>
                <p className="text-xs text-gray-500">{centerLabel}</p>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Legend: identity is never color alone; hovering a row lights its slice */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-2">
        {data.map((d) => {
          const segIdx = segments.indexOf(d);
          return (
            <span
              key={d.label}
              onMouseEnter={() => segIdx >= 0 && setHovered(segIdx)}
              onMouseLeave={() => setHovered(null)}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
              {d.label} — {describe(d)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
