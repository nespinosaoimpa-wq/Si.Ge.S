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

    // ALWAYS use Service Role to bypass RLS for profile linking and objective mapping
    const supabase = createServiceClient();

    let resource: any = null;
    let debug: any = { userId, email };

    // 🔗 PROACTIVE LINKING & SELF-HEALING: 
    if (userId && userId !== 'recurso_demo') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      
      // 1. Primary: Search by ID or Assigned_to (Include objectives join)
      let resourceQuery = supabase.from('resources').select('*, objectives!current_objective_id(*)');
      
      if (isUUID) {
        resourceQuery = resourceQuery.or(`id.eq.${userId},assigned_to.eq.${userId}`);
      } else {
        resourceQuery = resourceQuery.eq('id', userId);
      }

      const { data: primary } = await resourceQuery
        .order('status', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (primary && primary.status !== 'baja') {
        resource = primary;
        debug.foundBy = 'primary_id';
      }

      // 2. Secondary: Try by Email
      if (!resource && email) {
        const { data: resourcesByEmail } = await supabase
          .from('resources')
          .select('*, objectives!current_objective_id(*)')
          .ilike('email', email.toLowerCase().trim())
          .neq('status', 'baja')
          .limit(1);
        
        const byEmail = resourcesByEmail?.[0];
        
        if (byEmail) {
          debug.foundBy = 'email';
          if (!byEmail.assigned_to && userId) {
            const { data: updated } = await supabase
              .from('resources')
              .update({ assigned_to: userId })
              .eq('id', byEmail.id)
              .select('*, objectives!current_objective_id(*)').single();
            resource = updated;
            debug.action = 'linked_by_email_healing';
          } else {
            resource = byEmail;
          }
        }
      }

      // 3. Tertiary: Auto-provision resource legajo for logged-in operator if email exists
      if (!resource && email) {
        try {
          const rawName = email.split('@')[0];
          const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).replace(/[._-]/g, ' ');
          const nextId = `S-${Math.floor(1000 + Math.random() * 9000)}`;

          const { data: newRes } = await supabase
            .from('resources')
            .insert({
              id: nextId,
              name: formattedName,
              email: email.toLowerCase().trim(),
              assigned_to: userId && userId !== 'recurso_demo' ? userId : null,
              status: 'active',
              role: 'Guardia de Seguridad'
            })
            .select('*, objectives!current_objective_id(*)')
            .maybeSingle();

          if (newRes) {
            resource = newRes;
            debug.action = 'auto_provisioned_legajo';
          }
        } catch (e) {
          console.error('[PROFILE_API] Auto-provision error:', e);
        }
      }
    }

    if (!resource) {
      return NextResponse.json({ 
        error: 'Resource not found', 
        debug,
        name: email ? email.split('@')[0] : 'Operador (Enlazando...)',
        isRecovering: true 
      });
    }

    // 🎯 DISCOVERY 2.0: Ensure we have objective details
    let finalObjective = resource.objectives;

    if (!finalObjective) {
      // a. Check by current_objective_id if join failed or was null but ID exists
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

      // b. Search by current_operator_id in objectives table
      if (!finalObjective) {
        const { data: objByOp } = await supabase
          .from('objectives')
          .select('*')
          .eq('current_operator_id', resource.id)
          .maybeSingle();
        
        if (objByOp) {
          finalObjective = objByOp;
          debug.objectiveFoundBy = 'objectives_current_op';
        }
      }

      // c. Search in active shifts
      if (!finalObjective) {
        const { data: activeShift } = await supabase
          .from('guard_shifts')
          .select('objective_id, objectives(*)')
          .eq('operator_id', resource.id)
          .in('status', ['activo', 'active'])
          .order('checkin_time', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (activeShift?.objectives) {
          finalObjective = activeShift.objectives;
          debug.objectiveFoundBy = 'guard_shifts_active';
        }
      }
    }

    if (finalObjective) {
      resource.objectives = finalObjective;
    }

    return NextResponse.json({ ...resource, debug });
  } catch (error: any) {
    console.error('[PROFILE_API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
