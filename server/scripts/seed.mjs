/**
 * Seeds demo promo codes and a few redemptions via the public API.
 * Usage: node scripts/seed.mjs [apiBaseUrl]
 *   default apiBaseUrl = http://localhost:3000/api
 */
const API = process.argv[2] ?? 'http://localhost:3000/api';

const now = Date.now();
const day = 86400000;

const samples = [
  { code: 'SUMMER25', description: 'Summer sale', discountType: 'PERCENTAGE', discountValue: 25, maxUsages: 100, status: 'ACTIVE' },
  { code: 'WELCOME10', description: 'New customers', discountType: 'PERCENTAGE', discountValue: 10, maxUsages: 0, status: 'ACTIVE' },
  { code: 'FIXED500', description: 'Flat 500 off', discountType: 'FIXED', discountValue: 500, maxUsages: 50, status: 'ACTIVE' },
  { code: 'BLACKFRIDAY', description: 'Black Friday', discountType: 'PERCENTAGE', discountValue: 50, maxUsages: 200, status: 'PAUSED' },
  { code: 'SPRING15', description: 'Spring promo', discountType: 'PERCENTAGE', discountValue: 15, maxUsages: 80, status: 'ACTIVE' },
  { code: 'VIP1000', description: 'VIP customers', discountType: 'FIXED', discountValue: 1000, maxUsages: 20, status: 'ACTIVE' },
  { code: 'OLD2020', description: 'Expired campaign', discountType: 'PERCENTAGE', discountValue: 30, maxUsages: 100, status: 'EXPIRED' },
  { code: 'FREESHIP', description: 'Free shipping', discountType: 'FIXED', discountValue: 150, maxUsages: 0, status: 'ACTIVE' },
];

async function main() {
  console.log(`Seeding against ${API}`);
  const created = [];

  for (const s of samples) {
    const body = {
      ...s,
      startsAt: new Date(now - 5 * day).toISOString(),
      expiresAt: s.status === 'EXPIRED'
        ? new Date(now - day).toISOString()
        : new Date(now + 60 * day).toISOString(),
    };
    const res = await fetch(`${API}/promocodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      created.push(await res.json());
      console.log(`  + ${s.code}`);
    } else {
      console.log(`  ! ${s.code} -> ${res.status} ${await res.text()}`);
    }
  }

  // Generate some redemptions for active codes with random order amounts.
  const active = created.filter((c) => c.status === 'ACTIVE');
  let redemptions = 0;
  for (const c of active) {
    const count = 1 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const orderAmount = Math.round((500 + Math.random() * 4500) * 100) / 100;
      const res = await fetch(`${API}/promocodes/${c.id}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderAmount }),
      });
      if (res.ok) redemptions++;
    }
  }

  console.log(`Done. ${created.length} promo codes, ${redemptions} redemptions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
