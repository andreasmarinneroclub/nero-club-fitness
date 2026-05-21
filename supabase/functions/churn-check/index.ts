/**
 * NERO CLUB FITNESS — Edge Function: Churn Check & Retention Emails
 *
 * Ejecutar como cron job diario desde Supabase → Database → Cron Jobs:
 *   select cron.schedule('churn-check', '0 9 * * *', $$ select net.http_post(...) $$);
 *
 * O desde Supabase Dashboard → Edge Functions → Schedule
 *
 * Lógica:
 *   - Membresía vencida hace 3 días  → email de renovación (retención)
 *   - Membresía vencida hace 15 días → email preguntando el motivo de abandono
 *
 * Setup:
 *   supabase secrets set RESEND_API_KEY=re_xxxx
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   supabase functions deploy churn-check
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL      = 'Nero Club Fitness <hola@neroclub.cl>'
const APP_URL         = 'https://nero-club-fitness.vercel.app'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Email templates ──────────────────────────────────────────────────────────

function retentionHtml(name: string, planName: string) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<style>
  body{margin:0;background:#0A0A0A;font-family:'Arial Narrow',Arial,sans-serif;color:#fff;}
  .wrap{max-width:600px;margin:0 auto;padding:40px 32px;}
  .logo{font-size:48px;font-weight:900;letter-spacing:8px;}
  .divider{border:none;border-top:1px solid rgba(255,255,255,0.08);margin:28px 0;}
  h1{font-size:26px;font-weight:700;letter-spacing:2px;margin:0 0 12px;}
  p{font-size:15px;line-height:1.7;color:rgba(255,255,255,0.7);margin:0 0 16px;}
  .plans{display:flex;gap:12px;margin:20px 0;}
  .plan{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
        border-radius:10px;padding:16px;text-align:center;}
  .plan.popular{border-color:#0066FF;background:rgba(0,102,255,0.08);}
  .plan-name{font-size:12px;letter-spacing:2px;color:rgba(255,255,255,0.5);margin-bottom:8px;}
  .plan-price{font-size:22px;font-weight:700;}
  .plan-price.blue{color:#0066FF;}
  .cta{display:inline-block;background:#0066FF;color:#fff;text-decoration:none;
       padding:14px 32px;border-radius:6px;font-size:14px;font-weight:700;
       letter-spacing:2px;text-transform:uppercase;margin:16px 0;}
  .footer{font-size:12px;color:rgba(255,255,255,0.25);text-align:center;margin-top:32px;}
</style>
</head><body>
<div class="wrap">
  <div class="logo">NERO</div>
  <div style="font-size:12px;letter-spacing:6px;color:rgba(255,255,255,0.4);">CLUB FITNESS</div>
  <hr class="divider">
  <h1>TU MEMBRESÍA HA VENCIDO, ${name.toUpperCase()}</h1>
  <p>Extrañamos verte entrenar. Tu plan <strong>${planName}</strong> ya no está activo,
     pero tienes cupo reservado si decides renovar hoy.</p>
  <p style="font-size:14px;color:#0066FF;font-weight:700;">🔥 OFERTA ESPECIAL DE RETORNO — 10% OFF si renuevas esta semana</p>
  <div class="plans">
    <div class="plan">
      <div class="plan-name">MENSUAL</div>
      <div class="plan-price">$29.900 CLP</div>
    </div>
    <div class="plan popular">
      <div class="plan-name">SEMESTRAL ⭐</div>
      <div class="plan-price blue">$134.910 CLP</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">-10% aplicado</div>
    </div>
    <div class="plan">
      <div class="plan-name">ANUAL</div>
      <div class="plan-price">$242.910 CLP</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">-10% aplicado</div>
    </div>
  </div>
  <a href="${APP_URL}/#planes" class="cta">RENOVAR AHORA →</a>
  <hr class="divider">
  <div class="footer">© 2025 Nero Club Fitness · Santiago, Chile</div>
</div></body></html>`
}

function churnSurveyHtml(name: string) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<style>
  body{margin:0;background:#0A0A0A;font-family:'Arial Narrow',Arial,sans-serif;color:#fff;}
  .wrap{max-width:600px;margin:0 auto;padding:40px 32px;}
  .logo{font-size:48px;font-weight:900;letter-spacing:8px;}
  .divider{border:none;border-top:1px solid rgba(255,255,255,0.08);margin:28px 0;}
  h1{font-size:26px;font-weight:700;letter-spacing:2px;margin:0 0 12px;}
  p{font-size:15px;line-height:1.7;color:rgba(255,255,255,0.7);margin:0 0 16px;}
  .option{display:block;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
          border-radius:8px;padding:14px 18px;margin:10px 0;color:#fff;text-decoration:none;
          font-size:14px;transition:border-color 0.2s;}
  .footer{font-size:12px;color:rgba(255,255,255,0.25);text-align:center;margin-top:32px;}
</style>
</head><body>
<div class="wrap">
  <div class="logo">NERO</div>
  <div style="font-size:12px;letter-spacing:6px;color:rgba(255,255,255,0.4);">CLUB FITNESS</div>
  <hr class="divider">
  <h1>¿QUÉ PASÓ, ${name.toUpperCase()}?</h1>
  <p>Han pasado 15 días desde que tu membresía venció y nos importa saber tu experiencia.
     Tu opinión nos ayuda a mejorar Nero Club para todos.</p>
  <p style="font-size:13px;color:rgba(255,255,255,0.5);">¿Cuál fue el principal motivo por el que no renovaste?</p>
  <a href="${APP_URL}/feedback?reason=precio&email={{EMAIL}}" class="option">💸 El precio fue un obstáculo</a>
  <a href="${APP_URL}/feedback?reason=horario&email={{EMAIL}}" class="option">⏰ Los horarios no me convenían</a>
  <a href="${APP_URL}/feedback?reason=distancia&email={{EMAIL}}" class="option">📍 La ubicación es muy lejos</a>
  <a href="${APP_URL}/feedback?reason=instalaciones&email={{EMAIL}}" class="option">🏋️ Las instalaciones no eran lo que esperaba</a>
  <a href="${APP_URL}/feedback?reason=otro&email={{EMAIL}}" class="option">💬 Otro motivo</a>
  <hr class="divider">
  <p style="font-size:13px;text-align:center;">
    ¿Cambiaste de opinión? <a href="${APP_URL}/#planes" style="color:#0066FF;">Vuelve a Nero Club →</a>
  </p>
  <div class="footer">© 2025 Nero Club Fitness · Santiago, Chile</div>
</div></body></html>`
}

// ── Send email helper ────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message)
  }
  return res.json()
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async () => {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  // Fecha vencida hace 3 días → email retención
  const date3  = new Date(today); date3.setDate(date3.getDate() - 3)
  // Fecha vencida hace 15 días → email churn survey
  const date15 = new Date(today); date15.setDate(date15.getDate() - 15)

  const results = { retention: 0, churn_survey: 0, errors: [] as string[] }

  // Clientes cuya membresía venció exactamente hace 3 días
  const { data: retentionClients } = await supabaseAdmin
    .from('clients_view')
    .select('name, email, plan_name')
    .eq('end_date', fmt(date3))

  for (const c of retentionClients ?? []) {
    try {
      await sendEmail(c.email, `Tu membresía Nero Club ha vencido — Renueva hoy con 10% OFF`, retentionHtml(c.name, c.plan_name))
      results.retention++
    } catch (e: any) { results.errors.push(`retention:${c.email}: ${e.message}`) }
  }

  // Clientes cuya membresía venció exactamente hace 15 días
  const { data: churnClients } = await supabaseAdmin
    .from('clients_view')
    .select('name, email')
    .eq('end_date', fmt(date15))

  for (const c of churnClients ?? []) {
    try {
      const html = churnSurveyHtml(c.name).replace(/{{EMAIL}}/g, encodeURIComponent(c.email))
      await sendEmail(c.email, `${c.name}, ¿qué pasó? Cuéntanos`, html)
      results.churn_survey++
    } catch (e: any) { results.errors.push(`churn:${c.email}: ${e.message}`) }
  }

  return new Response(JSON.stringify({ success: true, ...results, date: fmt(today) }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
