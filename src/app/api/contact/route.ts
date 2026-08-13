import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contact
 * Endpoint público para procesar solicitudes de Demo y Consultas desde sigpad.com.ar
 * 1. Guarda la consulta en la base de datos Supabase (tabla tickets)
 * 2. Intenta enviar la notificación por correo electrónico a sigpad.info@gmail.com y nespinosa.oimpa@gmail.com
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, email, telefono, mensaje, tipo } = body;

    if (!nombre || !email) {
      return NextResponse.json(
        { error: 'Nombre y correo electrónico son requeridos' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanNombre = nombre.trim();
    const category = (tipo || 'demo').toUpperCase();
    const messageText = mensaje?.trim() || 'Solicitud de demostración y asesoramiento enviada desde sigpad.com.ar';

    const supabase = createServiceClient();

    // 1. Guardar consulta/lead en la base de datos Supabase (Tabla tickets)
    let ticketRecord: any = null;
    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: `[${category}] ${cleanNombre}`,
          description: `Solicitante: ${cleanNombre}\nEmail: ${cleanEmail}\nTeléfono: ${telefono || 'No especificado'}\nTipo: ${category}\n\nMensaje:\n${messageText}`,
          status: 'abierto',
          created_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      if (!error) {
        ticketRecord = data;
      } else {
        console.warn('[CONTACT_API] Aviso en inserción de ticket:', error.message);
      }
    } catch (dbErr: any) {
      console.warn('[CONTACT_API] Error guardando ticket en DB:', dbErr?.message);
    }

    // 2. Intentar envío de correo electrónico vía Resend (si existe API key o servicio de correo)
    const targetEmails = ['sigpad.info@gmail.com', 'nespinosa.oimpa@gmail.com'];
    let emailSent = false;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'SIGPAD Web <notificaciones@sigpad.com.ar>',
            to: targetEmails,
            subject: `🚨 [SIGPAD Web] Nueva Solicitud de ${category}: ${cleanNombre}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #09090b; color: #ffffff; border-radius: 10px;">
                <h2 style="color: #0F4C5C; margin-bottom: 20px;">Nueva Solicitud recibida desde sigpad.com.ar</h2>
                <hr style="border-color: #27272a; margin-bottom: 20px;" />
                <p><strong>Tipo:</strong> ${category}</p>
                <p><strong>Nombre:</strong> ${cleanNombre}</p>
                <p><strong>Email:</strong> <a href="mailto:${cleanEmail}" style="color: #38bdf8;">${cleanEmail}</a></p>
                <p><strong>Teléfono:</strong> ${telefono || 'No indicado'}</p>
                <p><strong>Mensaje:</strong></p>
                <blockquote style="background: #18181b; padding: 15px; border-left: 4px solid #0F4C5C; border-radius: 5px;">
                  ${messageText}
                </blockquote>
                <hr style="border-color: #27272a; margin-top: 20px;" />
                <p style="font-size: 12px; color: #a1a1aa;">Mensaje generado automáticamente por la Plataforma SIGPAD.</p>
              </div>
            `
          })
        });

        if (emailRes.ok) {
          emailSent = true;
        } else {
          const errText = await emailRes.text();
          console.warn('[CONTACT_API] Resend response notice:', errText);
        }
      } catch (emailErr) {
        console.error('[CONTACT_API] Error enviando mail por Resend:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Consulta registrada correctamente',
      databaseSaved: !!ticketRecord,
      emailSent,
      ticketId: ticketRecord?.id || null
    });
  } catch (err: any) {
    console.error('[CONTACT_API] Error general:', err);
    return NextResponse.json(
      { error: err.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
