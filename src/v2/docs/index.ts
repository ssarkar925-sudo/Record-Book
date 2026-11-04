import {
  PRD_DOC,
  DESIGN_DOC,
  ARCHITECTURE_DOC,
  DB_SCHEMA_DOC,
  SQL_SCHEMA_V2,
} from './docsContent';

export interface V2DocItem {
  id: string;
  title: string;
  fileName: string;
  content: string;
}

export const V2_DOCS_COLLECTION: V2DocItem[] = [
  {
    id: 'prd',
    title: 'Product Requirements Document (PRD)',
    fileName: '/docs/PRD.md',
    content: PRD_DOC,
  },
  {
    id: 'design',
    title: 'Daylight-Only UI/UX Design System',
    fileName: '/docs/DESIGN_SYSTEM.md',
    content: DESIGN_DOC,
  },
  {
    id: 'architecture',
    title: 'Full-Stack System Architecture (Vite + Express/NestJS + Supabase)',
    fileName: '/docs/ARCHITECTURE.md',
    content: ARCHITECTURE_DOC,
  },
  {
    id: 'db_schema',
    title: 'Relational Database Dictionary & Sync Invariants',
    fileName: '/docs/DATABASE_SCHEMA_V2.md',
    content: DB_SCHEMA_DOC,
  },
];

export const V2_SQL_SCHEMA_CONTENT = SQL_SCHEMA_V2;

export { PRD_DOC, DESIGN_DOC, ARCHITECTURE_DOC, DB_SCHEMA_DOC, SQL_SCHEMA_V2 };
