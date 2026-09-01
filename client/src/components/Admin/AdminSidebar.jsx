import { Building2, Users, CreditCard } from 'lucide-react';

const ITEMS = [
  { id: 'businesses', label: 'Businesses', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
];

// Icon rail at rest (64px); expands on hover to show labels.
export default function AdminSidebar({ section, onSelect }) {
  return (
    <aside className="group/sidebar sticky top-16 self-start h-[calc(100vh-4rem)] w-16 hover:w-56 transition-[width] duration-200 ease-out bg-white border-r border-gray-200 shrink-0 overflow-hidden z-40">
      <nav className="flex flex-col gap-1 p-3 pt-6">
        {ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={label}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              section === id
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
              {label}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
