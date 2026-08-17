import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Phone, Mail, Globe, CheckCircle, Star, ArrowLeft } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import StarRating from '../components/Business/StarRating.jsx';

export default function BusinessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', id],
    queryFn: () => api.get(`/businesses/${id}`),
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => api.get(`/businesses/${id}/reviews`),
  });

  const submitReview = useMutation({
    mutationFn: () => api.post(`/businesses/${id}/reviews`, { rating, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', id] });
      qc.invalidateQueries({ queryKey: ['business', id] });
      setRating(0);
      setComment('');
    },
  });

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/2" />
      <div className="h-48 bg-gray-200 rounded" />
    </div>;
  }

  if (!business) return <div className="text-center py-20 text-gray-500">Business not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="card overflow-hidden mb-6">
        <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center text-6xl">
          🏪
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                {business.is_verified && (
                  <CheckCircle className="w-5 h-5 text-brand-500" title="Verified" />
                )}
              </div>
              {business.category_name && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
                  {business.category_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
              <Star className="w-5 h-5 fill-amber-400" />
              <span className="text-lg">{Number(business.avg_rating).toFixed(1)}</span>
              <span className="text-sm text-gray-400 font-normal">({business.review_count})</span>
            </div>
          </div>

          <p className="mt-4 text-gray-600">{business.description}</p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
            {business.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                {business.address}, {business.city}
              </div>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-2 hover:text-brand-600">
                <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                {business.phone}
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className="flex items-center gap-2 hover:text-brand-600">
                <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                {business.email}
              </a>
            )}
            {business.website && (
              <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-brand-600">
                <Globe className="w-4 h-4 text-brand-500 shrink-0" />
                Visit website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews</h2>

        {user && (
          <div className="card p-5 mb-6">
            <p className="font-medium text-gray-700 mb-3">Leave a review</p>
            <StarRating value={rating} onChange={setRating} />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience…"
              rows={3}
              className="input mt-3 resize-none"
            />
            <button
              onClick={() => submitReview.mutate()}
              disabled={!rating || !comment || submitReview.isPending}
              className="btn-primary mt-3"
            >
              {submitReview.isPending ? 'Submitting…' : 'Submit Review'}
            </button>
            {submitReview.error && (
              <p className="mt-2 text-sm text-red-500">{submitReview.error.message}</p>
            )}
          </div>
        )}

        <div className="space-y-4">
          {reviews?.length === 0 && (
            <p className="text-gray-500 text-sm">No reviews yet. Be the first!</p>
          )}
          {reviews?.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">{r.user_name}</span>
                <StarRating value={r.rating} />
              </div>
              <p className="text-sm text-gray-600">{r.comment}</p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
