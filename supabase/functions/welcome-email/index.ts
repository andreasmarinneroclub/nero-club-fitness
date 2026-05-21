/**
 * NERO CLUB FITNESS — Edge Function: Welcome Email
 *
 * Trigger: llamar desde el frontend justo después de crear un cliente
 *   await supabase.functions.invoke('welcome-email', {
 *     body: { clientName: '...', clientEmail: '...', planName: '...', endDate: '...' }
 *   })
 *
 * Setup:
 *   supabase secrets set RESEND_API_KEY=re_xxxx
 *   supabase functions deploy welcome-email
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL    = 'Nero Club Fitness <hola@neroclub.cl>'

// Genera un ticket de regalo: 5 o 10 días al azar
function generateGiftTicket() {
  const days = Math.random() > 0.5 ? 10 : 5
  const code = 'NERO-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  return { days, code }
}

function welcomeHtml(name: string, plan: string, endDate: string, gift: { days: number; code: string }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin:0; background:#0A0A0A; font-family:'Arial Narrow',Arial,sans-serif; color:#fff; }
    .wrap { max-width:600px; margin:0 auto; padding:40px 32px; }
    .logo { font-size:48px; font-weight:900; letter-spacing:8px; color:#fff; }
    .logo span { color:#0066FF; }
    .sub { font-size:12px; letter-spacing:6px; color:rgba(255,255,255,0.4); margin-top:4px; }
    .divider { border:none; border-top:1px solid rgba(255,255,255,0.08); margin:28px 0; }
    h1 { font-size:28px; font-weight:700; letter-spacing:2px; margin:0 0 12px; }
    p { font-size:15px; line-height:1.7; color:rgba(255,255,255,0.7); margin:0 0 16px; }
    .plan-box { background:rgba(0,102,255,0.08); border:1px solid rgba(0,102,255,0.3);
                border-radius:10px; padding:20px 24px; margin:24px 0; }
    .plan-box .label { font-size:11px; letter-spacing:2px; color:#0066FF; text-transform:uppercase; margin-bottom:6px; }
    .plan-box .value { font-size:22px; font-weight:700; color:#fff; }
    .gift-box { background:linear-gradient(135deg,rgba(0,102,255,0.15),rgba(0,60,191,0.15));
                border:2px solid #0066FF; border-radius:12px; padding:24px; margin:24px 0; text-align:center; }
    .gift-title { font-size:18px; font-weight:700; color:#0066FF; letter-spacing:2px; margin-bottom:8px; }
    .gift-code { font-size:28px; font-weight:900; letter-spacing:6px; color:#fff;
                 background:rgba(0,0,0,0.4); border-radius:8px; padding:12px 24px;
                 display:inline-block; margin:12px 0; font-family:monospace; }
    .gift-note { font-size:13px; color:rgba(255,255,255,0.5); margin-top:8px; }
    .cta { display:inline-block; background:#0066FF; color:#fff; text-decoration:none;
           padding:14px 32px; border-radius:6px; font-size:14px; font-weight:700;
           letter-spacing:2px; text-transform:uppercase; margin:16px 0; }
    .footer { font-size:12px; color:rgba(255,255,255,0.25); text-align:center; margin-top:32px; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="logo">NERO<span style="display:block;width:3px;height:20px;background:#0066FF;margin:4px 0;"></span></div>
  <div class="sub">CLUB FITNESS · SANTIAGO</div>
  <hr class="divider">
  <h1>¡BIENVENIDO, ${name.toUpperCase()}!</h1>
  <p>Tu membresía está activa y te esperamos para que empieces a entrenar sin masificaciones, a tu tiempo.</p>
  <div class="plan-box">
    <div class="label">Tu plan activo</div>
    <div class="value">${plan}</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.4);margin-top:6px;">Válido hasta el ${endDate}</div>
  </div>
  <hr class="divider">
  <div class="gift-box">
    <div class="gift-title">🎁 TICKET DE REGALO PARA UN AMIGO</div>
    <p style="font-size:14px;color:rgba(255,255,255,0.7);margin:8px 0;">
      Te regalamos <strong style="color:#0066FF;">${gift.days} días gratis</strong> para que un amigo pruebe Nero Club.
      Comparte este código:
    </p>
    <div class="gift-code">${gift.code}</div>
    <div class="gift-note">Válido por 30 días · Una persona por código</div>
  </div>
  <a href="https://nero-club-fitness.vercel.app" class="cta">VER MI MEMBRESÍA →</a>
  <hr class="divider">
  <div class="footer">© 2025 Nero Club Fitness · Santiago, Chile<br>Entrena sin masificaciones. Entrena a tu tiempo.</div>
</div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { clientName, clientEmail, planName, endDate } = await req.json()

    if (!clientEmail || !clientName) {
      return new Response(JSON.stringify({ error: 'clientEmail y clientName son requeridos' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const gift = generateGiftTicket()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: `¡Bienvenido a Nero Club, ${clientName}! 🎁 Tu regalo está adentro`,
        html: welcomeHtml(clientName, planName, endDate, gift),
      }),
    })

    const data = await res.json()

    if (!res.ok) throw new Error(data.message || 'Error enviando email')

    // Guardar el gift ticket en Supabase para trazabilidad
    // En producción: await supabaseAdmin.from('gift_tickets').insert({ code: gift.code, days: gift.days, owner_email: clientEmail })

    return new Response(JSON.stringify({ success: true, giftCode: gift.code, giftDays: gift.days }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
