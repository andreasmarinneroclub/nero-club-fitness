/**
 * NERO CLUB FITNESS — Aplicación Web Completa
 * Stack: React 18 + Tailwind CSS
 *
 * INTEGRACIÓN SUPABASE:
 * 1. npm install @supabase/supabase-js
 * 2. Crea lib/supabase.js con tu URL y anon key
 * 3. Reemplaza los bloques marcados con "// 🔌 SUPABASE:" con llamadas reales
 *
 * SETUP:
 * - Instala las fuentes en tu index.html:
 *   <link href="https://cdn.jsdelivr.net/npm/@fontsource/bebas-neue@5.0.18/index.css" rel="stylesheet">
 *   <link href="https://cdn.jsdelivr.net/npm/@fontsource/barlow-condensed@5.0.8/index.css" rel="stylesheet">
 * - Tailwind CSS configurado en tu proyecto
 */

import { useState, useEffect, useCallback } from 'react';
// import { supabase } from './lib/supabase' // Descomenta cuando configures Supabase

// ══════════════════════════════════════════════════════════════════════════════
// BRAND & CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const B = {
  black:   '#0A0A0A',
  blue:    '#0066FF',
  blueDk:  '#003CBF',
  blue10:  'rgba(0,102,255,0.08)',
  white:   '#FFFFFF',
  gray50:  '#F7F7F7',
  gray100: '#F0F0F0',
  gray200: '#E0E0E0',
  gray400: '#AAAAAA',
  gray600: '#666666',
};

const PLANS = [
  { id: 1, name: 'Mensual',    price: 29900,  duration: 1,  popular: false,
    badge: null,          features: ['Acceso ilimitado','Sin permanencia','App Nero Club'] },
  { id: 2, name: 'Trimestral', price: 79900,  duration: 3,  popular: false,
    badge: 'Ahorra $9.800',   features: ['Acceso ilimitado','Sin permanencia','App Nero Club','Toalla incluida'] },
  { id: 3, name: 'Semestral',  price: 149900, duration: 6,  popular: true,
    badge: 'Más popular',     features: ['Acceso ilimitado','Sin permanencia','App + Toalla','Camiseta Nero'] },
  { id: 4, name: 'Anual',      price: 269900, duration: 12, popular: false,
    badge: 'Mayor ahorro',    features: ['Acceso ilimitado','Matrícula gratis','Pack completo Nero','Máximo ahorro'] },
];

const GOALS = [
  'Ganar masa muscular','Bajar de peso','Mejorar condición física',
  'Tonificar cuerpo','Fitness general','Preparación deportiva',
];

const ADMIN_CREDS = { email: 'admin@neroclub.cl', password: 'admin123' };

const MOCK_VENDORS = [
  { id: 'v1', name: 'Diego Morales',  email: 'diego@neroclub.cl', password: 'vendor123' },
  { id: 'v2', name: 'Valentina Cruz', email: 'vale@neroclub.cl',  password: 'vendor456' },
];

const TODAY = new Date().toISOString().split('T')[0];

const MOCK_CLIENTS = [
  { id:'c1', name:'Matías Rodríguez', email:'matias@gmail.com', age:28, height:178, weight:80,
    goal:'Ganar masa muscular',   planId:3, startDate:'2025-03-01', vendorId:'v1' },
  { id:'c2', name:'Sofía Herrera',    email:'sofia@gmail.com',  age:24, height:162, weight:58,
    goal:'Bajar de peso',         planId:1, startDate:'2025-04-15', vendorId:'v2' },
  { id:'c3', name:'Tomás Fernández',  email:'tomas@gmail.com',  age:32, height:182, weight:90,
    goal:'Mejorar condición física', planId:4, startDate:'2025-01-10', vendorId:'v1' },
  { id:'c4', name:'Camila Muñoz',     email:'camila@gmail.com', age:26, height:165, weight:62,
    goal:'Tonificar cuerpo',      planId:2, startDate:'2025-05-01', vendorId:'v2' },
  { id:'c5', name:'Benjamín Torres',  email:'ben@gmail.com',    age:30, height:175, weight:75,
    goal:'Fitness general',       planId:3, startDate:'2025-04-20', vendorId:'v1' },
];

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const clp  = (n) => `$${Math.round(n).toLocaleString('es-CL')} CLP`;
const uid  = ()  => Math.random().toString(36).slice(2, 9);
const plan = (id) => PLANS.find(p => p.id === id);

const endDate = (startDate, months) => {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + months);
  return d;
};

const isActive = (c) => {
  const p = plan(c.planId);
  return p ? endDate(c.startDate, p.duration) >= new Date() : false;
};

const fmtDate = (d) => new Date(d).toLocaleDateString('es-CL');

// ══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

