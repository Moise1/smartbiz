import { useRef } from 'react';
import { ImageUp, Trash2, Loader2 } from 'lucide-react';

// Overlay controls on a business cover photo: replace the cover, or delete
// the business. Safe to render inside a <Link> card — clicks never navigate.
export default function CoverControls({ busy = false, onUpload, onDelete }) {
  const fileRef = useRef(null);
  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="absolute top-2 left-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
      onClick={stop}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={(e) => { stop(e); fileRef.current?.click(); }}
        disabled={busy}
        title="Replace cover photo"
        className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageUp className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={(e) => { stop(e); onDelete(); }}
        disabled={busy}
        title="Delete business"
        className="w-8 h-8 rounded-full bg-white/90 hover:bg-red-50 text-red-500 flex items-center justify-center shadow disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
