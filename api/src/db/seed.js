import { Districts } from 'rwanda';
import pool from '../config/database.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// Province → districts (hardcoded: rwanda@3.x Districts(province) is broken)
const PROVINCE_DISTRICTS = {
  Kigali: { districts: ['Gasabo', 'Kicukiro', 'Nyarugenge'] },
  East:   { districts: ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'] },
  North:  { districts: ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'] },
  South:  { districts: ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'] },
  West:   { districts: ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'] },
};

// Approximate centre coordinates per district [lat, lon]
const DISTRICT_COORDS = {
  Gasabo:     [-1.870, 30.110], Kicukiro:   [-1.980, 30.100], Nyarugenge: [-1.950, 30.060],
  Bugesera:   [-2.200, 30.200], Gatsibo:    [-1.600, 30.500], Kayonza:    [-1.850, 30.600],
  Kirehe:     [-2.200, 30.700], Ngoma:      [-2.050, 30.500], Nyagatare:  [-1.300, 30.300],
  Rwamagana:  [-1.950, 30.450],
  Burera:     [-1.350, 29.800], Gakenke:    [-1.700, 29.750], Gicumbi:    [-1.550, 30.100],
  Musanze:    [-1.500, 29.630], Rulindo:    [-1.700, 29.950],
  Gisagara:   [-2.600, 29.750], Huye:       [-2.600, 29.740], Kamonyi:    [-2.000, 29.850],
  Muhanga:    [-2.080, 29.750], Nyamagabe:  [-2.450, 29.500], Nyanza:     [-2.350, 29.750],
  Nyaruguru:  [-2.700, 29.550], Ruhango:    [-2.200, 29.770],
  Karongi:    [-2.100, 29.400], Ngororero:  [-1.850, 29.550], Nyabihu:    [-1.650, 29.500],
  Nyamasheke: [-2.350, 29.150], Rubavu:     [-1.680, 29.260], Rusizi:     [-2.600, 28.900],
  Rutsiro:    [-1.950, 29.400],
};

function jitter(coord) {
  return coord + (Math.random() - 0.5) * 0.05;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rwandaPhone() {
  const prefixes = ['078', '079', '072', '073'];
  return pick(prefixes) + Math.floor(1000000 + Math.random() * 9000000);
}

// Validate Districts() contains all expected districts
const allDistricts = new Set(Districts());
Object.values(PROVINCE_DISTRICTS).forEach(({ districts }) => {
  districts.forEach(d => {
    if (!allDistricts.has(d)) console.warn(`Warning: district "${d}" not in rwanda package`);
  });
});

// ── Business data ─────────────────────────────────────────────────────────────

const BUSINESSES = [
  // Restaurants (10)
  { name: 'Repas de Kigali',         category: 'Restaurants & Cafes',    district: 'Gasabo',     type: 'Restaurant', description: 'Upscale Rwandan cuisine in the heart of Gasabo.' },
  { name: 'Inzozi Restaurant',        category: 'Restaurants & Cafes',    district: 'Musanze',    type: 'Restaurant', description: 'Traditional Rwandan dishes with a view of the Virunga mountains.' },
  { name: 'Huye Garden Café',         category: 'Restaurants & Cafes',    district: 'Huye',       type: 'Restaurant', description: 'Relaxed café near the university serving local and continental food.' },
  { name: 'Rubavu Lakeside Grill',    category: 'Restaurants & Cafes',    district: 'Rubavu',     type: 'Restaurant', description: 'Grilled fish and brochettes by Lake Kivu.' },
  { name: 'Kamonyi Kitchen',          category: 'Restaurants & Cafes',    district: 'Kamonyi',    type: 'Restaurant', description: 'Home-style cooking popular with locals and travellers.' },
  { name: 'Nyagatare Grill House',    category: 'Restaurants & Cafes',    district: 'Nyagatare',  type: 'Restaurant', description: 'Beef grill specialties from Rwanda\'s cattle country.' },
  { name: 'Kicukiro Bites',           category: 'Restaurants & Cafes',    district: 'Kicukiro',   type: 'Restaurant', description: 'Quick and affordable meals in Kicukiro district.' },
  { name: 'Muhanga Dining Room',      category: 'Restaurants & Cafes',    district: 'Muhanga',    type: 'Restaurant', description: 'Family restaurant serving Rwandan and East African cuisine.' },
  { name: 'Ngoma River Café',         category: 'Restaurants & Cafes',    district: 'Ngoma',      type: 'Restaurant', description: 'Café by the Akagera with a tranquil riverside setting.' },
  { name: 'Rusizi Cuisine',           category: 'Restaurants & Cafes',    district: 'Rusizi',     type: 'Restaurant', description: 'Congolese-Rwandan fusion food in Kamembe town.' },

  // Hotels (6)
  { name: 'Kigali Skyline Hotel',     category: 'Hotels & Accommodation', district: 'Nyarugenge', type: 'Hotel', description: 'Boutique hotel with panoramic city views in downtown Kigali.' },
  { name: 'Musanze Mountain Lodge',   category: 'Hotels & Accommodation', district: 'Musanze',    type: 'Hotel', description: 'Eco-lodge at the foot of the Virunga volcanoes, ideal for gorilla trekkers.' },
  { name: 'Rubavu Lake View Hotel',   category: 'Hotels & Accommodation', district: 'Rubavu',     type: 'Hotel', description: 'Comfortable lakeside rooms on Lake Kivu in Gisenyi.' },
  { name: 'Huye Heritage Hotel',      category: 'Hotels & Accommodation', district: 'Huye',       type: 'Hotel', description: 'Historic hotel near the National Museum of Rwanda in Butare.' },
  { name: 'Nyagatare Plains Hotel',   category: 'Hotels & Accommodation', district: 'Nyagatare',  type: 'Hotel', description: 'Modern hotel serving the eastern province business travellers.' },
  { name: 'Bugesera Eco Lodge',       category: 'Hotels & Accommodation', district: 'Bugesera',   type: 'Hotel', description: 'Eco-friendly lodge near Bugesera wetlands and bird sanctuaries.' },

  // Bars (4)
  { name: 'Kigali Nights Bar',        category: 'Events & Entertainment', district: 'Gasabo',     type: 'Bar', description: 'Lively bar with live music and cocktails in Kimironko.' },
  { name: 'Kayonza Roadside Bar',     category: 'Events & Entertainment', district: 'Kayonza',    type: 'Bar', description: 'Popular stop-off bar on the Kigali-Rusumo highway.' },
  { name: 'Nyamasheke Hilltop Bar',   category: 'Events & Entertainment', district: 'Nyamasheke', type: 'Bar', description: 'Hillside bar with sweeping views over Lake Kivu.' },
  { name: 'Muhanga Social Club',      category: 'Events & Entertainment', district: 'Muhanga',    type: 'Bar', description: 'Community bar and event venue in Muhanga town.' },

  // Pharmacies (7)
  { name: 'Gasabo Pharmacy Plus',     category: 'Health & Wellness',      district: 'Gasabo',     type: 'Pharmacy', description: 'Full-service pharmacy stocking prescription and OTC medicines.' },
  { name: 'Kicukiro HealthPoint Pharmacy', category: 'Health & Wellness', district: 'Kicukiro',   type: 'Pharmacy', description: 'Modern pharmacy with trained pharmacists on duty.' },
  { name: 'Musanze Central Pharmacy', category: 'Health & Wellness',      district: 'Musanze',    type: 'Pharmacy', description: 'Largest pharmacy in the northern province.' },
  { name: 'Huye University Pharmacy', category: 'Health & Wellness',      district: 'Huye',       type: 'Pharmacy', description: 'Serving the University of Rwanda community and Butare town.' },
  { name: 'Rubavu Pharmacy',          category: 'Health & Wellness',      district: 'Rubavu',     type: 'Pharmacy', description: 'Well-stocked community pharmacy in Gisenyi.' },
  { name: 'Muhanga Town Pharmacy',    category: 'Health & Wellness',      district: 'Muhanga',    type: 'Pharmacy', description: 'Reliable pharmacy in Muhanga serving southern province residents.' },
  { name: 'Rwamagana Medicare Pharmacy', category: 'Health & Wellness',   district: 'Rwamagana',  type: 'Pharmacy', description: 'Licensed pharmacy providing quality medicines in Rwamagana.' },

  // Clinics (6)
  { name: 'Gasabo Family Clinic',     category: 'Health & Wellness',      district: 'Gasabo',     type: 'Clinic', description: 'Private clinic offering general medicine and maternity services.' },
  { name: 'Nyarugenge Medical Center',category: 'Health & Wellness',      district: 'Nyarugenge', type: 'Clinic', description: 'Specialist medical centre in central Kigali.' },
  { name: 'Musanze Polyclinic',       category: 'Health & Wellness',      district: 'Musanze',    type: 'Clinic', description: 'Multi-specialist clinic catering to northern province residents.' },
  { name: 'Huye Women\'s Clinic',     category: 'Health & Wellness',      district: 'Huye',       type: 'Clinic', description: 'Dedicated women\'s health and maternity clinic in Butare.' },
  { name: 'Rubavu Health Clinic',     category: 'Health & Wellness',      district: 'Rubavu',     type: 'Clinic', description: 'General practice clinic serving Gisenyi and surroundings.' },
  { name: 'Gicumbi General Clinic',   category: 'Health & Wellness',      district: 'Gicumbi',    type: 'Clinic', description: 'Affordable primary healthcare in Byumba town.' },

  // Car Rentals (5)
  { name: 'Kigali Drive Car Rental',  category: 'Transport & Logistics',  district: 'Nyarugenge', type: 'Car Rental', description: 'Self-drive and chauffeured car hire in Kigali city.' },
  { name: 'Rwanda Wheels',            category: 'Transport & Logistics',  district: 'Gasabo',     type: 'Car Rental', description: 'Fleet of saloons, SUVs and vans for short and long-term hire.' },
  { name: 'Musanze Car Hire',         category: 'Transport & Logistics',  district: 'Musanze',    type: 'Car Rental', description: 'Vehicle hire for gorilla trekking and volcanoes tours.' },
  { name: 'Rubavu Rentals',           category: 'Transport & Logistics',  district: 'Rubavu',     type: 'Car Rental', description: 'Affordable car hire serving Lake Kivu travellers.' },
  { name: 'Huye Auto Hire',           category: 'Transport & Logistics',  district: 'Huye',       type: 'Car Rental', description: 'Southern province car hire with university and NGO discounts.' },

  // Carpentry (6)
  { name: 'Kigali Woodcraft',         category: 'Construction & Real Estate', district: 'Kicukiro',  type: 'Carpentry', description: 'Custom furniture and interior woodwork for homes and offices.' },
  { name: 'Musanze Timber Works',     category: 'Construction & Real Estate', district: 'Musanze',   type: 'Carpentry', description: 'Structural carpentry and custom cabinetry in the north.' },
  { name: 'Huye Fine Furniture',      category: 'Construction & Real Estate', district: 'Huye',      type: 'Carpentry', description: 'Handcrafted mahogany and eucalyptus furniture.' },
  { name: 'Rubavu Woodworks',         category: 'Construction & Real Estate', district: 'Rubavu',    type: 'Carpentry', description: 'Doors, windows, and bespoke wooden fixtures near the lake.' },
  { name: 'Muhanga Carpentry Shop',   category: 'Construction & Real Estate', district: 'Muhanga',   type: 'Carpentry', description: 'Affordable school and office furniture for southern Rwanda.' },
  { name: 'Rwamagana Wood Masters',   category: 'Construction & Real Estate', district: 'Rwamagana', type: 'Carpentry', description: 'Quality joinery and flooring in eastern Rwanda.' },

  // Car Wash (6)
  { name: 'Kigali Sparkle Car Wash',  category: 'Car Wash',               district: 'Gasabo',     type: 'Car Wash', description: 'Hand-wash and detailing services in Kimironko.' },
  { name: 'Kicukiro Auto Shine',      category: 'Car Wash',               district: 'Kicukiro',   type: 'Car Wash', description: 'Express wash, wax and interior clean in Kicukiro.' },
  { name: 'Musanze Clean Cars',       category: 'Car Wash',               district: 'Musanze',    type: 'Car Wash', description: 'Thorough vehicle cleaning after safari and off-road trips.' },
  { name: 'Rubavu Premium Wash',      category: 'Car Wash',               district: 'Rubavu',     type: 'Car Wash', description: 'Waterfront car wash with premium detailing packages.' },
  { name: 'Huye Car Clean',           category: 'Car Wash',               district: 'Huye',       type: 'Car Wash', description: 'Student-friendly car wash near the university campus.' },
  { name: 'Nyagatare Express Wash',   category: 'Car Wash',               district: 'Nyagatare',  type: 'Car Wash', description: 'Fast wash and vacuum service on the eastern highway.' },

  // Fashion Shops (5)
  { name: 'Kigali Style Boutique',    category: 'Retail & Shops',         district: 'Nyarugenge', type: 'Fashion', description: 'Trendy African and Western fashion in downtown Kigali.' },
  { name: 'Ikaze Fashion',            category: 'Retail & Shops',         district: 'Gasabo',     type: 'Fashion', description: 'Kitenge, imigongo-print clothing and accessories.' },
  { name: 'Musanze Trend Center',     category: 'Retail & Shops',         district: 'Musanze',    type: 'Fashion', description: 'Affordable fashion for men, women and children in Ruhengeri.' },
  { name: 'Huye Fashion House',       category: 'Retail & Shops',         district: 'Huye',       type: 'Fashion', description: 'University-town boutique stocking local and imported clothing.' },
  { name: 'Rubavu Chic',             category: 'Retail & Shops',         district: 'Rubavu',     type: 'Fashion', description: 'Beach-inspired fashion and accessories by Lake Kivu.' },

  // Beauty / Hair Salons (5)
  { name: 'Kigali Glam Salon',        category: 'Beauty & Personal Care', district: 'Kicukiro',   type: 'Hair Salon', description: 'Full-service hair salon offering braids, weaves and treatments.' },
  { name: 'Musanze Beauty Studio',    category: 'Beauty & Personal Care', district: 'Musanze',    type: 'Hair Salon', description: 'Hair styling, facials and nail care in northern Rwanda.' },
  { name: 'Huye Hair & Nails',        category: 'Beauty & Personal Care', district: 'Huye',       type: 'Hair Salon', description: 'Popular student salon near the University of Rwanda.' },
  { name: 'Rubavu Spa & Salon',       category: 'Beauty & Personal Care', district: 'Rubavu',     type: 'Hair Salon', description: 'Spa treatments and hair styling with a lake-view terrace.' },
  { name: 'Kayonza Beauty Corner',    category: 'Beauty & Personal Care', district: 'Kayonza',    type: 'Hair Salon', description: 'Friendly neighbourhood salon in eastern Rwanda.' },

  // ── Kigali expansion: 10 per district ────────────────────────────────────

  // Gasabo (10)
  { name: 'Gisozi Brunch Spot',          category: 'Restaurants & Cafes',        district: 'Gasabo',     type: 'Restaurant',  description: 'Relaxed all-day brunch café in Gisozi neighbourhood.' },
  { name: 'Kimironko Fast Food',          category: 'Restaurants & Cafes',        district: 'Gasabo',     type: 'Restaurant',  description: 'Budget-friendly fast food popular with Kimironko market traders.' },
  { name: 'Norrsken Guest House',         category: 'Hotels & Accommodation',     district: 'Gasabo',     type: 'Hotel',       description: 'Modern guesthouse near the Norrsken innovation hub in Kigali.' },
  { name: 'Gasabo Wellness Pharmacy',     category: 'Health & Wellness',          district: 'Gasabo',     type: 'Pharmacy',    description: 'Community pharmacy stocking medicines, vitamins and baby care products.' },
  { name: 'Kimironko Health Center',      category: 'Health & Wellness',          district: 'Gasabo',     type: 'Clinic',      description: 'Busy primary-care clinic serving Kimironko and surrounding cells.' },
  { name: 'Gasabo City Car Hire',         category: 'Transport & Logistics',      district: 'Gasabo',     type: 'Car Rental',  description: 'Airport transfers and city car hire with flexible daily rates.' },
  { name: 'Remera Auto Wash',             category: 'Car Wash',                   district: 'Gasabo',     type: 'Car Wash',    description: 'Full-service hand wash and interior vacuum in Remera.' },
  { name: 'Kimironko Fashion Mall',       category: 'Retail & Shops',             district: 'Gasabo',     type: 'Fashion',     description: 'Multi-vendor fashion market with African prints and ready-to-wear.' },
  { name: 'Giporoso Glam Studio',         category: 'Beauty & Personal Care',     district: 'Gasabo',     type: 'Hair Salon',  description: 'Hair extensions, threading and nail art in Giporoso.' },
  { name: 'Gasabo Sports Bar',            category: 'Events & Entertainment',     district: 'Gasabo',     type: 'Bar',         description: 'Sports bar with multiple screens, cocktails and nyama choma.' },

  // Kicukiro (10)
  { name: 'Niboye Dining',               category: 'Restaurants & Cafes',        district: 'Kicukiro',   type: 'Restaurant',  description: 'Homestyle Rwandan lunch spot loved by Niboye residents.' },
  { name: 'Gikondo Kitchen',             category: 'Restaurants & Cafes',        district: 'Kicukiro',   type: 'Restaurant',  description: 'Industrial-area restaurant serving workers breakfast and lunch.' },
  { name: 'Sonatube Inn',                category: 'Hotels & Accommodation',     district: 'Kicukiro',   type: 'Hotel',       description: 'No-frills guesthouse near Kicukiro commercial zone.' },
  { name: 'Kicukiro Central Pharmacy',   category: 'Health & Wellness',          district: 'Kicukiro',   type: 'Pharmacy',    description: 'Licensed pharmacy open seven days serving Kicukiro town.' },
  { name: 'Gikondo Medical Clinic',      category: 'Health & Wellness',          district: 'Kicukiro',   type: 'Clinic',      description: 'General-practice clinic near Gikondo industrial park.' },
  { name: 'Nyanza Rent-A-Car',           category: 'Transport & Logistics',      district: 'Kicukiro',   type: 'Car Rental',  description: 'Compact and economy car hire for city driving in Kigali.' },
  { name: 'Gikondo Shine Car Wash',      category: 'Car Wash',                   district: 'Kicukiro',   type: 'Car Wash',    description: 'Steam and pressure-wash centre behind Gikondo roundabout.' },
  { name: 'Kicukiro Urban Fashion',      category: 'Retail & Shops',             district: 'Kicukiro',   type: 'Fashion',     description: 'Urban streetwear and tailored suits for Kicukiro professionals.' },
  { name: 'Niboye Beauty Lounge',        category: 'Beauty & Personal Care',     district: 'Kicukiro',   type: 'Hair Salon',  description: 'Hair relaxers, braids and pedicure services in Niboye.' },
  { name: 'Kicukiro Fine Furniture',     category: 'Construction & Real Estate', district: 'Kicukiro',   type: 'Carpentry',   description: 'Bespoke living-room and bedroom sets crafted in Kicukiro workshop.' },

  // Nyarugenge (10)
  { name: 'CBD Restaurant & Lounge',     category: 'Restaurants & Cafes',        district: 'Nyarugenge', type: 'Restaurant',  description: 'Modern bistro in the central business district serving lunch and dinner.' },
  { name: 'Quartier Latin Café',         category: 'Restaurants & Cafes',        district: 'Nyarugenge', type: 'Restaurant',  description: 'European-style café with espresso, pastries and Wi-Fi.' },
  { name: 'Kamere Boutique Hotel',       category: 'Hotels & Accommodation',     district: 'Nyarugenge', type: 'Hotel',       description: 'Boutique hotel with rooftop bar in the heart of Nyarugenge.' },
  { name: 'Nyarugenge Pharmacy Central', category: 'Health & Wellness',          district: 'Nyarugenge', type: 'Pharmacy',    description: '24-hour pharmacy on KN5 Ave serving downtown Kigali.' },
  { name: 'KN Avenue Medical Center',    category: 'Health & Wellness',          district: 'Nyarugenge', type: 'Clinic',      description: 'Walk-in clinic with labs and imaging on Kigali\'s main avenue.' },
  { name: 'Downtown Car Solutions',      category: 'Transport & Logistics',      district: 'Nyarugenge', type: 'Car Rental',  description: 'Executive and economy car hire minutes from Kigali Convention Centre.' },
  { name: 'City Express Car Wash',       category: 'Car Wash',                   district: 'Nyarugenge', type: 'Car Wash',    description: 'Quick express wash for CBD workers during lunch hour.' },
  { name: 'Nyarugenge Boutique',         category: 'Retail & Shops',             district: 'Nyarugenge', type: 'Fashion',     description: 'Designer African wear and accessories in Kigali city centre.' },
  { name: 'Downtown Beauty Bar',         category: 'Beauty & Personal Care',     district: 'Nyarugenge', type: 'Hair Salon',  description: 'Walk-in salon offering quick styles for downtown professionals.' },
  { name: 'Nyarugenge Rooftop Bar',      category: 'Events & Entertainment',     district: 'Nyarugenge', type: 'Bar',         description: 'Rooftop cocktail bar with panoramic views of Kigali hills.' },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure extra categories exist
    const extraCategories = [
      { name: 'Hotels & Accommodation', description: 'Hotels, guesthouses and lodges', icon: 'bed' },
      { name: 'Car Wash',               description: 'Vehicle cleaning and detailing services', icon: 'droplets' },
    ];
    for (const cat of extraCategories) {
      await client.query(
        `INSERT INTO categories (name, description, icon) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [cat.name, cat.description, cat.icon]
      );
    }

    // 2. Load all category ids
    const { rows: cats } = await client.query('SELECT id, name FROM categories');
    const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

    // 3. Ensure super admin user exists
    const adminEmail = 'admin@smartbiz.rw';
    const adminExists = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (!adminExists.rows.length) {
      const adminHash = await bcrypt.hash('Admin@SmartBiz1', 10);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, is_superadmin)
         VALUES ($1, $2, $3, 'admin', true)`,
        ['Super Admin', adminEmail, adminHash]
      );
    }

    // 4. Ensure seed owner user exists
    const seedEmail = 'seed.owner@smartbiz.rw';
    let ownerId;
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [seedEmail]);
    if (existing.rows.length) {
      ownerId = existing.rows[0].id;
    } else {
      const hash = await bcrypt.hash('SeedPass123!', 10);
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'business_owner') RETURNING id`,
        ['Seed Owner', seedEmail, hash]
      );
      ownerId = rows[0].id;
    }

    // 4. Insert businesses
    let inserted = 0;
    for (const biz of BUSINESSES) {
      const categoryId = catMap[biz.category];
      if (!categoryId) {
        console.warn(`Category not found: "${biz.category}" — skipping "${biz.name}"`);
        continue;
      }

      const [baseLat, baseLon] = DISTRICT_COORDS[biz.district] ?? [-1.94, 30.06];
      const lat = jitter(baseLat);
      const lon = jitter(baseLon);
      const phone = rwandaPhone();
      const emailSlug = biz.name.toLowerCase().replace(/[^a-z0-9]+/g, '');

      await client.query(
        `INSERT INTO businesses
           (owner_id, category_id, name, description, phone, email, address, city, latitude, longitude, is_verified, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,true)
         ON CONFLICT DO NOTHING`,
        [
          ownerId,
          categoryId,
          biz.name,
          biz.description,
          phone,
          `${emailSlug}@smartbiz.rw`,
          `${biz.district} District, Rwanda`,
          biz.district,
          lat.toFixed(7),
          lon.toFixed(7),
        ]
      );
      inserted++;
    }

    await client.query('COMMIT');
    console.log(`Seeded ${inserted} businesses across Rwanda.`);
    console.log(`Super admin: ${adminEmail} / Admin@SmartBiz1`);
    console.log(`Seed owner:  ${seedEmail} / SeedPass123!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