/** Símbolo N de NERO CLUB */
const NeroMark = ({ size = 28, c1 = '#FFFFFF', c2 = '#0066FF' }) => (
  <svg width={Math.round(size * 0.7)} height={size} viewBox="0 0 28 40" style={{ flexShrink: 0 }}>
    <polygon points="0,0 8,0 8,40 0,40"   fill={c1} />
    <polygon points="8,0 16,0 20,40 12,40" fill={c2} />
    <polygon points="20,0 28,0 28,40 20,40" fill={c1} />
  </svg>
);

/** Logotipo completo */
const Logo = ({ dark = false, size = 'md' }) => {
  const [mark, fs] = { sm:[16,28], md:[22,40], lg:[36,60] }[size] ?? [22, 40];
  const fg = dark ? B.black : B.white;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <NeroMark size={mark} c1={fg} c2={B.blue} />
      <div>
        <div style={{ fontFamily:"'Bebas Neue',Impact,sans-serif", fontSize:fs, color:fg, letterSpacing:4, lineHeight:0.9 }}>NERO</div>
        <div style={{ fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif", fontSize:fs*0.22, color:dark?'rgba(0,0,0,0.4)':'rgba(255,255,255,0.45)', letterSpacing:5, textTransform:'uppercase', fontWeight:300, marginTop:2 }}>CLUB FITNESS</div>
      </div>
    </div>
  );
};

/** Botón */
const Btn = ({ children, onClick, variant='primary', small=false, disabled=false, style:s={}, type='button' }) => {
  const vars = {
    primary: { background:B.blue,    color:B.white,  border:'none' },
    outline: { background:'transparent', color:B.blue,  border:`1px solid ${B.blue}` },
    dark:    { background:B.black,   color:B.white,  border:'none' },
    danger:  { background:'#dc2626', color:B.white,  border:'none' },
    ghost:   { background:'transparent', color:B.gray600, border:`1px solid ${B.gray200}` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...vars[variant],
      padding: small ? '6px 14px' : '11px 24px',
      borderRadius:6,
      fontFamily:"'Barlow Condensed',sans-serif",
      fontSize: small ? 13 : 15,
      fontWeight:600, letterSpacing:1, textTransform:'uppercase',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition:'opacity 0.15s',
      ...s,
    }}
      onMouseOver={e => { if(!disabled) e.currentTarget.style.opacity='0.85'; }}
      onMouseOut={e  => { if(!disabled) e.currentTarget.style.opacity='1'; }}
    >{children}</button>
  );
};

/** Input */
const Input = ({ label, value, onChange, type='text', placeholder='', required=false, min, max }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:B.gray600 }}>{label}{required && ' *'}</label>}
    <input
      type={type} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required} min={min} max={max}
      style={{ padding:'9px 12px', border:`1px solid ${B.gray200}`, borderRadius:6,
               fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, color:B.black,
               background:B.white, outline:'none', width:'100%' }}
      onFocus={e => e.target.style.borderColor = B.blue}
      onBlur={e  => e.target.style.borderColor = B.gray200}
    />
  </div>
);

