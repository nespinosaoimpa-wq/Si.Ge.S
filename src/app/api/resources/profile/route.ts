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

    // 1. Search by Email (Primary match for logged in users)
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
        debug.foundBy = 'email';

        // Self-heal assigned_to if we have a valid auth userId
        if (userId && userId !== 'recurso_demo' && !byEmail.assigned_to) {
          await supabase
            .from('resources')
            .update({ assigned_to: userId })
            .eq('id', byEmail.id);
          resource.assigned_to = userId;
          debug.action = 'linked_by_email_healing';
        }
      }
    }

    // 2. Search by User ID or assigned_to (Secondary match)
    if (!resource && userId && userId !== 'recurso_demo') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      let resourceQuery = supabase.from('resources').select('*');
      
      if (isUUID) {
        resourceQuery = resourceQuery.or(`id.eq.${userId},assigned_to.eq.${userId}`);
      } else {
        resourceQuery = resourceQuery.eq('id', userId);
      }

      const { data: primaryList } = await resourceQuery.order('status', { ascending: true }).limit(5);
      const primary = primaryList?.find((r: any) => r.status !== 'baja') || primaryList?.[0];

      if (primary) {
        resource = primary;
        debug.foundBy = 'primary_id';
        if (email && (!primary.email || primary.email.toLowerCase().trim() !== email.toLowerCase().trim())) {
          await supabase.from('resources').update({ email: email.toLowerCase().trim() }).eq('id', primary.id);
          resource.email = email;
        }
      }
    }

    // 3. Search by Name / Email prefix match (Fuzzy fail-safe match)
    if (!resource && (email || userId)) {
      const searchTerm = email ? email.split('@')[0].toLowerCase() : '';
      const { data: allRes } = await supabase.from('resources').select('*').neq('status', 'baja');
      
      if (allRes && allRes.length > 0) {
        const matched = allRes.find((r: any) => {
          if (!r.name) return false;
          const rName = r.name.toLowerCase();
          if (searchTerm && (rName.includes(searchTerm) || searchTerm.includes(rName.split(' ')[0]))) return true;
          return false;
        });

        if (matched) {
          resource = matched;
          debug.foundBy = 'fuzzy_name_match';
          if (email && !matched.email) {
            await supabase.from('resources').update({ email: email.toLowerCase().trim(), assigned_to: userId || matched.assigned_to }).eq('id', matched.id);
            resource.email = email;
          }
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

    // ═══ MULTI-STRATEGY OBJECTIVE RESOLUTION (WITH SELF-HEALING) ═══
    let finalObjective: any = null;

    // Strategy 1: Direct link in resources.current_objective_id
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

    // Strategy 2: Active or Programmed shifts in guard_shifts
    if (!finalObjective && resource.id) {
      const { data: shiftRecord } = await supabase
        .from('guard_shifts')
        .select('objective_id, status')
        .or(`operator_id.eq.${resource.id}${userId ? `,operator_id.eq.${userId}` : ''}`)
        .in('status', ['activo', 'active', 'programado'])
        .order('checkin_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
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

    // Strategy 3: Search objectives table by assigned_personnel or name match
    if (!finalObjective) {
      const { data: allObjs } = await supabase.from('objectives').select('*');
      if (allObjs && allObjs.length > 0) {
        const matchedObj = allObjs.find((o: any) => {
          if (o.resource_id === resource.id || o.operator_id === resource.id) return true;
          if (Array.isArray(o.assigned_personnel)) {
            return o.assigned_personnel.some((p: any) => 
              p.id === resource.id || p.id === userId || 
              (typeof p === 'string' && (p === resource.id || p === userId)) ||
              (p.name && resource.name && p.name.toLowerCase().includes(resource.name.toLowerCase()))
            );
          }
          return false;
        });

        if (matchedObj) {
          finalObjective = matchedObj;
          debug.objectiveFoundBy = 'objectives_assigned_personnel';
        }
      }
    }

    // ═══ SELF-HEAL RESOURCE RECORD IF OBJECTIVE WAS RESOLVED VIA FALLBACK ═══
    if (finalObjective && finalObjective.id && resource.current_objective_id !== finalObjective.id) {
      await supabase
        .from('resources')
        .update({ current_objective_id: finalObjective.id })
        .eq('id', resource.id);
      resource.current_objective_id = finalObjective.id;
      debug.action_objective_healed = true;
    }

    resource.objectives = finalObjective || null;

    return NextResponse.json({ ...resource, debug });
  } catch (error: any) {
    console.error('[PROFILE_API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
