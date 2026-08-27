import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

/**
 * POST /api/tenants/seed
 * Carga una plantilla inicial de operaciones (1 Objetivo + 2 Vigiladores + 1 Turno)
 * para que una empresa recién creada esté 100% lista para operar e interactuar al instante.
 */

export async function POST(req: NextRequest) {
  try {
    const userCookie = req.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    let user: any = null;
    try {
      user = JSON.parse(decodeURIComponent(userCookie.value));
    } catch {
      return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
    }

    const { tenantId } = await req.json();
    const targetTenantId = tenantId || user?.tenant_id;

    if (!targetTenantId) {
      return NextResponse.json({ error: 'tenantId no identificado.' }, { status: 400 });
    }

    const supabaseAdmin = createServiceClient();

    // 1. Crear Puesto de Guardia / Objetivo de muestra
    const { data: objective, error: objErr } = await supabaseAdmin
      .from('objectives')
      .insert([
        {
          name: 'Puesto Central - Objetivo Modelo',
          address: 'Av. Pellegrini 1500, Rosario, Santa Fe',
          latitude: -32.9550,
          longitude: -60.6500,
          geofence_radius_meters: 100,
          tenant_id: targetTenantId,
          is_active: true
        }
      ])
      .select()
      .single();

    if (objErr) {
      console.warn('[SEED] Error insertando objetivo:', objErr.message);
    }

    const objectiveId = objective?.id || null;

    // 2. Crear 2 Vigiladores / Recursos de muestra
    const { data: resources, error: resErr } = await supabaseAdmin
      .from('resources')
      .insert([
        {
          name: 'Carlos Giménez (Vigilador)',
          role: 'Vigilador Senior',
          type: 'otro',
          status: 'active',
          tenant_id: targetTenantId,
          assigned_objective_id: objectiveId
        },
        {
          name: 'Ana Martínez (Supervisora)',
          role: 'Supervisor Operativo',
          type: 'otro',
          status: 'active',
          tenant_id: targetTenantId,
          assigned_objective_id: objectiveId
        }
      ])
      .select();

    if (resErr) {
      console.warn('[SEED] Error insertando recursos:', resErr.message);
    }

    // 3. Crear 1 Turno / Fichaje de muestra si se crearon el objetivo y recurso
    if (objectiveId && resources && resources.length > 0) {
      const firstOperatorId = resources[0].id;
      try {
        await supabaseAdmin
          .from('guard_shifts')
          .insert([
            {
              operator_id: firstOperatorId,
              objective_id: objectiveId,
              checkin_time: new Date().toISOString(),
              status: 'activo',
              checkin_within_geofence: true,
              tenant_id: targetTenantId,
              notes: 'Turno inicial de apertura del puesto'
            }
          ]);
      } catch (e) {}
    }

    // 4. Registrar Novedad Inicial en el Libro de Novedades
    try {
      await supabaseAdmin
        .from('guard_book_entries')
        .insert([
          {
            entry_type: 'novedad_general',
            description: 'Inicio de operaciones en Puesto Central. Plataforma táctica SIGPAD sincronizada.',
            objective_id: objectiveId,
            tenant_id: targetTenantId,
            timestamp: new Date().toISOString()
          }
        ]);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Datos de prueba cargados correctamente.',
      objectiveCreated: !!objective,
      resourcesCreated: resources ? resources.length : 0
    });
  } catch (err: any) {
    console.error('[TENANT_SEED_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Error al cargar plantilla de operaciones' }, { status: 500 });
  }
}
