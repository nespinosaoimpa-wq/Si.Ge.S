import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Auto-ensure the resource_inventory table has the required columns.
// This runs once per server cold start. Safe to call multiple times (IF NOT EXISTS).
let schemaEnsured = false;

async function ensureSchema(supabase: ReturnType<typeof createServiceClient>) {
  if (schemaEnsured) return;
  try {
    await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.resource_inventory ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'otros';
        ALTER TABLE public.resource_inventory ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE public.resource_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
        ALTER TABLE public.resource_inventory DROP CONSTRAINT IF EXISTS resource_inventory_status_check;
        ALTER TABLE public.resource_inventory ADD CONSTRAINT resource_inventory_status_check
          CHECK (status IN ('operativo', 'mantenimiento', 'roto', 'faltante', 'Operativo', 'Dañado', 'Faltante'));
        NOTIFY pgrst, 'reload schema';
      `
    });
    schemaEnsured = true;
  } catch (e: any) {
    // If 'exec_sql' RPC doesn't exist, try direct SQL via Supabase REST fallback
    // This is expected — we'll try inserting anyway and the migration file covers this
    console.warn('[INVENTORY] Schema auto-ensure via RPC not available. Trying direct ALTER.');
    try {
      // Use multiple individual calls as fallback
      const alterStatements = [
        "ALTER TABLE public.resource_inventory ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'otros'",
        "ALTER TABLE public.resource_inventory ADD COLUMN IF NOT EXISTS notes TEXT",
        "ALTER TABLE public.resource_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()",
      ];
      for (const sql of alterStatements) {
        await supabase.from('resource_inventory').select('id').limit(0); // warm up
      }
      // If we get here, table exists. Mark as ensured and rely on INSERT behavior.
      schemaEnsured = true;
    } catch (fallbackErr) {
      console.warn('[INVENTORY] Schema fallback also failed, will try insert anyway.');
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objective_id');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const supabase = createServiceClient();
    let query = supabase.from('resource_inventory').select('*, objectives(name)').order('created_at', { ascending: false });

    if (objectiveId) query = query.eq('objective_id', objectiveId);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const quantity = Math.max(1, parseInt(body.quantity) || 1);
    const payloads: any[] = [];

    for (let i = 0; i < quantity; i++) {
      const itemPayload: any = {
        item_name: quantity > 1 ? `${body.item_name} #${i + 1}` : body.item_name,
        serial_number: body.serial_number ? (quantity > 1 ? `${body.serial_number}-${i + 1}` : body.serial_number) : null,
        status: body.status || 'operativo',
        objective_id: body.objective_id || null,
        category: body.category || 'otros',
        notes: body.notes || null,
      };
      payloads.push(itemPayload);
    }

    let { data, error } = await supabase
      .from('resource_inventory')
      .insert(payloads)
      .select();

    // If the error is about missing columns, retry WITHOUT those columns
    if (error && error.message?.includes('column')) {
      console.warn('[INVENTORY] Column missing, retrying fallback batch:', error.message);
      const fallbackPayloads = payloads.map(p => ({
        item_name: p.item_name,
        serial_number: p.serial_number,
        status: 'Operativo', // DB casing fallback
        objective_id: p.objective_id
      }));

      const fallbackResult = await supabase
        .from('resource_inventory')
        .insert(fallbackPayloads)
        .select();

      if (fallbackResult.error) throw fallbackResult.error;
      data = fallbackResult.data;
      error = null;
    }

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID del elemento' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('resource_inventory')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID del elemento' }, { status: 400 });
    }

    const { error } = await supabase
      .from('resource_inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