/** Select */
const Sel = ({ label, value, onChange, options, required=false }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:B.gray600 }}>{label}{required && ' *'}</label>}
    <select value={value} onChange={e => onChange(e.target.value)} required={required}
      style={{ padding:'9px 12px', border:`1px solid ${B.gray200}`, borderRadius:6,
               fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, color:B.black,
               background:B.white, outline:'none', cursor:'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

/** Tarjeta de métrica */
const Metric = ({ label, value, sub, accent=false }) => (
  <div style={{ background:accent ? B.blue : B.white, border:`1px solid ${accent ? B.blue : B.gray200}`, borderRadius:10, padding:'20px 24px' }}>
    <div style={{ fontSize:11, letterSpacing:1.5, textTransform:'uppercase', color:accent?'rgba(255,255,255,0.7)':B.gray600, fontWeight:500, marginBottom:6 }}>{label}</div>
    <div style={{ fontSize:30, fontWeight:700, color:accent?B.white:B.black, lineHeight:1, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>{value}</div>
    {sub && <div style={{ fontSize:12, color:accent?'rgba(255,255,255,0.6)':B.gray400, marginTop:4 }}>{sub}</div>}
  </div>
);

/** Badge de estado */
const Badge = ({ children, color=B.blue }) => (
  <span style={{ background:`${color}18`, color, fontSize:11, fontWeight:600, letterSpacing:0.5, padding:'3px 8px', borderRadius:4, textTransform:'uppercase', whiteSpace:'nowrap' }}>
    {children}
  </span>
);

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN MODAL
// ══════════════════════════════════════════════════════════════════════════════

const LoginModal = ({ onLogin, onClose }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    // 🔌 SUPABASE: const { error } = await supabase.auth.signInWithPassword({ email, password })
    await new Promise(r => setTimeout(r, 500));
    const ok = onLogin(email, password);
    if (!ok) setError('Credenciales incorrectas.');
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:B.white, borderRadius:14, padding:'36px 40px', width:'100%', maxWidth:400, position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', cursor:'pointer', fontSize:20, color:B.gray400, lineHeight:1 }}>✕</button>
        <div style={{ marginBottom:24 }}>
          <Logo dark size="sm" />
          <p style={{ marginTop:12, fontSize:13, color:B.gray600 }}>Acceso para Administradores y Vendedores</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="Email"      type="email"    value={email}    onChange={setEmail}    placeholder="tu@neroclub.cl" />
          <Input label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          {error && <div style={{ color:'#dc2626', fontSize:13, padding:'8px 12px', background:'#fef2f2', borderRadius:6 }}>{error}</div>}
          <Btn onClick={submit} disabled={loading} style={{ marginTop:4 }}>{loading ? 'Ingresando...' : 'Ingresar →'}</Btn>
        </div>
        <div style={{ marginTop:20, padding:14, background:B.gray50, borderRadius:8, fontSize:12, color:B.gray600, lineHeight:1.8 }}>
          <strong>Admin demo:</strong> admin@neroclub.cl / admin123<br/>
          <strong>Vendedor demo:</strong> diego@neroclub.cl / vendor123
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ══════════════════════════════════════════════════════════════════════════════

const LandingPage = ({ clients, setClients, onLoginClick }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', age:'', height:'', weight:'', goal:GOALS[0] });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]:v }));

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });

  const handleSubmit = async () => {
    if (!form.name || !form.email || !selectedPlan) return;
    setSubmitting(true);
    // 🔌 SUPABASE: await supabase.auth.signUp({ email: form.email, password: uid(), ... })
    // 🔌 SUPABASE: await supabase.from('clients').insert({ ... })
    await new Promise(r => setTimeout(r, 900));
    setClients(p => [...p, {
      id: uid(), ...form,
      age: parseInt(form.age)||0, height: parseInt(form.height)||0, weight: parseFloat(form.weight)||0,
      planId: selectedPlan, startDate: TODAY, vendorId: null,
    }]);
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div style={{ background:B.black, minHeight:'100vh', color:B.white, fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(10,10,10,0.96)',
                    backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,0.06)',
                    padding:'0 40px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
        <Logo size="sm" />
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          {[['Planes','planes'],['Inscribirse','signup']].map(([l,id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.55)', fontSize:14, fontWeight:500, letterSpacing:1, textTransform:'uppercase', fontFamily:'inherit',
              transition:'color 0.15s' }}
              onMouseOver={e => e.target.style.color=B.blue} onMouseOut={e => e.target.style.color='rgba(255,255,255,0.55)'}
            >{l}</button>
          ))}
          <Btn onClick={onLoginClick} variant="outline" small>Acceso Staff</Btn>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight:'88vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'80px 40px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,102,255,0.10) 0%, transparent 65%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <NeroMark size={64} c1={B.white} c2={B.blue} />
          <div style={{ marginTop:24 }}>
            <div style={{ fontFamily:"'Bebas Neue',Impact,sans-serif", fontSize:'clamp(72px,12vw,128px)', letterSpacing:10, lineHeight:0.88, color:B.white }}>NERO<br/>CLUB</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(14px,2vw,18px)', letterSpacing:14, color:'rgba(255,255,255,0.35)', fontWeight:300, textTransform:'uppercase', marginTop:10 }}>FITNESS</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, margin:'32px 0' }}>
            <div style={{ width:40, height:1, background:B.blue }} />
            <p style={{ fontSize:16, fontWeight:300, letterSpacing:3, color:B.blue, textTransform:'uppercase' }}>
              Entrena sin masificaciones · Entrena a tu tiempo
            </p>
            <div style={{ width:40, height:1, background:B.blue }} />
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <Btn onClick={() => scrollTo('planes')} style={{ padding:'14px 36px', fontSize:16, letterSpacing:2 }}>Ver Planes →</Btn>
            <Btn onClick={() => scrollTo('signup')} variant="outline" style={{ padding:'14px 36px', fontSize:16, letterSpacing:2 }}>Inscribirme</Btn>
          </div>
          <div style={{ display:'flex', gap:56, justifyContent:'center', marginTop:64, paddingTop:32, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            {[['24/7','Acceso libre'],['+1.000m²','Instalaciones'],['0','Masificación']].map(([v,l]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:B.blue, letterSpacing:2 }}>{v}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', letterSpacing:1.5, textTransform:'uppercase', marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANES ── */}
      <section id="planes" style={{ padding:'80px 40px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, letterSpacing:3.5, color:B.blue, textTransform:'uppercase', fontWeight:500, marginBottom:10 }}>Membresías</div>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:60, letterSpacing:4, color:B.white, lineHeight:0.9 }}>ELIGE TU PLAN</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>
          {PLANS.map(p => (
            <div key={p.id}
              onClick={() => { setSelectedPlan(p.id); setTimeout(() => scrollTo('signup'), 100); }}
              style={{ border: p.popular ? `2px solid ${B.blue}` : '1px solid rgba(255,255,255,0.08)',
                       borderRadius:12, padding:'28px 24px', cursor:'pointer', position:'relative',
                       background: p.popular ? 'rgba(0,102,255,0.05)' : 'rgba(255,255,255,0.02)',
                       transition:'transform 0.2s' }}
              onMouseOver={e => e.currentTarget.style.transform='translateY(-5px)'}
              onMouseOut={e  => e.currentTarget.style.transform='translateY(0)'}
            >
              {p.badge && (
                <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
                              background:B.blue, color:B.white, fontSize:11, fontWeight:700, letterSpacing:0.5,
                              padding:'3px 14px', borderRadius:20, textTransform:'uppercase', whiteSpace:'nowrap' }}>
                  {p.badge}
                </div>
              )}
              <div style={{ fontSize:12, letterSpacing:2.5, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', marginBottom:10 }}>{p.name}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, color:B.white, letterSpacing:1, lineHeight:1 }}>{clp(p.price)}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:20 }}>
                / {p.duration === 1 ? 'mes' : `${p.duration} meses`}
              </div>
              {p.features.map(ft => (
                <div key={ft} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:7 }}>
                  <span style={{ color:B.blue, fontSize:13 }}>✓</span>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.6)' }}>{ft}</span>
                </div>
              ))}
              <div style={{ marginTop:20, border:`1px solid ${p.popular?B.blue:'rgba(255,255,255,0.15)'}`, background:p.popular?B.blue:'transparent', color:p.popular?B.white:'rgba(255,255,255,0.6)', padding:'8px 0', borderRadius:6, textAlign:'center', fontSize:12, fontWeight:600, letterSpacing:2, textTransform:'uppercase' }}>
                Seleccionar
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FORMULARIO INSCRIPCIÓN ── */}
      <section id="signup" style={{ padding:'40px 40px 80px', maxWidth:640, margin:'0 auto' }}>
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'40px' }}>
          {submitted ? (
            <div style={{ textAlign:'center', padding:'40px 0' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
              <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, letterSpacing:3, color:B.blue, marginBottom:10 }}>¡BIENVENIDO A NERO!</h3>
              <p style={{ color:'rgba(255,255,255,0.6)', fontSize:15, lineHeight:1.7 }}>Tu inscripción fue procesada exitosamente.<br/>Recibirás un correo de confirmación pronto.</p>
              <Btn onClick={() => { setSubmitted(false); setSelectedPlan(null); setForm({ name:'', email:'', age:'', height:'', weight:'', goal:GOALS[0] }); }} style={{ marginTop:24 }}>Nueva inscripción</Btn>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, letterSpacing:3, color:B.blue, textTransform:'uppercase', marginBottom:8 }}>Inscripción</div>
                <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, letterSpacing:3, color:B.white }}>ÚNETE A NERO CLUB</h3>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div style={{ gridColumn:'1/-1' }}><Input label="Nombre completo" value={form.name}   onChange={v => f('name',v)}   placeholder="Tu nombre" required /></div>
                <div style={{ gridColumn:'1/-1' }}><Input label="Email"           type="email" value={form.email}  onChange={v => f('email',v)}  placeholder="tu@email.com" required /></div>
                <Input label="Edad"          type="number" value={form.age}    onChange={v => f('age',v)}    placeholder="25" min="14" max="99" />
                <Input label="Peso (kg)"     type="number" value={form.weight} onChange={v => f('weight',v)} placeholder="70" />
                <Input label="Estatura (cm)" type="number" value={form.height} onChange={v => f('height',v)} placeholder="175" />
                <Sel   label="Objetivo fitness" value={form.goal} onChange={v => f('goal',v)} options={GOALS.map(g => ({ value:g, label:g }))} />
              </div>
              {/* Plan selector */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:B.gray400, marginBottom:10 }}>Plan seleccionado *</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {PLANS.map(p => (
                    <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{
                      border: selectedPlan===p.id ? `2px solid ${B.blue}` : '1px solid rgba(255,255,255,0.1)',
                      borderRadius:8, padding:'12px 14px', cursor:'pointer',
                      background: selectedPlan===p.id ? B.blue10 : 'transparent', transition:'border-color 0.15s' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:selectedPlan===p.id?B.blue:'rgba(255,255,255,0.65)' }}>{p.name}</div>
                      <div style={{ fontSize:14, color:B.white, fontWeight:700, marginTop:2 }}>{clp(p.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Btn onClick={handleSubmit} disabled={!form.name||!form.email||!selectedPlan||submitting}
                style={{ width:'100%', padding:'14px', fontSize:16, letterSpacing:2 }}>
                {submitting ? 'Procesando...' : `Inscribirme${selectedPlan ? ` — ${clp(plan(selectedPlan)?.price||0)}` : ''}`}
              </Btn>
            </>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:'32px 40px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Logo size="sm" />
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.25)' }}>© 2025 Nero Club Fitness — Santiago, Chile</p>
        <Btn onClick={onLoginClick} variant="ghost" small style={{ color:'rgba(255,255,255,0.3)', borderColor:'rgba(255,255,255,0.1)' }}>Acceso Staff</Btn>
      </footer>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

const AdminDashboard = ({ user, vendors, clients, setVendors, setClients, onLogout }) => {
  const [tab, setTab] = useState('overview');
  const [showAddV, setShowAddV]   = useState(false);
  const [newV, setNewV]           = useState({ name:'', email:'', password:'' });
  const [vErr, setVErr]           = useState('');

  const totalRev    = clients.reduce((s,c) => s + (plan(c.planId)?.price||0), 0);
  const activeCount = clients.filter(isActive).length;
  const vClients    = (vid) => clients.filter(c => c.vendorId === vid);
  const vRevenue    = (vid) => vClients(vid).reduce((s,c) => s + (plan(c.planId)?.price||0), 0);
  const vendorName  = (id)  => id ? (vendors.find(v => v.id===id)?.name||'—') : 'Directo web';

  const addVendor = () => {
    if (!newV.name||!newV.email||!newV.password) { setVErr('Todos los campos son obligatorios'); return; }
    // 🔌 SUPABASE: await supabase.auth.admin.createUser({ email, password, user_metadata: { role:'vendor', name } })
    // 🔌 SUPABASE: await supabase.from('vendors').insert({ name, email })
    setVendors(p => [...p, { id:uid(), ...newV }]);
    setNewV({ name:'', email:'', password:'' }); setShowAddV(false); setVErr('');
  };

  const deleteVendor = (id) => {
    if (!confirm('¿Eliminar este vendedor?')) return;
    // 🔌 SUPABASE: await supabase.from('vendors').delete().eq('id', id)
    setVendors(p => p.filter(v => v.id!==id));
  };

  const deleteClient = (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    // 🔌 SUPABASE: await supabase.from('clients').delete().eq('id', id)
    setClients(p => p.filter(c => c.id!==id));
  };

  const TABS = [
    { id:'overview', label:'Dashboard' },
    { id:'clients',  label:`Clientes (${clients.length})` },
    { id:'vendors',  label:`Vendedores (${vendors.length})` },
  ];

  const tabStyle = (id) => ({
    padding:'14px 22px', background:'none', border:'none',
    borderBottom: tab===id ? `2px solid ${B.blue}` : '2px solid transparent',
    color: tab===id ? B.blue : B.gray600,
    fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:600,
    letterSpacing:1, textTransform:'uppercase', cursor:'pointer',
  });

  const thStyle = { padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:600, letterSpacing:1, color:B.gray600, textTransform:'uppercase', borderBottom:`1px solid ${B.gray200}`, whiteSpace:'nowrap' };
  const tdStyle = { padding:'12px 16px', fontSize:14 };

  return (
    <div style={{ background:B.gray50, minHeight:'100vh', fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif" }}>
      {/* Header */}
      <div style={{ background:B.black, padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
        <Logo size="sm" />
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.45)' }}>Admin: {user?.name}</span>
          <Btn onClick={onLogout} variant="outline" small>Salir</Btn>
        </div>
      </div>
      {/* Tabs nav */}
      <div style={{ background:B.white, borderBottom:`1px solid ${B.gray200}`, padding:'0 32px', display:'flex' }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>)}
      </div>

      <div style={{ padding:'28px 32px', maxWidth:1200, margin:'0 auto' }}>

        {/* ── OVERVIEW ── */}
        {tab==='overview' && (
          <div>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, letterSpacing:3, color:B.black, marginBottom:20 }}>MÉTRICAS GLOBALES</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:28 }}>
              <Metric label="Ingresos totales"  value={clp(totalRev)}    sub="Suma de todos los planes" accent />
              <Metric label="Clientes activos"  value={activeCount}      sub={`de ${clients.length} totales`} />
              <Metric label="Vendedores"         value={vendors.length}   sub="Activos en el sistema" />
              <Metric label="Clientes totales"   value={clients.length}   sub="Desde el inicio" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Últimos clientes */}
              <div style={{ background:B.white, border:`1px solid ${B.gray200}`, borderRadius:10, padding:'20px 24px' }}>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:1.5, color:B.gray600, textTransform:'uppercase', marginBottom:16 }}>Últimos clientes</div>
                {[...clients].reverse().slice(0,5).map(c => (
                  <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${B.gray100}` }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:B.black }}>{c.name}</div>
                      <div style={{ fontSize:12, color:B.gray600 }}>{plan(c.planId)?.name} — {fmtDate(c.startDate)}</div>
                    </div>
                    <Badge color={isActive(c)?'#16a34a':'#dc2626'}>{isActive(c)?'Activo':'Vencido'}</Badge>
                  </div>
                ))}
              </div>
              {/* Performance vendedores */}
              <div style={{ background:B.white, border:`1px solid ${B.gray200}`, borderRadius:10, padding:'20px 24px' }}>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:1.5, color:B.gray600, textTransform:'uppercase', marginBottom:16 }}>Performance vendedores</div>
                {vendors.map(v => {
                  const rev = vRevenue(v.id);
                  return (
                    <div key={v.id} style={{ padding:'12px 0', borderBottom:`1px solid ${B.gray100}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:B.black }}>{v.name}</div>
                          <div style={{ fontSize:12, color:B.gray600 }}>{vClients(v.id).length} clientes</div>
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:B.blue }}>{clp(rev)}</div>
                      </div>
                      <div style={{ height:4, background:B.gray100, borderRadius:2 }}>
                        <div style={{ height:'100%', borderRadius:2, background:B.blue, width:`${Math.min((rev/Math.max(totalRev,1))*100,100)}%`, transition:'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CLIENTES ── */}
        {tab==='clients' && (
          <div>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, letterSpacing:3, color:B.black, marginBottom:20 }}>CLIENTES</h2>
            <div style={{ background:B.white, border:`1px solid ${B.gray200}`, borderRadius:10, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead>
                  <tr style={{ background:B.gray50 }}>
                    {['Nombre','Email','Plan','Ingreso','Vendedor','Estado','Monto',''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => {
                    const p  = plan(c.planId);
                    const ac = isActive(c);
                    return (
                      <tr key={c.id} style={{ borderBottom:`1px solid ${B.gray100}` }}
                        onMouseOver={e => e.currentTarget.style.background=B.gray50}
                        onMouseOut={e  => e.currentTarget.style.background='transparent'}
                      >
                        <td style={{ ...tdStyle, fontWeight:600, color:B.black }}>{c.name}</td>
                        <td style={{ ...tdStyle, color:B.gray600 }}>{c.email}</td>
                        <td style={tdStyle}><Badge>{p?.name}</Badge></td>
                        <td style={{ ...tdStyle, color:B.gray600 }}>{fmtDate(c.startDate)}</td>
                        <td style={{ ...tdStyle, color:B.gray600 }}>{vendorName(c.vendorId)}</td>
                        <td style={tdStyle}><Badge color={ac?'#16a34a':'#dc2626'}>{ac?'Activo':'Vencido'}</Badge></td>
                        <td style={{ ...tdStyle, fontWeight:700, color:B.blue }}>{clp(p?.price||0)}</td>
                        <td style={tdStyle}><Btn onClick={() => deleteClient(c.id)} variant="danger" small>Eliminar</Btn></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── VENDEDORES ── */}
        {tab==='vendors' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, letterSpacing:3, color:B.black }}>VENDEDORES</h2>
              <Btn onClick={() => setShowAddV(true)}>+ Agregar Vendedor</Btn>
            </div>
            {showAddV && (
              <div style={{ background:B.white, border:`1px solid ${B.blue}`, borderRadius:10, padding:'24px', marginBottom:20 }}>
                <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:B.black, marginBottom:16 }}>NUEVO VENDEDOR</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                  <Input label="Nombre"      value={newV.name}     onChange={v => setNewV(p=>({...p,name:v}))}     placeholder="Nombre completo" />
                  <Input label="Email"       type="email" value={newV.email}    onChange={v => setNewV(p=>({...p,email:v}))}    placeholder="vendedor@neroclub.cl" />
                  <Input label="Contraseña"  type="password" value={newV.password} onChange={v => setNewV(p=>({...p,password:v}))} placeholder="Contraseña temporal" />
                </div>
                {vErr && <div style={{ color:'#dc2626', fontSize:13, marginBottom:12 }}>{vErr}</div>}
                <div style={{ display:'flex', gap:10 }}>
                  <Btn onClick={addVendor}>Crear Vendedor</Btn>
                  <Btn onClick={() => { setShowAddV(false); setVErr(''); }} variant="ghost">Cancelar</Btn>
                </div>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {vendors.map(v => {
                const vc  = vClients(v.id);
                const rev = vRevenue(v.id);
                const initials = v.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
                return (
                  <div key={v.id} style={{ background:B.white, border:`1px solid ${B.gray200}`, borderRadius:10, padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:44, height:44, borderRadius:'50%', background:B.blue10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:B.blue }}>{initials}</div>
                      <div>
                        <div style={{ fontSize:15, fontWeight:700, color:B.black }}>{v.name}</div>
                        <div style={{ fontSize:13, color:B.gray600 }}>{v.email}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:32, alignItems:'center' }}>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:B.black }}>{vc.length}</div>
                        <div style={{ fontSize:10, color:B.gray400, textTransform:'uppercase', letterSpacing:1 }}>Clientes</div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:B.blue }}>{clp(rev)}</div>
                        <div style={{ fontSize:10, color:B.gray400, textTransform:'uppercase', letterSpacing:1 }}>Ingresos</div>
                      </div>
                      <Btn onClick={() => deleteVendor(v.id)} variant="danger" small>Eliminar</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// VENDOR DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

const VendorDashboard = ({ user, clients, setClients, onLogout }) => {
  const [tab, setTab]     = useState('register');
  const [form, setForm]   = useState({ name:'', email:'', age:'', height:'', weight:'', goal:GOALS[0], planId:'' });
  const [success, setSuccess]   = useState(false);
  const [submitting, setSub]    = useState(false);
  const [error, setError]       = useState('');
  const f = (k,v) => setForm(p => ({ ...p, [k]:v }));

  const myClients = clients.filter(c => c.vendorId === user?.id);
  const myRevenue = myClients.reduce((s,c) => s + (plan(c.planId)?.price||0), 0);
  const myActive  = myClients.filter(isActive).length;

  const submit = async () => {
    if (!form.name||!form.email||!form.planId) { setError('Nombre, email y plan son obligatorios'); return; }
    setError(''); setSub(true);
    // 🔌 SUPABASE: await supabase.from('clients').insert({ ...form, vendor_id: user.id })
    await new Promise(r => setTimeout(r,700));
    setClients(p => [...p, {
      id: uid(), name:form.name, email:form.email,
      age: parseInt(form.age)||0, height: parseInt(form.height)||0, weight: parseFloat(form.weight)||0,
      goal:form.goal, planId:parseInt(form.planId), startDate:TODAY, vendorId:user?.id,
    }]);
    setSuccess(true); setSub(false);
    setTimeout(() => { setSuccess(false); setForm({ name:'', email:'', age:'', height:'', weight:'', goal:GOALS[0], planId:'' }); setTab('sales'); }, 2000);
  };

  const tabStyle = (id) => ({
    padding:'14px 22px', background:'none', border:'none',
    borderBottom: tab===id ? `2px solid ${B.blue}` : '2px solid transparent',
    color: tab===id ? B.blue : B.gray600,
    fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:600,
    letterSpacing:1, textTransform:'uppercase', cursor:'pointer',
  });

  const thS = { padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:600, letterSpacing:1, color:B.gray600, textTransform:'uppercase', borderBottom:`1px solid ${B.gray200}`, whiteSpace:'nowrap' };
  const tdS = { padding:'12px 16px', fontSize:14 };

  return (
    <div style={{ background:B.gray50, minHeight:'100vh', fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif" }}>
      {/* Header */}
      <div style={{ background:B.black, padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
        <Logo size="sm" />
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.45)' }}>Vendedor: {user?.name}</span>
          <Btn onClick={onLogout} variant="outline" small>Salir</Btn>
        </div>
      </div>
      {/* Métricas */}
      <div style={{ background:B.white, borderBottom:`1px solid ${B.gray200}`, padding:'20px 32px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, maxWidth:680 }}>
          <Metric label="Mis clientes" value={myClients.length} sub="Total registrados" />
          <Metric label="Clientes activos" value={myActive} sub="Con plan vigente" accent />
          <Metric label="Mis ingresos" value={clp(myRevenue)} sub="Suma de planes vendidos" />
        </div>
      </div>
      {/* Tabs */}
      <div style={{ background:B.white, borderBottom:`1px solid ${B.gray200}`, padding:'0 32px', display:'flex' }}>
        <button style={tabStyle('register')} onClick={() => setTab('register')}>Registrar Cliente</button>
        <button style={tabStyle('sales')}    onClick={() => setTab('sales')}>Mis Ventas ({myClients.length})</button>
      </div>

      <div style={{ padding:'28px 32px', maxWidth:900, margin:'0 auto' }}>

        {/* ── REGISTRAR ── */}
        {tab==='register' && (
          <div style={{ background:B.white, border:`1px solid ${B.gray200}`, borderRadius:12, padding:'32px' }}>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:3, color:B.black, marginBottom:24 }}>REGISTRAR NUEVO CLIENTE</h2>
            {success && <div style={{ background:'#f0fdf4', border:'1px solid #16a34a', borderRadius:8, padding:'14px 16px', marginBottom:20, color:'#16a34a', fontWeight:600 }}>✓ Cliente registrado exitosamente</div>}
            {error  && <div style={{ background:'#fef2f2', border:'1px solid #dc2626', borderRadius:8, padding:'14px 16px', marginBottom:20, color:'#dc2626' }}>{error}</div>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              <div style={{ gridColumn:'1/-1' }}><Input label="Nombre completo" value={form.name}   onChange={v=>f('name',v)}   placeholder="Nombre del cliente" required /></div>
              <div style={{ gridColumn:'1/-1' }}><Input label="Email"           type="email" value={form.email}  onChange={v=>f('email',v)}  placeholder="cliente@email.com" required /></div>
              <Input label="Edad"          type="number" value={form.age}    onChange={v=>f('age',v)}    placeholder="25" min="14" />
              <Input label="Peso (kg)"     type="number" value={form.weight} onChange={v=>f('weight',v)} placeholder="70" />
              <Input label="Estatura (cm)" type="number" value={form.height} onChange={v=>f('height',v)} placeholder="175" />
              <Sel   label="Objetivo fitness" value={form.goal}   onChange={v=>f('goal',v)}   options={GOALS.map(g=>({ value:g, label:g }))} />
              <div style={{ gridColumn:'1/-1' }}>
                <Sel label="Plan *" value={form.planId} onChange={v=>f('planId',v)} required
                  options={[{ value:'', label:'— Selecciona un plan —' }, ...PLANS.map(p=>({ value:String(p.id), label:`${p.name} — ${clp(p.price)}` }))]} />
              </div>
            </div>
            <Btn onClick={submit} disabled={submitting||success} style={{ padding:'12px 28px', fontSize:15, letterSpacing:1 }}>
              {submitting ? 'Registrando...' : 'Registrar Cliente →'}
            </Btn>
          </div>
        )}

        {/* ── MIS VENTAS ── */}
        {tab==='sales' && (
          <div>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, letterSpacing:3, color:B.black, marginBottom:20 }}>MIS VENTAS</h2>
            {myClients.length===0 ? (
              <div style={{ background:B.white, border:`1px solid ${B.gray200}`, borderRadius:10, padding:'60px', textAlign:'center', color:B.gray400 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                <div style={{ fontSize:16 }}>Aún no tienes clientes registrados</div>
                <Btn onClick={() => setTab('register')} style={{ marginTop:16 }}>Registrar primer cliente</Btn>
              </div>
            ) : (
              <div style={{ background:B.white, border:`1px solid ${B.gray200}`, borderRadius:10, overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                  <thead>
                    <tr style={{ background:B.gray50 }}>
                      {['Cliente','Email','Plan','Ingreso','Vence','Estado','Monto'].map(h => <th key={h} style={thS}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {myClients.map(c => {
                      const p  = plan(c.planId);
                      const ac = isActive(c);
                      const end = p ? endDate(c.startDate, p.duration).toLocaleDateString('es-CL') : '—';
                      return (
                        <tr key={c.id} style={{ borderBottom:`1px solid ${B.gray100}` }}
                          onMouseOver={e => e.currentTarget.style.background=B.gray50}
                          onMouseOut={e  => e.currentTarget.style.background='transparent'}>
                          <td style={{ ...tdS, fontWeight:600, color:B.black }}>{c.name}</td>
                          <td style={{ ...tdS, color:B.gray600 }}>{c.email}</td>
                          <td style={tdS}><Badge>{p?.name}</Badge></td>
                          <td style={{ ...tdS, color:B.gray600 }}>{fmtDate(c.startDate)}</td>
                          <td style={{ ...tdS, color:B.gray600 }}>{end}</td>
                          <td style={tdS}><Badge color={ac?'#16a34a':'#dc2626'}>{ac?'Activo':'Vencido'}</Badge></td>
                          <td style={{ ...tdS, fontWeight:700, color:B.blue }}>{clp(p?.price||0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [view, setView]       = useState('landing');
  const [user, setUser]       = useState(null);
  const [vendors, setVendors] = useState(MOCK_VENDORS);
  const [clients, setClients] = useState(MOCK_CLIENTS);
  const [showLogin, setShowLogin] = useState(false);

  // Cargar fuentes
  useEffect(() => {
    [
      'https://cdn.jsdelivr.net/npm/@fontsource/bebas-neue@5.0.18/index.css',
      'https://cdn.jsdelivr.net/npm/@fontsource/barlow-condensed@5.0.8/index.css',
    ].forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const el = Object.assign(document.createElement('link'), { rel:'stylesheet', href });
        document.head.appendChild(el);
      }
    });
  }, []);

  const handleLogin = useCallback((email, password) => {
    // 🔌 SUPABASE: const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    // 🔌 SUPABASE: const { data: profile } = await supabase.from('profiles').select('role,name').single()
    if (email===ADMIN_CREDS.email && password===ADMIN_CREDS.password) {
      setUser({ id:'admin', name:'Carlos Nero', email, role:'admin' });
      setView('admin'); setShowLogin(false); return true;
    }
    const v = vendors.find(x => x.email===email && x.password===password);
    if (v) {
      setUser({ ...v, role:'vendor' });
      setView('vendor'); setShowLogin(false); return true;
    }
    return false;
  }, [vendors]);

  const handleLogout = () => {
    // 🔌 SUPABASE: await supabase.auth.signOut()
    setUser(null); setView('landing');
  };

  const ctx = { user, vendors, clients, setVendors, setClients, onLogout:handleLogout };

  return (
    <>
      {showLogin && <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />}
      {view==='landing' && <LandingPage {...ctx} onLoginClick={() => setShowLogin(true)} />}
      {view==='admin'   && <AdminDashboard {...ctx} />}
      {view==='vendor'  && <VendorDashboard {...ctx} />}
    </>
  );
}
