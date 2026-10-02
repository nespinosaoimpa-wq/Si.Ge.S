import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contact
 * Endpoint público para procesar solicitudes de Demo y Consultas desde sigpad.com.ar
 * 1. Guarda la consulta de forma garantizada en la base de datos Supabase (tabla incidents con entry_type: 'lead_web')
 * 2. Envía notificación inmediata por email vía Gmail SMTP (Nodemailer) o Resend según configuración
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
    const cleanTelefono = (telefono || '').trim() || 'No especificado';
    const category = (tipo || 'demo').toUpperCase();
    const messageText = mensaje?.trim() || 'Solicitud de demostración y asesoramiento enviada desde sigpad.com.ar';

    const supabase = createServiceClient();

    // 1. Guardar SIEMPRE en la base de datos Supabase para que ningún lead se pierda jamás
    let leadRecord: any = null;
    try {
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          entry_type: 'lead_web',
          operator_name: cleanNombre,
          content: `📋 [SOLICITUD WEB - ${category}]\n` +
                   `Nombre: ${cleanNombre}\n` +
                   `Email: ${cleanEmail}\n` +
                   `Teléfono: ${cleanTelefono}\n` +
                   `Tipo: ${category}\n\n` +
                   `Mensaje:\n${messageText}`,
          status: 'open',
          urgency: 'baja'
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        leadRecord = data;
        console.log('[CONTACT_API] Lead guardado con éxito en Supabase. ID:', data.id);
      } else {
        console.warn('[CONTACT_API] Aviso guardando lead en incidents:', error?.message);
      }
    } catch (dbErr: any) {
      console.error('[CONTACT_API] Error guardando en DB:', dbErr?.message);
    }

    // 2. Notificación por Correo Electrónico
    const targetEmails = ['sigpad.info@gmail.com', 'nespinosa.oimpa@gmail.com'];
    let emailSent = false;
    let emailError: string | null = null;

    const emailSubject = `🚨 [SIGPAD Web] Nueva Solicitud de ${category}: ${cleanNombre}`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; background-color: #0A0F1D; color: #FFFFFF; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #223354;">
        <div style="border-bottom: 2px solid #00E5FF; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #00E5FF; margin: 0 0 6px 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
            Nueva Solicitud en SIGPAD.COM.AR
          </h2>
          <span style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px;">Notificación Automática de Lead</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #94A3B8; width: 120px; font-size: 13px;"><strong>Tipo:</strong></td>
            <td style="padding: 8px 0; color: #00E5FF; font-weight: 700; font-size: 14px;">${category === 'DEMO' ? 'SOLICITUD DE DEMO' : 'CONSULTA GENERAL'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94A3B8; font-size: 13px;"><strong>Nombre:</strong></td>
            <td style="padding: 8px 0; color: #FFFFFF; font-weight: 600; font-size: 14px;">${cleanNombre}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94A3B8; font-size: 13px;"><strong>Email:</strong></td>
            <td style="padding: 8px 0; font-size: 14px;">
              <a href="mailto:${cleanEmail}" style="color: #38BDF8; text-decoration: none; font-weight: 600;">${cleanEmail}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94A3B8; font-size: 13px;"><strong>Teléfono:</strong></td>
            <td style="padding: 8px 0; font-size: 14px;">
              <a href="https://wa.me/${cleanTelefono.replace(/[^0-9]/g, '')}" style="color: #10B981; text-decoration: none; font-weight: 600;">${cleanTelefono}</a>
            </td>
          </tr>
        </table>

        <div style="background-color: #131E36; border: 1px solid #223354; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <strong style="color: #CBD5E1; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Mensaje del Cliente:</strong>
          <p style="color: #FFFFFF; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${messageText}</p>
        </div>

        <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #223354;">
          <a href="https://wa.me/${cleanTelefono.replace(/[^0-9]/g, '')}" style="display: inline-block; background-color: #10B981; color: #FFFFFF; font-weight: 700; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; text-transform: uppercase;">
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    `;

    // A. Método 1: Gmail SMTP / Nodemailer (si existe contraseña SMTP configurada)
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD;
    const smtpUser = process.env.SMTP_USER || 'sigpad.info@gmail.com';

    if (smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        await transporter.sendMail({
          from: `"SIGPAD Plataforma" <${smtpUser}>`,
          to: targetEmails.join(','),
          subject: emailSubject,
          html: emailHtml
        });

        emailSent = true;
        console.log('[CONTACT_API] Correo enviado exitosamente vía Gmail SMTP a:', targetEmails);
      } catch (smtpErr: any) {
        console.error('[CONTACT_API] Error con Gmail SMTP:', smtpErr?.message);
        emailError = smtpErr?.message;
      }
    }

    // B. Método 2: Resend (si existe RESEND_API_KEY y no se envió por SMTP)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!emailSent && resendApiKey) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'SIGPAD Web <onboarding@resend.dev>',
            to: targetEmails,
            subject: emailSubject,
            html: emailHtml
          })
        });

        if (emailRes.ok) {
          emailSent = true;
          console.log('[CONTACT_API] Correo enviado exitosamente vía Resend a:', targetEmails);
        } else {
          const errText = await emailRes.text();
          console.warn('[CONTACT_API] Error respuesta Resend:', errText);
          emailError = errText;
        }
      } catch (resendErr: any) {
        console.error('[CONTACT_API] Error enviando por Resend:', resendErr?.message);
        emailError = resendErr?.message;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Consulta procesada correctamente',
      databaseSaved: !!leadRecord,
      emailSent,
      leadId: leadRecord?.id || null,
      warning: !emailSent ? 'Correo no despachado por falta de credenciales de envío' : null
    });
  } catch (err: any) {
    console.error('[CONTACT_API] Error general:', err);
    return NextResponse.json(
      { error: err.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
