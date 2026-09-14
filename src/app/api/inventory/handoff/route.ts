import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { objective_id, resource_id, shift_id, items } = body;

    if (!objective_id || !resource_id || !items) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Resolve tenant_id and operator_name
    let tenantId: string | null = null;
    let operatorName = 'Operador';

    try {
      const { data: resData } = await supabase
        .from('resources')
        .select('id, name, tenant_id')
        .or(`id.eq.${resource_id},assigned_to.eq.${resource_id}`)
        .limit(1)
        .maybeSingle();

      if (resData) {
        if (resData.tenant_id) tenantId = resData.tenant_id;
        if (resData.name) operatorName = resData.name;
      }
    } catch (e) {
      console.warn('[INVENTORY_HANDOFF] Tenant/Operator resolution notice:', e);
    }

    // 1. Save handoff record (best effort)
    try {
      await supabase
        .from('inventory_handoffs')
        .insert([{ 
          objective_id, 
          resource_id, 
          shift_id, 
          items,
          ...(tenantId ? { tenant_id: tenantId } : {}) 
        }]);
    } catch (e) {
      console.warn('[INVENTORY_HANDOFF] inventory_handoffs table notice:', e);
    }

    // 2. Update resource_inventory status and prepare guard book entries
    const updatePromises: Promise<any>[] = [];
    const entriesToInsert: any[] = [];

    for (const item of items) {
      if (item.condition) {
        const itemCond = String(item.condition).toLowerCase();
        updatePromises.push(
          supabase
            .from('resource_inventory')
            .update({ 
              status: itemCond, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', item.item_id)
        );

        if (itemCond === 'roto' || itemCond === 'dañado' || itemCond === 'faltante') {
          entriesToInsert.push({
            objective_id,
            operator_id: resource_id,
            operator_name: operatorName,
            entry_type: 'incidente',
            content: `📦 ALERTA INVENTARIO EN CIERRE DE TURNO: El elemento "${item.name || item.item_id}" fue reportado como ${itemCond.toUpperCase()} por ${operatorName}.`,
            urgency: 'alta',
            status: 'abierto',
            created_at: new Date().toISOString(),
            ...(tenantId ? { tenant_id: tenantId } : {})
          });

          // Also mirror incident to incidents table so manager map shows alert in real-time
          try {
            await supabase.from('incidents').insert({
              objective_id,
              operator_id: resource_id,
              operator_name: operatorName,
              entry_type: 'novedad',
              urgency: 'alta',
              content: `📦 NOVEDAD LOGÍSTICA: ${item.name || item.item_id} marcado como ${itemCond.toUpperCase()}`,
              status: 'abierto',
              created_at: new Date().toISOString(),
              ...(tenantId ? { tenant_id: tenantId } : {})
            });
          } catch (e) {}
        } else {
          entriesToInsert.push({
            objective_id,
            operator_id: resource_id,
            operator_name: operatorName,
            entry_type: 'fichaje',
            content: `📦 CONTROL DE INVENTARIO: El elemento "${item.name || item.item_id}" fue auditado como ${itemCond.toUpperCase()} por ${operatorName}.`,
            urgency: 'normal',
            status: 'cerrado',
            created_at: new Date().toISOString(),
            ...(tenantId ? { tenant_id: tenantId } : {})
          });
        }
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    if (entriesToInsert.length > 0) {
      try {
        await supabase.from('guard_book_entries').insert(entriesToInsert);
      } catch (err) {
        console.warn('[INVENTORY_HANDOFF] Guard book insert notice:', err);
      }
    }

    return NextResponse.json({ success: true, updated_count: items.length });
  } catch (error: any) {
    console.error('[INVENTORY_HANDOFF] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
