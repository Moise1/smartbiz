import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, TrendingUp, Crown, Rocket } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PLAN_ICONS = { basic: TrendingUp, standard: Rocket, premium: Crown };

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: plans, isLoading, isError, refetch } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/subscriptions/plans'),
  });

  function handleChoose(planId) {
    if (user && user.role !== 'business_owner' && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    navigate(`/subscribe?plan=${planId}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Grow your business with SmartBiz Ads
        </h1>
        <p className="text-gray-500">
          Subscribe your business to a plan and rank higher when customers search
          and browse. Premium listings appear first, then Standard, then Basic —
          free listings follow.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="card h-96 animate-pulse bg-gray-100" />)}
        </div>
      ) : isError || !plans?.length ? (
        <div className="card p-10 text-center text-gray-500 max-w-md mx-auto">
          <p className="mb-4">Couldn't load the plans. Please check your connection and try again.</p>
          <button onClick={() => refetch()} className="btn-primary inline-flex">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans?.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] || TrendingUp;
            const isPremium = plan.id === 'premium';
            return (
              <div
                key={plan.id}
                className={`card p-8 flex flex-col relative ${
                  isPremium ? 'border-2 border-brand-500 shadow-lg' : ''
                }`}
              >
                {isPremium && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Best visibility
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-5 h-5 text-brand-600" />
                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                </div>
                <p className="text-sm text-gray-500 mb-5">{plan.tagline}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price_rwf.toLocaleString()} RWF
                  </span>
                  <span className="text-gray-400 text-sm"> / month</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleChoose(plan.id)}
                  className={`mt-8 w-full justify-center ${isPremium ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Choose {plan.name}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-sm text-gray-400 mt-10">
        Plans run for 30 days. You'll need a business owner account to subscribe —{' '}
        <button onClick={() => navigate('/register')} className="text-brand-600 hover:underline">
          register here
        </button>{' '}
        if you don't have one yet.
      </p>
    </div>
  );
}
