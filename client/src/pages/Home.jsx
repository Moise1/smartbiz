import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, MapPin } from 'lucide-react';
import api from '../api/client.js';
import BusinessCard from '../components/Business/BusinessCard.jsx';
import CategoryIcon from '../components/Business/CategoryIcon.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { t, translateCategory } = useLanguage();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [aiPrefs, setAiPrefs] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Diverse featured strip: sponsored businesses (badge) + the top-rated
  // business per category, so paid plans join the list rather than replace it.
  const { data: featuredData } = useQuery({
    queryKey: ['businesses', 'featured'],
    queryFn: () => api.get('/businesses/featured'),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  // Live suggestions: fetch matching businesses 300ms after typing stops.
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await api.get(`/businesses?search=${encodeURIComponent(search.trim())}&limit=5`);
        setSuggestions(data.businesses || []);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function handleSearch(e) {
    e.preventDefault();
    setSuggestions([]);
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
            <span className="text-brand-100 font-medium">{t('hero.location')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-brand-100 text-lg mb-8">
            {t('hero.subtitle')}
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('hero.searchPlaceholder')}
                className="input pl-10 text-gray-900"
              />
              {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-20 text-left">
                  {suggestions.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/businesses/${b.id}`)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-brand-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">{b.name}</span>
                        <span className="text-gray-400"> · {b.category_name} · {b.city}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="btn-primary whitespace-nowrap">{t('hero.search')}</button>
          </form>
        </div>
      </section>

      {/* AI Recommendation */}
      <section className="max-w-3xl mx-auto px-4 -mt-6">
        <div className="card p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3 text-brand-600 font-semibold">
            <Sparkles className="w-5 h-5" />
            {t('ai.title')}
          </div>
          <form onSubmit={handleAiRecommend} className="flex gap-2">
            <input
              value={aiPrefs}
              onChange={(e) => setAiPrefs(e.target.value)}
              placeholder={t('ai.placeholder')}
              className="input flex-1"
            />
            <button type="submit" disabled={aiLoading} className="btn-primary whitespace-nowrap">
              {aiLoading ? t('ai.thinking') : t('ai.recommend')}
            </button>
          </form>
          {aiError && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{aiError}</p>
          )}
          {recommendations && recommendations.length > 0 && (
            <ul className="mt-4 space-y-2">
              {recommendations.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => navigate(`/businesses?search=${encodeURIComponent(r.name)}`)}
                    className="w-full text-left p-3 rounded-lg bg-brand-50 text-sm hover:bg-brand-100 transition-colors"
                  >
                    <span className="font-semibold text-brand-700">{r.name}</span>
                    <span className="text-gray-600"> — {r.reason}</span>
                  </button>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('categories.title')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/businesses?category_id=${cat.id}`)}
              className="card p-4 text-center hover:shadow-md hover:border-brand-200 transition-all group"
            >
              <CategoryIcon category={cat.name} className="w-6 h-6 mx-auto mb-2 text-brand-600" />
              <div className="text-xs font-medium text-gray-700 group-hover:text-brand-600">{translateCategory(cat.name)}</div>
              <div className="text-xs text-gray-400">{t('categories.listed', { count: cat.business_count })}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('featured.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredData?.businesses?.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
