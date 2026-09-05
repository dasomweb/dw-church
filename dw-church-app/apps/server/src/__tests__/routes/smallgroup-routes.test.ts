/**
 * 스몰그룹(smallgroup) route tests — add-on gate + validation + CRUD wiring.
 * All routes require auth + the 'smallgroup' add-on (feature_overrides); the
 * service is mocked so this exercises the gate + schema + routing only.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', () => ({
  prisma: { tenant: { findFirst: vi.fn() }, $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: [] },
}));

const svc = {
  getPreset: vi.fn(), updatePreset: vi.fn(), applyPreset: vi.fn(),
  listGroups: vi.fn(), getGroupTree: vi.fn(), memberGroupMap: vi.fn(), getGroup: vi.fn(),
  createGroup: vi.fn(), updateGroup: vi.fn(), deleteGroup: vi.fn(),
  listGroupMembers: vi.fn(), addGroupMember: vi.fn(), assignMembers: vi.fn(),
  updateGroupMember: vi.fn(), removeGroupMember: vi.fn(),
  listQueue: vi.fn(), createQueueItem: vi.fn(), placeFromQueue: vi.fn(), deleteQueueItem: vi.fn(),
  splitGroup: vi.fn(), listPublicGroups: vi.fn(),
};
vi.mock('../../modules/smallgroup/service.js', () => svc);

const rep = {
  listReports: vi.fn(), monitoringGrid: vi.fn(), draftReport: vi.fn(), getReport: vi.fn(),
  upsertReport: vi.fn(), confirmReport: vi.fn(), deleteReport: vi.fn(),
};
vi.mock('../../modules/smallgroup/reports-service.js', () => rep);

const edu = {
  listCourses: vi.fn(), createCourse: vi.fn(), seedCoursesFromPreset: vi.fn(),
  updateCourse: vi.fn(), deleteCourse: vi.fn(),
  listTerms: vi.fn(), getTerm: vi.fn(), createTerm: vi.fn(), updateTerm: vi.fn(), deleteTerm: vi.fn(),
  completeTerm: vi.fn(), enroll: vi.fn(), updateEnrollment: vi.fn(), removeEnrollment: vi.fn(),
  recordSessions: vi.fn(), memberEnrollments: vi.fn(),
};
vi.mock('../../modules/smallgroup/courses-service.js', () => edu);

const com = {
  listNotices: vi.fn(), createNotice: vi.fn(), updateNotice: vi.fn(), deleteNotice: vi.fn(),
  listResources: vi.fn(), createResource: vi.fn(), updateResource: vi.fn(), deleteResource: vi.fn(),
};
vi.mock('../../modules/smallgroup/community-service.js', () => com);

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
function token(role = 'admin') {
  return jwt.sign({ userId: 'u1', email: 't@t.com', tenantId: 't1', tenantSlug: 'base', role }, JWT_SECRET, { expiresIn: '1h' });
}
const GID = '11111111-1111-1111-1111-111111111111';
const MID = '22222222-2222-2222-2222-222222222222';

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { tenantMiddleware } = await import('../../middleware/tenant.js');
  app.addHook('preHandler', tenantMiddleware);
  const { smallgroupRoutes } = await import('../../modules/smallgroup/routes.js');
  await app.register(smallgroupRoutes, { prefix: '/api/v1' });

  const { prisma } = await import('../../config/database.js');
  vi.mocked(prisma.tenant.findFirst).mockResolvedValue(
    { id: 't1', slug: 'base', name: 'Base Church', plan: 'base', isActive: true } as Awaited<ReturnType<typeof prisma.tenant.findFirst>>,
  );
  vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([{ feature_overrides: null }] as never);

  svc.getPreset.mockResolvedValue({ model: 'A', terminology: { org: '목장', leader: '목자' }, levelDefs: [], isConfigured: false });
  svc.updatePreset.mockResolvedValue({ model: 'A', isConfigured: true });
  svc.applyPreset.mockResolvedValue({ model: 'B', terminology: { org: '구역' } });
  svc.listGroups.mockResolvedValue([]);
  svc.getGroupTree.mockResolvedValue([]);
  svc.memberGroupMap.mockResolvedValue([]);
  svc.getGroup.mockResolvedValue({ id: GID, name: '3목장', members: [] });
  svc.createGroup.mockResolvedValue({ id: GID, name: '3목장' });
  svc.updateGroup.mockResolvedValue({ id: GID, name: '3목장(수정)' });
  svc.deleteGroup.mockResolvedValue(true);
  svc.listGroupMembers.mockResolvedValue([]);
  svc.addGroupMember.mockResolvedValue({ id: 'gm1', member_id: MID });
  svc.assignMembers.mockResolvedValue({ added: 3, skipped: [] });
  svc.updateGroupMember.mockResolvedValue({ id: 'gm1', role: 'leader' });
  svc.removeGroupMember.mockResolvedValue(true);
  svc.listQueue.mockResolvedValue([]);
  svc.createQueueItem.mockResolvedValue({ id: 'q1' });
  svc.placeFromQueue.mockResolvedValue({ id: 'q1', status: 'placed' });
  svc.deleteQueueItem.mockResolvedValue(true);

  rep.listReports.mockResolvedValue([]);
  rep.monitoringGrid.mockResolvedValue({ weeks: [], rows: [], unsubmittedLatest: [], latestWeek: '' });
  rep.draftReport.mockResolvedValue({ id: null, group_id: GID, status: 'draft', attendance: [] });
  rep.getReport.mockResolvedValue({ id: 'r1', group_id: GID, status: 'submitted', attendance: [] });
  rep.upsertReport.mockResolvedValue({ id: 'r1', status: 'submitted' });
  rep.confirmReport.mockResolvedValue({ id: 'r1', status: 'confirmed' });
  rep.deleteReport.mockResolvedValue(true);

  edu.listCourses.mockResolvedValue([]);
  edu.createCourse.mockResolvedValue({ id: 'c1', name: '새생명반' });
  edu.seedCoursesFromPreset.mockResolvedValue({ created: 5, courses: [] });
  edu.updateCourse.mockResolvedValue({ id: 'c1', name: '새생명반(수정)' });
  edu.deleteCourse.mockResolvedValue(true);
  edu.listTerms.mockResolvedValue([]);
  edu.getTerm.mockResolvedValue({ id: 't1', enrollments: [] });
  edu.createTerm.mockResolvedValue({ id: 't1', name: '12기' });
  edu.updateTerm.mockResolvedValue({ id: 't1' });
  edu.deleteTerm.mockResolvedValue(true);
  edu.completeTerm.mockResolvedValue({ completed: 4, below: ['차예린'], term: { id: 't1' } });
  edu.enroll.mockResolvedValue({ added: 2, skipped: [] });
  edu.updateEnrollment.mockResolvedValue({ id: 'e1', status: 'completed' });
  edu.removeEnrollment.mockResolvedValue(true);
  edu.recordSessions.mockResolvedValue({ saved: 3 });
  edu.memberEnrollments.mockResolvedValue([]);

  svc.splitGroup.mockResolvedValue({ group: { id: 'g2', name: '25목장' }, moved: 3 });
  com.listNotices.mockResolvedValue([]);
  com.createNotice.mockResolvedValue({ id: 'n1', title: '모임 공지' });
  com.updateNotice.mockResolvedValue({ id: 'n1' });
  com.deleteNotice.mockResolvedValue(true);
  com.listResources.mockResolvedValue([]);
  com.createResource.mockResolvedValue({ id: 'res1', title: '9월 1주 교안' });
  com.updateResource.mockResolvedValue({ id: 'res1' });
  com.deleteResource.mockResolvedValue(true);
});
afterAll(async () => { await app.close(); });

async function withAddon(): Promise<void> {
  const { prisma } = await import('../../config/database.js');
  vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([{ feature_overrides: { smallgroup: true } }] as never);
}
const auth = () => ({ authorization: `Bearer ${token()}` });
const H = () => ({ 'x-tenant-slug': 'base', ...auth() });

describe('smallgroup — add-on gate', () => {
  it('GET /groups without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/groups', headers: { 'x-tenant-slug': 'base' } });
    expect(res.statusCode).toBe(401);
  });

  it('GET /groups WITHOUT the 스몰그룹 add-on → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/groups', headers: H() });
    expect(res.statusCode).toBe(403);
    expect(res.json().error?.code).toBe('PLAN_UPGRADE_REQUIRED');
  });

  it('GET /groups WITH the add-on → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/groups', headers: H() });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data)).toBe(true);
  });
});

describe('preset (SG-01)', () => {
  it('GET /group-preset → 200 with model', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/group-preset', headers: H() });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.model).toBe('A');
  });

  it('POST /group-preset/apply with bad model → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/group-preset/apply', headers: H(), payload: { model: 'Z' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /group-preset/apply model B → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/group-preset/apply', headers: H(), payload: { model: 'B' } });
    expect(res.statusCode).toBe(200);
    expect(svc.applyPreset).toHaveBeenCalledWith('tenant_base', 'B');
  });

  it('PUT /group-preset with partial terminology → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'PUT', url: '/api/v1/group-preset', headers: H(), payload: { terminology: { org: '목장', leader: '목자' } } });
    expect(res.statusCode).toBe(200);
  });
});

describe('groups CRUD', () => {
  it('POST /groups without name → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/groups', headers: H(), payload: { level: 2 } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /groups → 201', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/groups', headers: H(), payload: { name: '3목장', level: 2 } });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe(GID);
  });

  it('GET /groups/tree → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/groups/tree', headers: H() });
    expect(res.statusCode).toBe(200);
  });

  it('DELETE /groups/:id → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'DELETE', url: `/api/v1/groups/${GID}`, headers: H() });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.deleted).toBe(true);
  });
});

describe('roster + queue', () => {
  it('POST /group-members/assign with empty ids → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/group-members/assign', headers: H(), payload: { groupId: GID, memberIds: [] } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /group-members/assign → 200 {added}', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/group-members/assign', headers: H(), payload: { groupId: GID, memberIds: [MID] } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.added).toBe(3);
  });

  it('POST /groups/:id/members bad memberId → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: `/api/v1/groups/${GID}/members`, headers: H(), payload: { memberId: 'not-a-uuid' } });
    expect(res.statusCode).toBe(400);
  });

  it('GET /group-queue → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/group-queue', headers: H() });
    expect(res.statusCode).toBe(200);
  });

  it('POST /group-queue/:id/place → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/group-queue/33333333-3333-3333-3333-333333333333/place', headers: H(), payload: { groupId: GID } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('placed');
  });
});

describe('meeting reports (STEP 2)', () => {
  it('GET /meeting-reports/monitor → 200 grid', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/meeting-reports/monitor?weeks=8', headers: H() });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveProperty('weeks');
  });

  it('GET /meeting-reports/draft without groupId → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/meeting-reports/draft?date=2026-09-06', headers: H() });
    expect(res.statusCode).toBe(400);
  });

  it('GET /meeting-reports/draft → 200 draft', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: `/api/v1/meeting-reports/draft?groupId=${GID}&date=2026-09-06`, headers: H() });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('draft');
  });

  it('POST /meeting-reports without meetingDate → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/meeting-reports', headers: H(), payload: { groupId: GID } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /meeting-reports → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/meeting-reports', headers: H(), payload: { groupId: GID, meetingDate: '2026-09-06', status: 'submitted', attendance: [{ memberId: MID, status: 'present' }] } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('submitted');
  });

  it('POST /meeting-reports/:id/confirm → 200 confirmed', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/meeting-reports/44444444-4444-4444-4444-444444444444/confirm', headers: H(), payload: { confirmer: '박목사' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('confirmed');
  });
});

describe('education (STEP 3)', () => {
  it('GET /courses → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/courses', headers: H() });
    expect(res.statusCode).toBe(200);
  });

  it('POST /courses without name → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/courses', headers: H(), payload: { totalSessions: 8 } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /courses/seed-defaults → 200 {created}', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/courses/seed-defaults', headers: H(), payload: {} });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.created).toBe(5);
  });

  it('POST /enrollments with empty ids → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/enrollments', headers: H(), payload: { termId: GID, memberIds: [] } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /session-attendance → 200 {saved}', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/session-attendance', headers: H(), payload: { entries: [{ enrollmentId: GID, sessionNo: 1, status: 'present' }] } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.saved).toBe(3);
  });

  it('POST /course-terms/:id/complete → 200 {completed, below}', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: `/api/v1/course-terms/${GID}/complete`, headers: H(), payload: { overrideBelow: false } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.completed).toBe(4);
    expect(res.json().data.below).toContain('차예린');
  });

  it('GET /members/:id/enrollments → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: `/api/v1/members/${MID}/enrollments`, headers: H() });
    expect(res.statusCode).toBe(200);
  });
});

describe('community + split (STEP 4)', () => {
  it('POST /groups/:id/split → 201 {group, moved}', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: `/api/v1/groups/${GID}/split`, headers: H(), payload: { name: '25목장', memberIds: [MID] } });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.moved).toBe(3);
  });

  it('POST /groups/:id/split without name → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: `/api/v1/groups/${GID}/split`, headers: H(), payload: { memberIds: [MID] } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /group-notices without title → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/group-notices', headers: H(), payload: { body: '내용' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /group-notices → 201', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/group-notices', headers: H(), payload: { title: '모임 공지', target: { scope: 'leaders' } } });
    expect(res.statusCode).toBe(201);
  });

  it('POST /group-resources → 201', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/group-resources', headers: H(), payload: { title: '9월 1주 교안', category: '주간교안' } });
    expect(res.statusCode).toBe(201);
  });

  it('GET /public/groups → 200 WITHOUT auth (public storefront)', async () => {
    svc.listPublicGroups.mockResolvedValueOnce([{ id: GID, name: '25목장', member_count: 6 }]);
    const res = await app.inject({ method: 'GET', url: '/api/v1/public/groups', headers: { 'x-tenant-slug': 'base' } });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data)).toBe(true);
  });
});
