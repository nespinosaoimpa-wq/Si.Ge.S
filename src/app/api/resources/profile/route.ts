import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json({ error: 'User ID or Email is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    let resource: any = null;
    let debug: any = { userId, email };

    // 🔒 STRICT SECURITY MATCH 1: Exact Email Match in legajos registered by Gerencia
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const { data: resourcesByEmail } = await supabase
        .from('resources')
        .select('*')
        .ilike('email', cleanEmail)
        .neq('status', 'baja')
        .limit(1);
      
      const byEmail = resourcesByEmail?.[0];
      if (byEmail) {
        resource = byEmail;
        debug.foundBy = 'strict_email_match';

        // Bind assigned_to UUID if not linked yet
        if (userId && userId !== 'recurso_demo' && !byEmail.assigned_to) {
          await supabase
            .from('resources')
            .update({ assigned_to: userId })
            .eq('id', byEmail.id);
          resource.assigned_to = userId;
          debug.action = 'linked_assigned_to_uuid';
        }
      }
    }

    // 🔒 STRICT SECURITY MATCH 2: Exact Auth UUID Match (Already authenticated & linked by Gerencia)
    if (!resource && userId && userId !== 'recurso_demo') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isUUID) {
        const { data: primaryList } = await supabase
          .from('resources')
          .select('*')
          .or(`id.eq.${userId},assigned_to.eq.${userId}`)
          .neq('status', 'baja')
          .limit(1);

        const primary = primaryList?.[0];
        if (primary) {
          resource = primary;
          debug.foundBy = 'strict_uuid_match';
        }
      }
    }

    // ⛔ IF NO STRICT MATCH FOUND: DENY ACCESS IMMEDIATELY
    if (!resource) {
      return NextResponse.json({ 
        error: 'Resource not found or unauthorized', 
        debug,
        name: email ? email.split('@')[0] : 'Operador No Vinculado',
        isRecovering: true,
        message: 'Tu correo de inicio de sesión no coincide con ningún legajo autorizado en Gerencia. Solicita a Gerencia que ingrese este correo exacto en tu legajo.'
      }, { status: 404 });
    }

    // ═══ SAFE & FAST OBJECTIVE RESOLUTION (MULTI-LAYER MATCHING) ═══
    let finalObjective: any = null;

    // 1. Direct current_objective_id from verified legajo
    if (resource.current_objective_id) {
      const { data: objective } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', resource.current_objective_id)
        .maybeSingle();
      
      if (objective) {
        finalObjective = objective;
        debug.objectiveFoundBy = 'resource_current_id';
      }
    }

    const resIds = [resource.id, resource.assigned_to, userId].filter(Boolean);

    // 2. Active or Programmed Shift in guard_shifts
    if (!finalObjective && resIds.length > 0) {
      const orCondition = resIds.map(id => `operator_id.eq.${id},resource_id.eq.${id}`).join(',');
      const { data: shiftRecords } = await supabase
        .from('guard_shifts')
        .select('objective_id, status, checkin_time, checkout_time')
        .or(orCondition)
        .in('status', ['activo', 'active', 'programado'])
        .order('checkin_time', { ascending: false })
        .limit(1);

      const shiftRecord = shiftRecords?.[0];
      if (shiftRecord?.objective_id) {
        const { data: shiftObj } = await supabase
          .from('objectives')
          .select('*')
          .eq('id', shiftRecord.objective_id)
          .maybeSingle();
        if (shiftObj) {
          finalObjective = shiftObj;
          debug.objectiveFoundBy = `guard_shifts_${shiftRecord.status}`;
        }
      }
    }

    // 3. Shift requirements assigned specifically to operator
    if (!finalObjective && resIds.length > 0) {
      const orReqCondition = resIds.map(id => `assigned_operator_id.eq.${id}`).join(',');
      const { data: reqRecords } = await supabase
        .from('shift_requirements')
        .select('objective_id, status')
        .or(orReqCondition)
        .limit(1);

      const reqRecord = reqRecords?.[0];
      if (reqRecord?.objective_id) {
        const { data: reqObj } = await supabase
          .from('objectives')
          .select('*')
          .eq('id', reqRecord.objective_id)
          .maybeSingle();
        if (reqObj) {
          finalObjective = reqObj;
          debug.objectiveFoundBy = 'shift_requirements';
        }
      }
    }

    // 4. Objective resources permanent linkage
    if (!finalObjective && resIds.length > 0) {
      const orObjResCondition = resIds.map(id => `resource_id.eq.${id}`).join(',');
      const { data: objResRecords } = await supabase
        .from('objective_resources')
        .select('objective_id')
        .or(orObjResCondition)
        .limit(1);

      const objResRecord = objResRecords?.[0];
      if (objResRecord?.objective_id) {
        const { data: objResObj } = await supabase
          .from('objectives')
          .select('*')
          .eq('id', objResRecord.objective_id)
          .maybeSingle();
        if (objResObj) {
          finalObjective = objResObj;
          debug.objectiveFoundBy = 'objective_resources';
        }
      }
    }

    // Self-heal current_objective_id ONLY if objective was found for this VERIFIED resource
    if (finalObjective && finalObjective.id && resource.current_objective_id !== finalObjective.id) {
      await supabase
        .from('resources')
        .update({ current_objective_id: finalObjective.id })
        .eq('id', resource.id);
      resource.current_objective_id = finalObjective.id;
    }

    resource.objectives = finalObjective || null;

    return NextResponse.json({ ...resource, debug });
  } catch (error: any) {
    console.error('[PROFILE_API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
