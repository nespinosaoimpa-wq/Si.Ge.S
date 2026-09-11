import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: NextRequest) {
  const ctx = await resolveTenantFromRequest(req);
  if (!ctx || (!ctx.isSuper && ctx.userEmail !== 'sigpad.info@gmail.com' && ctx.userRole !== 'superadmin')) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ records: [] });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('saas_financial_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[FINANCE_GET] Warning querying saas_financial_records:', error.message);
      return NextResponse.json({ records: [] });
    }

    return NextResponse.json({ records: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al consultar finanzas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ctx = await resolveTenantFromRequest(req);
  if (!ctx || (!ctx.isSuper && ctx.userEmail !== 'sigpad.info@gmail.com' && ctx.userRole !== 'superadmin')) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { type, category, description, amount, currency = 'ARS', status = 'pagado', tenant_id } = body;

    if (!type || !category || !description || amount === undefined) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('saas_financial_records')
      .insert({
        type,
        category,
        description,
        amount: parseFloat(amount),
        currency,
        status,
        tenant_id: tenant_id || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, record: data });
  } catch (err: any) {
    console.error('[FINANCE_POST_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Error al guardar movimiento financiero' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await resolveTenantFromRequest(req);
  if (!ctx || (!ctx.isSuper && ctx.userEmail !== 'sigpad.info@gmail.com' && ctx.userRole !== 'superadmin')) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const recordId = searchParams.get('id');
  if (!recordId) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('saas_financial_records')
      .delete()
      .eq('id', recordId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al eliminar movimiento' }, { status: 500 });
  }
}
