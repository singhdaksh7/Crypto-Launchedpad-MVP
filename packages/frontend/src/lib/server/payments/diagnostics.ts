import type { PrismaClient } from '@prisma/client';
import { getPrisma } from '../prisma';

export type DatabaseHostType = 'pooler' | 'direct-supabase' | 'other' | 'missing';
export type DiagnosticStatus = 'ok' | 'failed';
export type TableDiagnosticStatus = 'ok' | 'missing' | 'failed';
export type PaymentStorageDiagnosticCode =
  | 'PAYMENT_STORAGE_MISSING'
  | 'DATABASE_URL_MISSING'
  | 'DATABASE_URL_DIRECT_SUPABASE'
  | 'PRISMA_CLIENT_ERROR'
  | 'DB_UNREACHABLE'
  | 'PRISMA_TABLE_MISSING'
  | 'PRISMA_QUERY_ERROR';

export interface PaymentStorageDiagnostics {
  paymentStorage: string;
  hasDatabaseUrl: boolean;
  databaseHostType: DatabaseHostType;
  hasMockPaymentSecret: boolean;
  hasJwtSecret: boolean;
  prismaClientLoad: DiagnosticStatus;
  dbConnection: DiagnosticStatus;
  tables: {
    paymentOrder: TableDiagnosticStatus;
    walletAccess: TableDiagnosticStatus;
    consumedPayment: TableDiagnosticStatus;
  };
  safeError: string;
}

export function isPaymentStorageDebugEnabled(): boolean {
  return process.env.DEBUG_PAYMENT_STORAGE === 'true';
}

export function getPaymentStorageDiagnosticCode(error: unknown): PaymentStorageDiagnosticCode {
  const message = String((error as any)?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toUpperCase();

  if (/payment_storage=database is required|unsupported payment_storage|payment storage is not configured/.test(message)) {
    return 'PAYMENT_STORAGE_MISSING';
  }
  if (/database_url is required/.test(message)) {
    return 'DATABASE_URL_MISSING';
  }
  if (/pooler|supabase/.test(message) && /database_url/.test(message)) {
    return 'DATABASE_URL_DIRECT_SUPABASE';
  }
  if (code === 'P2021' || /table .* does not exist|relation .* does not exist/.test(message)) {
    return 'PRISMA_TABLE_MISSING';
  }
  if (code === 'P1000' || code === 'P1001' || code === 'P1002' || code === 'P1017') {
    return 'DB_UNREACHABLE';
  }
  if (
    /@prisma\/client did not initialize yet|prisma client|query engine|unable to require/.test(message)
  ) {
    return 'PRISMA_CLIENT_ERROR';
  }
  if (/prisma/.test(message)) {
    return 'PRISMA_QUERY_ERROR';
  }
  return 'PRISMA_QUERY_ERROR';
}

export function getPaymentStorageSafeError(code: PaymentStorageDiagnosticCode): string {
  switch (code) {
    case 'PAYMENT_STORAGE_MISSING':
      return 'Payment storage mode is not configured.';
    case 'DATABASE_URL_MISSING':
      return 'Database URL is missing.';
    case 'DATABASE_URL_DIRECT_SUPABASE':
      return 'Database URL appears to use a direct Supabase host.';
    case 'PRISMA_CLIENT_ERROR':
      return 'Prisma client failed to load.';
    case 'DB_UNREACHABLE':
      return 'Database connection failed.';
    case 'PRISMA_TABLE_MISSING':
      return 'Required payment tables are missing.';
    case 'PRISMA_QUERY_ERROR':
    default:
      return 'Payment storage query failed.';
  }
}

export function getDatabaseHostType(databaseUrl?: string): DatabaseHostType {
  if (!databaseUrl) return 'missing';
  try {
    const host = new URL(databaseUrl).hostname.toLowerCase();
    if (host.includes('pooler.supabase.com')) return 'pooler';
    if ((host.includes('supabase.co') || host.includes('supabase.net')) && !host.includes('pooler')) {
      return 'direct-supabase';
    }
    return 'other';
  } catch {
    return 'other';
  }
}

async function detectTable(
  prisma: PrismaClient,
  tableName: 'PaymentOrder' | 'WalletAccess' | 'ConsumedPayment',
): Promise<TableDiagnosticStatus> {
  try {
    const result = (await prisma.$queryRawUnsafe(
      `SELECT to_regclass('"public"."${tableName}"') IS NOT NULL AS "present"`,
    )) as Array<{ present: boolean }>;

    return result?.[0]?.present ? 'ok' : 'missing';
  } catch {
    return 'failed';
  }
}

export async function collectPaymentStorageDiagnostics(): Promise<PaymentStorageDiagnostics> {
  const paymentStorage = (process.env.PAYMENT_STORAGE || '').trim().toLowerCase() || 'missing';
  const databaseUrl = process.env.DATABASE_URL;
  const databaseHostType = getDatabaseHostType(databaseUrl);

  const diagnostics: PaymentStorageDiagnostics = {
    paymentStorage,
    hasDatabaseUrl: Boolean(databaseUrl),
    databaseHostType,
    hasMockPaymentSecret: Boolean(process.env.MOCK_PAYMENT_SECRET),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    prismaClientLoad: 'failed',
    dbConnection: 'failed',
    tables: {
      paymentOrder: 'failed',
      walletAccess: 'failed',
      consumedPayment: 'failed',
    },
    safeError: '',
  };

  if (paymentStorage !== 'database') {
    const code = getPaymentStorageDiagnosticCode(
      new Error('PAYMENT_STORAGE=database is required in production.'),
    );
    diagnostics.safeError = getPaymentStorageSafeError(code);
    return diagnostics;
  }

  if (!databaseUrl) {
    const code = getPaymentStorageDiagnosticCode(
      new Error('DATABASE_URL is required when PAYMENT_STORAGE=database.'),
    );
    diagnostics.safeError = getPaymentStorageSafeError(code);
    return diagnostics;
  }

  if (databaseHostType === 'direct-supabase') {
    diagnostics.safeError = getPaymentStorageSafeError('DATABASE_URL_DIRECT_SUPABASE');
  }

  let prisma: PrismaClient;
  try {
    prisma = getPrisma();
    diagnostics.prismaClientLoad = 'ok';
  } catch (error) {
    const code = getPaymentStorageDiagnosticCode(error);
    diagnostics.safeError = getPaymentStorageSafeError(code);
    return diagnostics;
  }

  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    diagnostics.dbConnection = 'ok';
  } catch (error) {
    const code = getPaymentStorageDiagnosticCode(error);
    diagnostics.safeError = getPaymentStorageSafeError(code);
    return diagnostics;
  }

  const [paymentOrder, walletAccess, consumedPayment] = await Promise.all([
    detectTable(prisma, 'PaymentOrder'),
    detectTable(prisma, 'WalletAccess'),
    detectTable(prisma, 'ConsumedPayment'),
  ]);

  diagnostics.tables = {
    paymentOrder,
    walletAccess,
    consumedPayment,
  };

  if (paymentOrder === 'ok' && walletAccess === 'ok' && consumedPayment === 'ok') {
    diagnostics.safeError = '';
    return diagnostics;
  }

  if ([paymentOrder, walletAccess, consumedPayment].includes('missing')) {
    diagnostics.safeError = getPaymentStorageSafeError('PRISMA_TABLE_MISSING');
    return diagnostics;
  }

  diagnostics.safeError = getPaymentStorageSafeError('PRISMA_QUERY_ERROR');
  return diagnostics;
}

