import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpressV2Dispatcher } from './appModule';

test('Express + NestJS V2 API Controller responds to /api/v2/health and /api/v2/reconcile', async () => {
  const dispatch = createExpressV2Dispatcher();

  const healthRes = await dispatch({ method: 'GET', path: '/api/v2/health' });
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.json.version, '2.0.0');
  assert.equal(healthRes.json.themePosture, 'daylight-multicolour-pastel-only');
  assert.equal(healthRes.json.schemaTables.includes('v2_workspaces'), true);

  const reconcileRes = await dispatch({
    method: 'POST',
    path: '/api/v2/reconcile',
    body: {
      remoteRecords: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          workspace_id: '99999999-9999-4999-8999-999999999999',
          updated_at: '2026-11-04T00:00:00.000Z',
        },
      ],
      localRecords: [],
      confirmedCloudIds: [],
      deletedTombstoneIds: [],
      canonicalWorkspaceId: '99999999-9999-4999-8999-999999999999',
    },
  });

  assert.equal(reconcileRes.status, 200);
  assert.equal(reconcileRes.json.merged.length, 1);
});
