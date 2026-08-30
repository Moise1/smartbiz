// Single source of truth for ad subscription plans. Prices are RWF per month.
// rank drives listing order: higher ranks appear first (free listings are 0).

export const PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price_rwf: 5000,
    rank: 1,
    tagline: 'Get ahead of free listings',
    features: [
      'Ranked above all free listings',
      'Appears higher in search results',
      'Standard business profile',
    ],
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price_rwf: 15000,
    rank: 2,
    tagline: 'Stand out in your category',
    features: [
      'Ranked above Basic and free listings',
      '"Sponsored" badge on your listing',
      'Priority in category browsing',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price_rwf: 30000,
    rank: 3,
    tagline: 'Top of every list',
    features: [
      'Top placement in all rankings',
      'Featured on the SmartBiz home page',
      'Highlighted listing card',
      '"Sponsored" badge on your listing',
    ],
  },
};

export const PLAN_DURATION_DAYS = 30;
