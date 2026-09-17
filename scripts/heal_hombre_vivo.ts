import { createServiceClient } from '../src/lib/supabase-server';

async function main() {
  const sb = createServiceClient();
  const now = new Date().toISOString();

  // 1. Resolve old pending requests that are older than 1 hour
  const { data, error } = await sb
    .from('guard_book_entries')
    .update({ resolved_at: now })
    .ilike('content', '%HOMBRE VIVO ENVIADO DESDE GERENCIA%')
    .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .is('resolved_at', null)
    .select('id, content');

  console.log('Healed old requests count:', data?.length || 0, error || '');

  // 2. Resolve any legacy alarms with status active older than 1 hour
  const { data: alarmData, error: alarmError } = await sb
    .from('alarms')
    .update({ status: 'resolved', resolved_at: now })
    .in('alarm_type', ['hombre_vivo_solicitud', 'hombre_vivo'])
    .eq('status', 'active')
    .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .select('id');

  console.log('Healed old alarms count:', alarmData?.length || 0, alarmError || '');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
