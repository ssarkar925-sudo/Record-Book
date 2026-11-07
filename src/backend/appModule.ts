import {
  computeOverviewMetrics,
  computeNoteChecklistTotals,
  reconcileV2Records,
} from '../v2/engine/financialEngine';
import {
  ChecklistItem,
  V2Account,
  V2CreditCard,
  V2LedgerEntry,
  V2PartyDue,
} from '../types/v2';

/**
 * NestJS-Structured Architectural Decorators & DI Container
 * Provides structured backend Services, Controllers, and Express.js Route Handlers
 */
export function Injectable(): ClassDecorator {
  return () => {};
}

export function Controller(prefix: string): ClassDecorator {
  return (target: any) => {
    target.__controllerPrefix = prefix;
  };
}

export function Module(metadata: {
  controllers: any[];
  providers: any[];
}): ClassDecorator {
  return (target: any) => {
    target.__moduleMetadata = metadata;
  };
}

@Injectable()
export class SystemDiagnosticsService {
  public getSystemStatus() {
    return {
      application: 'Record Book V2 — Financial & Wealth Suite',
      version: '2.0.0',
      themePosture: 'daylight-multicolour-pastel-only',
      stack: [
        'TypeScript',
        'Tailwind CSS',
        'shadcn/ui',
        'Framer Motion',
        'GSAP',
        'Vite',
        'Node.js',
        'Express.js',
        'NestJS Modular Architecture',
        'PostgreSQL',
        'Supabase Realtime V2',
      ],
      schemaTables: [
        'v2_workspaces',
        'v2_accounts',
        'v2_ledger_entries',
        'v2_parties_dues',
        'v2_credit_cards',
        'v2_sheets',
        'v2_notes',
        'v2_vault_items',
      ],
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}

@Injectable()
export class LedgerReconciliationService {
  public computeSummary(payload: {
    accounts: V2Account[];
    entries: V2LedgerEntry[];
    dues: V2PartyDue[];
    cards: V2CreditCard[];
  }) {
    return computeOverviewMetrics(payload);
  }

  public evaluateChecklist(items: ChecklistItem[]) {
    return computeNoteChecklistTotals(items);
  }

  public reconcileDataset<T extends { id: string; workspace_id: string; updated_at: string }>(params: {
    remoteRecords: T[];
    localRecords: T[];
    confirmedCloudIds: string[];
    deletedTombstoneIds: string[];
    canonicalWorkspaceId: string;
  }) {
    const out = reconcileV2Records({
      remoteRecords: params.remoteRecords,
      localRecords: params.localRecords,
      confirmedCloudIds: new Set(params.confirmedCloudIds),
      deletedTombstoneIds: new Set(params.deletedTombstoneIds),
      canonicalWorkspaceId: params.canonicalWorkspaceId,
    });
    return {
      merged: out.merged,
      toUpsertToCloud: out.toUpsertToCloud,
      toDeleteFromCloud: out.toDeleteFromCloud,
      nextConfirmedCloudIds: Array.from(out.nextConfirmedCloudIds),
    };
  }
}

@Controller('/api/v2')
export class V2ApiController {
  constructor(
    private readonly diagnosticsService = new SystemDiagnosticsService(),
    private readonly reconciliationService = new LedgerReconciliationService()
  ) {}

  public getHealth() {
    return this.diagnosticsService.getSystemStatus();
  }

  public postReconcile(body: any) {
    return this.reconciliationService.reconcileDataset(body);
  }

  public postSummary(body: any) {
    return this.reconciliationService.computeSummary(body);
  }
}

@Module({
  controllers: [V2ApiController],
  providers: [SystemDiagnosticsService, LedgerReconciliationService],
})
export class RecordBookV2BackendModule {}

/**
 * Express.js-compatible Middleware / Route Dispatcher for /api/v2/*
 */
export function createExpressV2Dispatcher() {
  const controller = new V2ApiController();

  return async function handleExpressRequest(req: {
    method: string;
    path: string;
    body?: any;
  }): Promise<{ status: number; json: any }> {
    if (req.method === 'GET' && req.path === '/api/v2/health') {
      return { status: 200, json: controller.getHealth() };
    }
    if (req.method === 'POST' && req.path === '/api/v2/reconcile') {
      return { status: 200, json: controller.postReconcile(req.body) };
    }
    if (req.method === 'POST' && req.path === '/api/v2/summary') {
      return { status: 200, json: controller.postSummary(req.body) };
    }
    return { status: 404, json: { error: 'Endpoint not found' } };
  };
}
