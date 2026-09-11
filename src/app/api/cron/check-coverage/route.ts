import { createServiceClient } from '@/lib/supabase-server';
import { auditStaleOperatorCoverage } from '@/lib/coverage-worker';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    const staleOperators = await auditStaleOperatorCoverage(supabase);

    return NextResponse.json({
      status: 'ok',
      checked_at: new Date().toISOString(),
      stale_count: staleOperators.length,
      stale_operators: staleOperators.map((o: any) => ({ id: o.id, name: o.name }))
    });
  } catch (err: any) {
    console.error('[CRON_CHECK_COVERAGE_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
