import { Star } from 'lucide-react';

export default function StarRating({ value, onChange, size = 5 }) {
  const stars = [1, 2, 3, 4, 5];

  if (!onChange) {
    return (
      <div className="flex gap-0.5">
        {stars.map((s) => (
          <Star
            key={s}
            className={`w-${size} h-${size} ${s <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {stars.map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)}>
          <Star
            className={`w-6 h-6 transition-colors ${s <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
          />
        </button>
      ))}
    </div>
  );
}
