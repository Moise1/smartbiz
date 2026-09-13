import { useLanguage } from '../../context/LanguageContext.jsx';

function FlagUS({ className }) {
  return (
    <svg viewBox="0 0 16 11" className={className} aria-hidden="true">
      <rect width="16" height="11" fill="#B22234" />
      <rect y="0.85" width="16" height="0.85" fill="#fff" />
      <rect y="2.54" width="16" height="0.85" fill="#fff" />
      <rect y="4.23" width="16" height="0.85" fill="#fff" />
      <rect y="5.92" width="16" height="0.85" fill="#fff" />
      <rect y="7.62" width="16" height="0.85" fill="#fff" />
      <rect y="9.31" width="16" height="0.85" fill="#fff" />
      <rect width="7.2" height="5.92" fill="#3C3B6E" />
    </svg>
  );
}

function FlagRW({ className }) {
  return (
    <svg viewBox="0 0 16 11" className={className} aria-hidden="true">
      <rect width="16" height="11" fill="#20603D" />
      <rect width="16" height="7.15" fill="#FAD201" />
      <rect width="16" height="5.5" fill="#00A1DE" />
      <circle cx="12.2" cy="3.1" r="1.35" fill="#E5BE01" />
    </svg>
  );
}

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();

  const btn = (code, Flag, label) => {
    const active = lang === code;
    return (
      <button
        type="button"
        onClick={() => setLang(code)}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
          active
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-800'
        }`}
      >
        <Flag className="w-4 h-3 rounded-[2px] overflow-hidden ring-1 ring-black/10 shrink-0" />
        <span className="hidden sm:inline">{code === 'en' ? 'EN' : 'RW'}</span>
      </button>
    );
  };

  return (
    <div
      className="flex items-center p-0.5 rounded-lg bg-gray-100 border border-gray-200"
      role="group"
      aria-label={t('lang.switchTo')}
    >
      {btn('en', FlagUS, t('lang.en'))}
      {btn('rw', FlagRW, t('lang.rw'))}
    </div>
  );
}
