import {
  Utensils, ShoppingBag, HeartPulse, Scissors, BookOpen, Truck,
  Cpu, Landmark, Building2, Music, BedDouble, Droplets, Store,
} from 'lucide-react';

const ICONS = {
  'Restaurants & Cafes': Utensils,
  'Retail & Shops': ShoppingBag,
  'Health & Wellness': HeartPulse,
  'Beauty & Personal Care': Scissors,
  'Education & Training': BookOpen,
  'Transport & Logistics': Truck,
  'Technology & IT': Cpu,
  'Finance & Insurance': Landmark,
  'Construction & Real Estate': Building2,
  'Events & Entertainment': Music,
  'Hotels & Accommodation': BedDouble,
  'Car Wash': Droplets,
};

export default function CategoryIcon({ category, className = 'w-6 h-6' }) {
  const Icon = ICONS[category] || Store;
  return <Icon className={className} strokeWidth={1.75} />;
}
