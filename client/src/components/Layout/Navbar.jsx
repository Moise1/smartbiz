import { Link, NavLink } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Navbar() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-brand-600">
          <MapPin className="w-5 h-5" />
          SmartBiz
        </Link>

        {/* Public menu — landing pages only; hidden once logged in */}
        {!user && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'text-brand-600' : 'hover:text-gray-900'}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/businesses" className={({ isActive }) => isActive ? 'text-brand-600' : 'hover:text-gray-900'}>
              {t('nav.businesses')}
            </NavLink>
            <NavLink to="/pricing" className={({ isActive }) => isActive ? 'text-brand-600' : 'hover:text-gray-900'}>
              {t('nav.pricing')}
            </NavLink>
          </nav>
        )}

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <ProfileMenu />
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-1.5">{t('nav.login')}</Link>
              <Link to="/register" className="btn-primary text-sm py-1.5">{t('nav.register')}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
