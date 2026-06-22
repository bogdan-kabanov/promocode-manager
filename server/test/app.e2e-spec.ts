/**
 * E2E тесты для PromoCode Manager API.
 * Запускаются при наличии работающих контейнеров (MongoDB, ClickHouse, Redis).
 * Используют реальные HTTP-запросы к http://localhost:3000/api.
 */

const API = 'http://localhost:3000/api';

describe('PromoCode Manager API (e2e)', () => {
  let createdId: string;

  // --- Health ---
  describe('GET /health', () => {
    it('should return ok', async () => {
      const res = await fetch(`${API}/health`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.status).toBe('ok');
    });
  });

  // --- CRUD ---
  describe('POST /promocodes (create)', () => {
    it('should create a promo code', async () => {
      const res = await fetch(`${API}/promocodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'E2ETEST',
          description: 'E2E test promo',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          maxUsages: 10,
          status: 'ACTIVE',
          startsAt: '2026-01-01T00:00:00.000Z',
          expiresAt: '2027-01-01T00:00:00.000Z',
        }),
      });
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.code).toBe('E2ETEST');
      expect(body.id).toBeDefined();
      createdId = body.id;
    });

    it('should return 409 on duplicate code', async () => {
      const res = await fetch(`${API}/promocodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'E2ETEST',
          discountType: 'FIXED',
          discountValue: 10,
          maxUsages: 5,
          status: 'ACTIVE',
          startsAt: '2026-01-01T00:00:00.000Z',
        }),
      });
      expect(res.status).toBe(409);
    });

    it('should return 400 on invalid input', async () => {
      const res = await fetch(`${API}/promocodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'X' }), // too short, missing fields
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /promocodes (list)', () => {
    it('should return paginated results from ClickHouse', async () => {
      // ClickHouse needs a moment for async insert
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch(`${API}/promocodes?page=1&pageSize=5`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(body.rows)).toBe(true);
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(5);
    });

    it('should support search filter', async () => {
      const res = await fetch(`${API}/promocodes?search=E2ETEST`);
      const body = await res.json();
      expect(body.rows.some((r: any) => r.code === 'E2ETEST')).toBe(true);
    });

    it('should support status filter', async () => {
      const res = await fetch(`${API}/promocodes?status=ACTIVE`);
      const body = await res.json();
      expect(body.rows.every((r: any) => r.status === 'ACTIVE')).toBe(true);
    });

    it('should support sorting', async () => {
      const res = await fetch(`${API}/promocodes?sortField=code&sortOrder=asc&pageSize=50`);
      const body = await res.json();
      const codes = body.rows.map((r: any) => r.code);
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });
  });

  describe('PATCH /promocodes/:id (update)', () => {
    it('should update description and discountValue', async () => {
      const res = await fetch(`${API}/promocodes/${createdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated', discountValue: 20 }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.description).toBe('Updated');
      expect(body.discountValue).toBe(20);
    });

    it('should return 404 for non-existent id', async () => {
      const res = await fetch(`${API}/promocodes/000000000000000000000000`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Nope' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /promocodes/:id/redeem', () => {
    it('should increment usedCount', async () => {
      const res = await fetch(`${API}/promocodes/${createdId}/redeem`, {
        method: 'POST',
      });
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.usedCount).toBe(1);
    });

    it('should return 404 for non-existent id', async () => {
      const res = await fetch(`${API}/promocodes/000000000000000000000000/redeem`, {
        method: 'POST',
      });
      expect(res.status).toBe(404);
    });
  });

  // --- Analytics ---
  describe('GET /analytics/summary', () => {
    it('should return analytics with expected shape', async () => {
      const res = await fetch(`${API}/analytics/summary`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.totalPromocodes).toBeGreaterThanOrEqual(1);
      expect(body.activePromocodes).toBeGreaterThanOrEqual(0);
      expect(body.totalRedemptions).toBeGreaterThanOrEqual(0);
      expect(body.totalDiscountGiven).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(body.byStatus)).toBe(true);
      expect(Array.isArray(body.redemptionsByDay)).toBe(true);
      expect(Array.isArray(body.topPromocodes)).toBe(true);
    });
  });

  describe('GET /analytics/redemptions', () => {
    it('should return paginated redemptions', async () => {
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch(`${API}/analytics/redemptions?page=1&pageSize=10`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(body.rows)).toBe(true);
      expect(body.total).toBeGreaterThanOrEqual(0);
    });

    it('should support code filter', async () => {
      const res = await fetch(`${API}/analytics/redemptions?code=E2ETEST`);
      const body = await res.json();
      expect(body.rows.every((r: any) => r.code === 'E2ETEST')).toBe(true);
    });
  });

  // --- Delete ---
  describe('DELETE /promocodes/:id', () => {
    it('should delete the promo code', async () => {
      const res = await fetch(`${API}/promocodes/${createdId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(204);
    });

    it('should return 404 after deletion', async () => {
      const res = await fetch(`${API}/promocodes/${createdId}/redeem`, {
        method: 'POST',
      });
      expect(res.status).toBe(404);
    });

    it('should not appear in ClickHouse list after delete', async () => {
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch(`${API}/promocodes?search=E2ETEST`);
      const body = await res.json();
      expect(body.rows.some((r: any) => r.code === 'E2ETEST')).toBe(false);
    });
  });
});
