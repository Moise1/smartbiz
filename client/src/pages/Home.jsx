import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, MapPin } from 'lucide-react';
import api from '../api/client.js';
import BusinessCard from '../components/Business/BusinessCard.jsx';

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [aiPrefs, setAiPrefs] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const { data: featuredData } = useQuery({
    queryKey: ['businesses', 'featured'],
    queryFn: () => api.get('/businesses?limit=6'),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  function handleSearch(e) {
    e.preventDefault();
    navigate(`/businesses?search=${encodeURIComponent(search)}`);
  }

  async function handleAiRecommend(e) {
    e.preventDefault();
    if (!aiPrefs.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setRecommendations(null);
    try {
      const data = await api.post('/ai/recommendations', { preferences: aiPrefs });
      setRecommendations(data.recommendations);
    } catch (err) {
      setAiError(err?.message || 'Could not fetch recommendations. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-700 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="w-6 h-6" />
            <span className="text-brand-100 font-medium">Kigali & Beyond</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Discover Local Businesses with AI
          </h1>
          <p className="text-brand-100 text-lg mb-8">
            Find restaurants, shops, services and more in your community — powered by intelligent recommendations.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search businesses, categories…"
                className="input pl-10 text-gray-900"
              />
            </div>
            <button type="submit" className="btn-primary whitespace-nowrap">Search</button>
          </form>
        </div>
      </section>

      {/* AI Recommendation */}
      <section className="max-w-3xl mx-auto px-4 -mt-6">
        <div className="card p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3 text-brand-600 font-semibold">
            <Sparkles className="w-5 h-5" />
            AI Recommendations
          </div>
          <form onSubmit={handleAiRecommend} className="flex gap-2">
            <input
              value={aiPrefs}
              onChange={(e) => setAiPrefs(e.target.value)}
              placeholder="Tell us what you're looking for… e.g. 'healthy lunch near Remera'"
              className="input flex-1"
            />
            <button type="submit" disabled={aiLoading} className="btn-primary whitespace-nowrap">
              {aiLoading ? 'Thinking…' : 'Recommend'}
            </button>
          </form>
          {aiError && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{aiError}</p>
          )}
          {recommendations && recommendations.length > 0 && (
            <ul className="mt-4 space-y-2">
              {recommendations.map((r, i) => (
                <li key={i} className="p-3 rounded-lg bg-brand-50 text-sm">
                  <span className="font-semibold text-brand-700">{r.name}</span>
                  <span className="text-gray-600"> — {r.reason}</span>
                </li>
              ))}
            </ul>
          )}
          {recommendations && recommendations.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">No matching businesses found. Try a different search.</p>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/businesses?category_id=${cat.id}`)}
              className="card p-4 text-center hover:shadow-md hover:border-brand-200 transition-all group"
            >
              <div className="text-2xl mb-1">{getCategoryEmoji(cat.name)}</div>
              <div className="text-xs font-medium text-gray-700 group-hover:text-brand-600">{cat.name}</div>
              <div className="text-xs text-gray-400">{cat.business_count} listed</div>
            </button>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Businesses</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredData?.businesses?.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      </section>
    </div>
  );
}

function getCategoryEmoji(name) {
  const map = {
    'Restaurants & Cafes': '🍽️',
    'Retail & Shops': '🛍️',
    'Health & Wellness': '🏥',
    'Beauty & Personal Care': '💈',
    'Education & Training': '📚',
    'Transport & Logistics': '🚚',
    'Technology & IT': '💻',
    'Finance & Insurance': '🏦',
    'Construction & Real Estate': '🏗️',
    'Events & Entertainment': '🎵',
  };
  return map[name] || '🏪';
}
