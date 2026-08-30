import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Building2, CreditCard, Crown, Rocket, TrendingUp } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PLAN_ICONS = { basic: TrendingUp, standard: Rocket, premium: Crown };

export default function Subscribe() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [businessId, setBusinessId] = useState('');
  const [planId, setPlanId] = useState(searchParams.get('plan') || 'standard');
  const [success, setSuccess] = useState(null);

  const isOwner = user?.role === 'business_owner' || user?.role === 'admin';

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/subscriptions/plans'),
  });

  const { data: myBusinesses } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => api.get('/businesses/mine'),
    enabled: isOwner,
  });

  const { data: mySubs } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => api.get('/subscriptions/mine'),
    enabled: isOwner,
  });

  const subscribeMutation = useMutation({
    mutationFn: () => api.post('/subscriptions', { business_id: Number(businessId), plan: planId }),
    onSuccess: (data) => {
      setSuccess(data.message);
      qc.invalidateQueries({ queryKey: ['my-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['my-businesses'] });
      qc.invalidateQueries({ queryKey: ['businesses'] });
    },
  });

  if (!isOwner) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Business owners only</h1>
        <p className="text-gray-500 mb-6">
          Ad subscriptions are for business owner accounts. Your account is a
          customer account, so there's nothing to subscribe here.
        </p>
        <Link to="/businesses" className="btn-primary inline-flex">Browse Businesses</Link>
      </div>
    );
  }

  const selectedPlan = plans?.find((p) => p.id === planId);
  const activeSubs = mySubs?.filter((s) => s.is_current) ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscribe to a plan</h1>
      <p className="text-gray-500 text-sm mb-8">
        Pick one of your businesses and the plan you want. Ranking updates immediately.{' '}
        <Link to="/pricing" className="text-brand-600 hover:underline">Compare plans</Link>
      </p>

      {success && (
        <div className="card p-4 mb-6 bg-brand-50 border-brand-200 flex items-center gap-3">
          <BadgeCheck className="w-5 h-5 text-brand-600 shrink-0" />
          <p className="text-sm text-brand-800">{success}</p>
        </div>
      )}

      <div className="card p-6 mb-8">
        {/* Step 1: business */}
        <label className="block text-sm font-semibold text-gray-800 mb-2">1. Your business</label>
        {myBusinesses?.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">
            You haven't listed a business yet.{' '}
            <Link to="/dashboard" className="text-brand-600 hover:underline">Add one from your dashboard</Link>{' '}
            first.
          </p>
        ) : (
          <select
            value={businessId}
            onChange={(e) => { setBusinessId(e.target.value); setSuccess(null); }}
            className="input mb-6"
          >
            <option value="">Select a business…</option>
            {myBusinesses?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city}){b.plan && b.plan !== 'free' ? ` — currently ${b.plan}` : ''}
              </option>
            ))}
          </select>
        )}

        {/* Step 2: plan */}
        <label className="block text-sm font-semibold text-gray-800 mb-2">2. Your plan</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {plans?.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] || TrendingUp;
            const selected = plan.id === planId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => { setPlanId(plan.id); setSuccess(null); }}
                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                  selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-sm">
                  <Icon className={`w-4 h-4 ${selected ? 'text-brand-600' : 'text-gray-400'}`} />
                  {plan.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {plan.price_rwf.toLocaleString()} RWF/mo
                </div>
              </button>
            );
          })}
        </div>

        {/* Step 3: confirm */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-5">
          <div className="text-sm text-gray-600">
            {selectedPlan && (
              <>
                <span className="font-semibold text-gray-900">
                  {selectedPlan.price_rwf.toLocaleString()} RWF
                </span>{' '}
                for 30 days of {selectedPlan.name} ranking
              </>
            )}
          </div>
          <button
            onClick={() => subscribeMutation.mutate()}
            disabled={!businessId || !planId || subscribeMutation.isPending}
            className="btn-primary disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            {subscribeMutation.isPending ? 'Processing…' : 'Confirm subscription'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Payment is simulated in this version — confirming activates the plan immediately.
        </p>
        {subscribeMutation.error && (
          <p className="mt-3 text-sm text-red-500">
            {subscribeMutation.error?.message || 'Could not subscribe. Please try again.'}
          </p>
        )}
      </div>

      {/* Active subscriptions */}
      {activeSubs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Active subscriptions</h2>
          <div className="space-y-3">
            {activeSubs.map((s) => (
              <div key={s.id} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{s.business_name}</p>
                  <p className="text-sm text-gray-500 capitalize">
                    {s.plan} · {s.amount_rwf.toLocaleString()} RWF · expires{' '}
                    {new Date(s.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full font-medium capitalize">
                  {s.plan}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
