import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, UserCog, X } from 'lucide-react';
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
  const [showEdit, setShowEdit] = useState(false);
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
              onClick={() => { setOpen(false); setShowEdit(true); }}
              className="btn-secondary w-full text-sm py-1.5 justify-center"
            >
              <UserCog className="w-4 h-4" />
              Edit profile
            </button>
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

      {showEdit && <EditProfileModal user={user} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

function EditProfileModal({ user, onClose }) {
  const { updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email, password: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateProfile({ name: form.name, email: form.email, password: form.password || undefined });
      setDone(true);
      setTimeout(onClose, 900);
    } catch (err) {
      const msg = Array.isArray(err?.errors) && err.errors.length
        ? err.errors.map((x) => x.msg).join('. ')
        : err?.message || 'Could not update your profile.';
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700" title="Close">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-brand-500" />
          Edit profile
        </h2>
        <p className="text-sm text-gray-500 mb-4">Update your name, email, or password.</p>
        {done ? (
          <p className="text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
            Profile updated.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input required value={form.name} onChange={set('name')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={form.email} onChange={set('email')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input type="password" minLength={6} value={form.password} onChange={set('password')} className="input" placeholder="Leave blank to keep current" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={pending} className="btn-primary flex-1 justify-center">
                {pending ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
