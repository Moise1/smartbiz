import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg">
          <MapPin className="w-5 h-5 text-brand-500" />
          Soko.ai
        </Link>
        <p className="text-sm">AI-powered local business discovery for Kigali and beyond.</p>
        <p className="text-sm">&copy; {new Date().getFullYear()} Soko.ai</p>
      </div>
    </footer>
  );
}
