import { Link, NavLink, useNavigate } from 'react-router-dom';
import { MapPin, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-brand-600">
          <MapPin className="w-5 h-5" />
          Soko.ai
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'text-brand-600' : 'hover:text-gray-900'}>
            Home
          </NavLink>
          <NavLink to="/businesses" className={({ isActive }) => isActive ? 'text-brand-600' : 'hover:text-gray-900'}>
            Businesses
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/dashboard" className="btn-secondary text-sm py-1.5">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button onClick={handleLogout} className="btn-secondary text-sm py-1.5">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-1.5">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-1.5">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
