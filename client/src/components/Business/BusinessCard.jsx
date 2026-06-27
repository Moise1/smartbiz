import { Link } from 'react-router-dom';
import { MapPin, Star, CheckCircle } from 'lucide-react';

export default function BusinessCard({ business }) {
  return (
    <Link to={`/businesses/${business.id}`} className="card hover:shadow-md transition-shadow group">
      <div className="h-40 bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
        <span className="text-4xl">{getCategoryEmoji(business.category_name)}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-1">
            {business.name}
          </h3>
          {business.is_verified && (
            <CheckCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          )}
        </div>
        {business.category_name && (
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
            {business.category_name}
          </span>
        )}
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{business.description}</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            {business.city}
          </span>
          <span className="flex items-center gap-1 font-medium text-amber-500">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            {Number(business.avg_rating).toFixed(1)}
            <span className="text-gray-400 font-normal">({business.review_count})</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function getCategoryEmoji(category) {
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
  return map[category] || '🏪';
}
