// Cover photos live in per-category folders under assets/imgs/ — every image
// in a category's folder joins its pool automatically (add/remove files, no
// code change needed). Each business gets a stable pick from its category's
// pool keyed by business id, so the card and detail page always match and
// businesses in the same category get different covers.

const modules = import.meta.glob('../../assets/imgs/*/*.{avif,jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

const FOLDER_TO_CATEGORY = {
  'restaurants-cafes': 'Restaurants & Cafes',
  'retail-shops': 'Retail & Shops',
  'health-wellness': 'Health & Wellness',
  'beauty-personal-care': 'Beauty & Personal Care',
  'education-training': 'Education & Training',
  'transport-logistics': 'Transport & Logistics',
  'technology-it': 'Technology & IT',
  'finance-insurance': 'Finance & Insurance',
  'construction-real-estate': 'Construction & Real Estate',
  'events-entertainment': 'Events & Entertainment',
  'hotels-accommodation': 'Hotels & Accommodation',
  'car-wash': 'Car Wash',
};

const IMAGES_BY_CATEGORY = {};
for (const path of Object.keys(modules).sort()) {
  const folder = path.split('/').at(-2);
  const category = FOLDER_TO_CATEGORY[folder];
  if (!category) continue;
  (IMAGES_BY_CATEGORY[category] ??= []).push(modules[path]);
}

export function getBusinessImage(business) {
  const pool = IMAGES_BY_CATEGORY[business?.category_name];
  if (!pool?.length) return null;
  return pool[business.id % pool.length];
}
