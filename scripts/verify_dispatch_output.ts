import { createServiceClient } from '../src/lib/supabase-server';

async function verify() {
  const sb = createServiceClient();
  const { data: checks } = await sb
    .from('guard_book_entries')
    .select('id, entry_type, content, resolved_at, created_at')
    .or('entry_type.eq.hombre_vivo,entry_type.eq.hombre_vivo_sin_respuesta,content.ilike.%hombre vivo%')
    .order('created_at', { ascending: false })
    .limit(6);

  console.log('Últimas 6 entradas en guard_book_entries:');
  console.table(checks);

  const { data: alarms } = await sb
    .from('alarms')
    .select('id, alarm_type, status, acknowledged_at, resolved_at, created_at')
    .in('alarm_type', ['hombre_vivo_solicitud', 'hombre_vivo'])
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('Últimas 3 alarmas de hombre vivo:');
  console.table(alarms);
  process.exit(0);
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
