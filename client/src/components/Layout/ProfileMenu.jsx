import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

function initials(name) {
  return (
    (name || '')
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

const ROLE_LABELS = {
  admin: 'Admin',
  business_owner: 'Business Owner',
  user: 'Customer',
};

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  if (!user) return null;

  const roleLabel = user.is_superadmin ? 'Super Admin' : ROLE_LABELS[user.role] || user.role;

  // Only roles with a real dashboard get a link: superadmin and business owner.
  const dashboardPath = user.is_superadmin
    ? '/superadmin'
    : user.role === 'business_owner' || user.role === 'admin'
      ? '/dashboard'
      : null;

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/');
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Profile"
        title={user.name}
        className="w-9 h-9 rounded-full bg-brand-600 text-white text-sm font-semibold flex items-center justify-center hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        {initials(user.name)}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 card p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-brand-50 text-brand-700 font-semibold flex items-center justify-center">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <span className="inline-block mt-3 text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
            {roleLabel}
          </span>
          <div className="mt-4 space-y-2">
            {dashboardPath && (
              <Link
                to={dashboardPath}
                onClick={() => setOpen(false)}
                className="btn-primary w-full text-sm py-1.5 justify-center"
              >
                <LayoutDashboard className="w-4 h-4" />
                {user.is_superadmin ? 'Super Admin Dashboard' : t('nav.dashboard')}
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="btn-secondary w-full text-sm py-1.5 justify-center"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
