/** Deterministic demo data definitions. All phones are real RU mobile ranges. */

export interface SeedUserDefinition {
  phone: string;
  name: string;
  isActive: boolean;
  /** How many days ago the account was created. */
  createdDaysAgo: number;
}

export interface SeedPromocodeDefinition {
  code: string;
  discountPercent: number;
  maxUsagesTotal: number | null;
  maxUsagesPerUser: number | null;
  /** Days relative to now; negative is in the past. `null` means no boundary. */
  validFromDays: number | null;
  validUntilDays: number | null;
  isActive: boolean;
  /** Whether the seeder may attach this code to generated orders. */
  usableInSeed: boolean;
}

export const SEED_PASSWORD = 'Demo1234!';

/** Index 0 is the demo account documented in the README. */
export const SEED_USERS: SeedUserDefinition[] = [
  { phone: '+79991234567', name: 'Демо Пользователь', isActive: true, createdDaysAgo: 60 },
  { phone: '+79161234501', name: 'Анна Смирнова', isActive: true, createdDaysAgo: 55 },
  { phone: '+79031234502', name: 'Борис Кузнецов', isActive: true, createdDaysAgo: 52 },
  { phone: '+79261234503', name: 'Виктория Попова', isActive: true, createdDaysAgo: 48 },
  { phone: '+79851234504', name: 'Григорий Лебедев', isActive: true, createdDaysAgo: 44 },
  { phone: '+79771234505', name: 'Дарья Новикова', isActive: true, createdDaysAgo: 40 },
  { phone: '+79521234506', name: 'Егор Морозов', isActive: false, createdDaysAgo: 36 },
  { phone: '+79211234507', name: 'Жанна Волкова', isActive: true, createdDaysAgo: 32 },
  { phone: '+79501234508', name: 'Игорь Соколов', isActive: true, createdDaysAgo: 28 },
  { phone: '+79871234509', name: 'Ксения Павлова', isActive: true, createdDaysAgo: 24 },
  { phone: '+79631234510', name: 'Леонид Орлов', isActive: true, createdDaysAgo: 20 },
  { phone: '+79271234511', name: 'Мария Зайцева', isActive: false, createdDaysAgo: 16 },
];

/** Covers every promo state: ACTIVE, SCHEDULED, EXPIRED, DISABLED, EXHAUSTED. */
export const SEED_PROMOCODES: SeedPromocodeDefinition[] = [
  {
    code: 'WELCOME10',
    discountPercent: 10,
    maxUsagesTotal: null,
    maxUsagesPerUser: null,
    validFromDays: -60,
    validUntilDays: null,
    isActive: true,
    usableInSeed: true,
  },
  {
    code: 'SALE20',
    discountPercent: 20,
    maxUsagesTotal: 100,
    maxUsagesPerUser: 5,
    validFromDays: -45,
    validUntilDays: 45,
    isActive: true,
    usableInSeed: true,
  },
  {
    code: 'SUMMER_50',
    discountPercent: 50,
    maxUsagesTotal: 500,
    maxUsagesPerUser: null,
    validFromDays: -30,
    validUntilDays: 60,
    isActive: true,
    usableInSeed: true,
  },
  {
    code: 'FREESHIP-5',
    discountPercent: 5,
    maxUsagesTotal: null,
    maxUsagesPerUser: null,
    validFromDays: null,
    validUntilDays: null,
    isActive: true,
    usableInSeed: true,
  },
  {
    code: 'VIP15',
    discountPercent: 15,
    maxUsagesTotal: null,
    maxUsagesPerUser: 1,
    validFromDays: -25,
    validUntilDays: null,
    isActive: true,
    usableInSeed: true,
  },
  // EXPIRED — the window closed ten days ago, historical usages still count.
  {
    code: 'SPRING5',
    discountPercent: 5,
    maxUsagesTotal: null,
    maxUsagesPerUser: null,
    validFromDays: -90,
    validUntilDays: -10,
    isActive: true,
    usableInSeed: true,
  },
  // SCHEDULED — starts in ten days.
  {
    code: 'AUTUMN25',
    discountPercent: 25,
    maxUsagesTotal: 200,
    maxUsagesPerUser: 2,
    validFromDays: 10,
    validUntilDays: 90,
    isActive: true,
    usableInSeed: false,
  },
  // DISABLED — switched off manually.
  {
    code: 'BLACKFRIDAY30',
    discountPercent: 30,
    maxUsagesTotal: 1000,
    maxUsagesPerUser: 3,
    validFromDays: -15,
    validUntilDays: 120,
    isActive: false,
    usableInSeed: false,
  },
  // EXHAUSTED — the seeder fills all three slots.
  {
    code: 'LIMIT3',
    discountPercent: 40,
    maxUsagesTotal: 3,
    maxUsagesPerUser: 1,
    validFromDays: -20,
    validUntilDays: null,
    isActive: true,
    usableInSeed: true,
  },
];

export const SEED_ORDERS_COUNT = 240;
export const SEED_MIN_USAGES = 165;
