/**
 * NERO CLUB FITNESS — Aplicación Web Completa v2
 * Cambios v2:
 *  - Login limpio (sin credenciales hardcoded en el formulario)
 *  - Dashboards con Recharts (LineChart) y selector de fechas
 *  - Integración Supabase en puntos marcados con 🔌
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  generateSalesTimeSeries,
  generateVendorComparison,
  generateChurnData,
  generateVendorSales,
} from './lib/chartData'
// 🔌 import { supabase, signIn, signOut, getProfile } from './lib/supabase'

// ══════════════════════════════════════════════════════════════════════════════
// BRAND & CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const B = {
  black:'#0A0A0A', blue:'#0066FF', blueDk:'#003CBF',
  blue10:'rgba(0,102,255,0.08)', white:'#FFFFFF',
  gray50:'#F7F7F7', gray100:'#F0F0F0', gray200:'#E0E0E0',
  gray400:'#AAAAAA', gray600:'#666666',
}

const PLANS = [
  {id:1,name:'Mensual',   price:29900, duration:1,  popular:false,badge:null,         features:['Acceso ilimitado','Sin permanencia','App Nero Club']},
  {id:2,name:'Trimestral',price:79900, duration:3,  popular:false,badge:'Ahorra $9.800',features:['Acceso ilimitado','Sin permanencia','App Nero Club','Toalla incluida']},
  {id:3,name:'Semestral', price:149900,duration:6,  popular:true, badge:'Más popular', features:['Acceso ilimitado','Sin permanencia','App + Toalla','Camiseta Nero']},
  {id:4,name:'Anual',     price:269900,duration:12, popular:false,badge:'Mayor ahorro',features:['Acceso ilimitado','Matrícula gratis','Pack completo Nero','Máximo ahorro']},
]

const GOALS = [
  'Ganar masa muscular','Bajar de peso','Mejorar condición física',
  'Tonificar cuerpo','Fitness general','Preparación deportiva',
]

const DATE_RANGES = [
  {label:'7D',  days:7},
  {label:'1M',  days:30},
  {label:'3M',  days:90},
  {label:'6M',  days:180},
  {label:'1A',  days:365},
]

const TODAY = new Date().toISOString().split('T')[0]
const uid   = () => Math.random().toString(36).slice(2,9)

// Vendor virtual para inscripciones desde el sitio web (sin vendedor físico)
const ONLINE_VENDOR = { id:'online', name:'Venta Online', email:'sitio web', isVirtual:true }

// Demo credentials — usados SOLO para modo mock, nunca mostrados en el formulario
const _DEMO = {
  admin:   { email:'andreasmarin@neroclub.cl', password:'Constanza1812', id:'admin', name:'Andrea Marín', role:'admin' },
  vendors: [
    { id:'v1', name:'Diego Morales',  email:'diego@neroclub.cl', password:'vendor123' },
    { id:'v2', name:'Valentina Cruz', email:'vale@neroclub.cl',  password:'vendor456' },
  ],
}

// ONLINE_VENDOR siempre presente, no se puede eliminar
const INIT_VENDORS = [ONLINE_VENDOR, ..._DEMO.vendors.map(({ password: _p, ...v }) => v)]
const INIT_CLIENTS = [
  {id:'c1',name:'Matías Rodríguez',email:'matias@gmail.com',age:28,height:178,weight:80,goal:'Ganar masa muscular',  planId:3,startDate:'2025-03-01',vendorId:'v1'},
  {id:'c2',name:'Sofía Herrera',   email:'sofia@gmail.com', age:24,height:162,weight:58,goal:'Bajar de peso',        planId:1,startDate:'2025-04-15',vendorId:'v2'},
  {id:'c3',name:'Tomás Fernández', email:'tomas@gmail.com', age:32,height:182,weight:90,goal:'Mejorar condición física',planId:4,startDate:'2025-01-10',vendorId:'v1'},
  {id:'c4',name:'Camila Muñoz',    email:'camila@gmail.com',age:26,height:165,weight:62,goal:'Tonificar cuerpo',    planId:2,startDate:'2025-05-01',vendorId:'v2'},
  {id:'c5',name:'Benjamín Torres', email:'ben@gmail.com',   age:30,height:175,weight:75,goal:'Fitness general',     planId:3,startDate:'2025-04-20',vendorId:'v1'},
  // Ejemplo de venta online (sin vendedor físico)
  {id:'c6',name:'Lucía Campos',    email:'lucia@gmail.com', age:22,height:160,weight:55,goal:'Tonificar cuerpo',    planId:2,startDate:'2025-05-10',vendorId:'online'},
]

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const clp      = n => `$${Math.round(n).toLocaleString('es-CL')} CLP`
const clpShort = n => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n}`
const plan     = id => PLANS.find(p => p.id === id)
const fmtDate  = d  => new Date(d).toLocaleDateString('es-CL')
const endDate  = (sd,m) => { const d=new Date(sd); d.setMonth(d.getMonth()+m); return d }
const isActive = c => { const p=plan(c.planId); return p ? endDate(c.startDate,p.duration)>=new Date():false }

// ══════════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

const NeroMark = ({size=28,c1='#FFF',c2='#0066FF'}) => (
  <svg width={Math.round(size*.7)} height={size} viewBox="0 0 28 40" style={{flexShrink:0}}>
    <polygon points="0,0 8,0 8,40 0,40" fill={c1}/>
    <polygon points="8,0 16,0 20,40 12,40" fill={c2}/>
    <polygon points="20,0 28,0 28,40 20,40" fill={c1}/>
  </svg>
)

const Logo = ({dark=false,size='md'}) => {
  const [mk,fs]={sm:[15,26],md:[20,38],lg:[30,56]}[size]||[20,38]
  const fg=dark?B.black:B.white
  return (
    <div style={{display:'flex',alignItems:'center',gap:9}}>
      <NeroMark size={mk} c1={fg} c2={B.blue}/>
      <div>
        <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:fs,color:fg,letterSpacing:4,lineHeight:.9}}>NERO</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:fs*.22,color:dark?'rgba(0,0,0,.4)':'rgba(255,255,255,.45)',letterSpacing:5,textTransform:'uppercase',fontWeight:300,marginTop:2}}>CLUB FITNESS</div>
      </div>
    </div>
  )
}

const Btn = ({children,onClick,variant='primary',small=false,disabled=false,style:s={}}) => {
  const vs={
    primary:{background:B.blue,color:B.white,border:'none'},
    outline:{background:'transparent',color:B.blue,border:`1px solid ${B.blue}`},
    danger:{background:'#dc2626',color:B.white,border:'none'},
    ghost:{background:'transparent',color:B.gray600,border:`1px solid ${B.gray200}`},
    active:{background:B.blue,color:B.white,border:`1px solid ${B.blue}`},
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...vs[variant]||vs.ghost,padding:small?'5px 13px':'10px 22px',borderRadius:6,
      fontFamily:"'Barlow Condensed',sans-serif",fontSize:small?12:14,fontWeight:600,
      letterSpacing:1,textTransform:'uppercase',cursor:disabled?'not-allowed':'pointer',
      opacity:disabled?.6:1,transition:'opacity .15s',...s}}
      onMouseOver={e=>{if(!disabled)e.currentTarget.style.opacity='.82'}}
      onMouseOut={e=>{if(!disabled)e.currentTarget.style.opacity='1'}}>
      {children}
    </button>
  )
}

const Inp = ({label,value,onChange,type='text',placeholder='',min,max,required}) => (
  <div style={{display:'flex',flexDirection:'column',gap:3}}>
    {label&&<label style={{fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:B.gray600}}>{label}{required&&' *'}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder} required={required} min={min} max={max}
      style={{padding:'8px 11px',border:`1px solid ${B.gray200}`,borderRadius:6,
        fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,color:B.black,
        background:B.white,outline:'none',width:'100%'}}
      onFocus={e=>e.target.style.borderColor=B.blue}
      onBlur={e=>e.target.style.borderColor=B.gray200}/>
  </div>
)

const Sel = ({label,value,onChange,options,required}) => (
  <div style={{display:'flex',flexDirection:'column',gap:3}}>
    {label&&<label style={{fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:B.gray600}}>{label}{required&&' *'}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} required={required}
      style={{padding:'8px 11px',border:`1px solid ${B.gray200}`,borderRadius:6,
        fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,color:B.black,
        background:B.white,outline:'none',cursor:'pointer'}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)

const Metric = ({label,value,sub,accent=false}) => (
  <div style={{background:accent?B.blue:B.white,border:`1px solid ${accent?B.blue:B.gray200}`,borderRadius:10,padding:'16px 20px'}}>
    <div style={{fontSize:10,letterSpacing:1.5,textTransform:'uppercase',color:accent?'rgba(255,255,255,.7)':B.gray600,fontWeight:500,marginBottom:5}}>{label}</div>
    <div style={{fontSize:26,fontWeight:700,color:accent?B.white:B.black,lineHeight:1,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:accent?'rgba(255,255,255,.6)':B.gray400,marginTop:3}}>{sub}</div>}
  </div>
)

const Badge = ({children,color=B.blue}) => (
  <span style={{background:`${color}18`,color,fontSize:10,fontWeight:600,letterSpacing:.5,padding:'2px 7px',borderRadius:4,textTransform:'uppercase',whiteSpace:'nowrap'}}>{children}</span>
)

// ── DateRangeFilter ──────────────────────────────────────────────────────────
const DateRangeFilter = ({value, onChange}) => (
  <div style={{display:'flex',gap:4}}>
    {DATE_RANGES.map(r => (
      <button key={r.days} onClick={() => onChange(r.days)} style={{
        padding:'4px 10px',borderRadius:4,border:`1px solid ${value===r.days?B.blue:B.gray200}`,
        background:value===r.days?B.blue:'transparent',color:value===r.days?B.white:B.gray600,
        fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>
        {r.label}
      </button>
    ))}
  </div>
)

// ── ChartCard ────────────────────────────────────────────────────────────────
const ChartCard = ({title, subtitle, children, action}) => (
  <div style={{background:B.white,border:`1px solid ${B.gray200}`,borderRadius:10,padding:'20px 24px',marginBottom:14}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <div>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:1.5,color:B.gray600,textTransform:'uppercase'}}>{title}</div>
        {subtitle&&<div style={{fontSize:12,color:B.gray400,marginTop:2}}>{subtitle}</div>}
      </div>
      {action}
    </div>
    {children}
  </div>
)

// ── CustomTooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({active, payload, label, formatter}) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:B.black,border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:'10px 14px',fontSize:12,minWidth:160}}>
      <div style={{color:'rgba(255,255,255,0.45)',marginBottom:6,letterSpacing:1,fontSize:11}}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{color:p.color,fontWeight:600,marginBottom:2}}>
          {p.name}: {formatter ? formatter(p.value, p.name) : p.value}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN MODAL — Sin credenciales hardcoded
// ══════════════════════════════════════════════════════════════════════════════

const LoginModal = ({onLogin, onClose}) => {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async () => {
    if (!email || !password) { setError('Ingresa tu email y contraseña'); return }
    setError(''); setLoading(true)

    // 🔌 SUPABASE — Producción:
    // const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    // if (authErr) { setError('Credenciales incorrectas'); setLoading(false); return }
    // const profile = await getProfile()
    // onLogin(profile)

    // Demo mock:
    await new Promise(r => setTimeout(r, 600))
    const ok = onLogin(email, password)
    if (!ok) setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    setLoading(false)
  }

  const handleKey = e => { if (e.key === 'Enter') submit() }

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:B.white,borderRadius:14,padding:'36px 40px',width:380,maxWidth:'90%',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'none',border:'none',cursor:'pointer',fontSize:18,color:B.gray400,lineHeight:1}}>✕</button>
        <div style={{marginBottom:24}}>
          <Logo dark size="sm"/>
          <p style={{marginTop:10,fontSize:13,color:B.gray600,margin:'10px 0 0'}}>Acceso exclusivo para staff autorizado</p>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Inp label="Email" type="email" value={email} onChange={setEmail}
            placeholder="tu@neroclub.cl" required/>
          <div onKeyDown={handleKey}>
            <Inp label="Contraseña" type="password" value={password} onChange={setPassword}
              placeholder="••••••••" required/>
          </div>
          {error && (
            <div style={{color:'#dc2626',fontSize:12,padding:'8px 12px',background:'#fef2f2',borderRadius:6,border:'1px solid #fecaca'}}>
              {error}
            </div>
          )}
          <Btn onClick={submit} disabled={loading} style={{marginTop:4}}>
            {loading ? 'Verificando...' : 'Ingresar →'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ══════════════════════════════════════════════════════════════════════════════

const Landing = ({clients, setClients, onLoginClick}) => {
  const [selPlan,  setSelPlan]  = useState(null)
  const [form,     setForm]     = useState({name:'',email:'',age:'',height:'',weight:'',goal:GOALS[0]})
  const [submitted,setSubmitted]= useState(false)
  const [busy,     setBusy]     = useState(false)
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const submit = async () => {
    if (!form.name||!form.email||!selPlan) return
    setBusy(true)

    const selectedPlan = plan(selPlan)
    const endDt = selectedPlan
      ? (() => { const d=new Date(); d.setMonth(d.getMonth()+selectedPlan.duration); return d.toLocaleDateString('es-CL') })()
      : '—'

    // Registrar en estado local (modo demo)
    setClients(p=>[...p,{
      id:uid(), ...form,
      age:parseInt(form.age)||0, height:parseInt(form.height)||0, weight:parseFloat(form.weight)||0,
      planId:selPlan, startDate:TODAY, vendorId:'online',
    }])

    // Llamada REAL a Edge Function welcome-email
    try {
      await fetch(
        'https://ksfjhrlajwpaulyyuqpu.supabase.co/functions/v1/welcome-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzamhybGFqd3BhdWx5eXVxcHUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0NzY2MDExNiwiZXhwIjoyMDYzMjM2MTE2fQ.6u0bnFmKuRSiocZzXCvOF_MEu7srgq7DRDMQR-bfcMs',
          },
          body: JSON.stringify({
            clientName:  form.name,
            clientEmail: form.email,
            planName:    selectedPlan?.name || 'Nero Club Fitness',
            endDate:     endDt,
          }),
        }
      )
    } catch (err) {
      console.error('Error enviando email de bienvenida:', err)
    }

    setSubmitted(true)
    setBusy(false)
  }

  return (
    <div style={{background:B.black,color:B.white,fontFamily:"'Barlow Condensed',sans-serif"}}>
      <nav style={{background:'rgba(10,10,10,.96)',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'0 28px',display:'flex',alignItems:'center',justifyContent:'space-between',height:58,position:'sticky',top:0,zIndex:10}}>
        <Logo size="sm"/>
        <div style={{display:'flex',alignItems:'center',gap:20}}>
          <span onClick={()=>document.getElementById('planes')?.scrollIntoView({behavior:'smooth'})} style={{fontSize:13,color:'rgba(255,255,255,.45)',letterSpacing:1,textTransform:'uppercase',cursor:'pointer'}}>Planes</span>
          <span onClick={()=>document.getElementById('maquinaria')?.scrollIntoView({behavior:'smooth'})} style={{fontSize:13,color:'rgba(255,255,255,.45)',letterSpacing:1,textTransform:'uppercase',cursor:'pointer'}}>Maquinaria</span>
          <Btn onClick={onLoginClick} variant="outline" small>Acceso Staff</Btn>
        </div>
      </nav>

      {/* Hero */}
      <div style={{minHeight:420,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'60px 28px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,102,255,.1) 0%,transparent 65%)',top:'50%',left:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
        <NeroMark size={52} c1={B.white} c2={B.blue}/>
        <div style={{marginTop:18,fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(60px,10vw,100px)',letterSpacing:8,lineHeight:.88,color:B.white}}>NERO<br/>CLUB</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:10,color:'rgba(255,255,255,.3)',fontWeight:300,textTransform:'uppercase',marginTop:8}}>FITNESS</div>
        <div style={{display:'flex',alignItems:'center',gap:14,margin:'24px 0'}}>
          <div style={{width:32,height:1,background:B.blue}}/>
          <p style={{fontSize:14,fontWeight:300,letterSpacing:2.5,color:B.blue,textTransform:'uppercase'}}>Entrena sin masificaciones · Entrena a tu tiempo</p>
          <div style={{width:32,height:1,background:B.blue}}/>
        </div>
        <div style={{display:'flex',gap:12}}>
          <Btn onClick={()=>document.getElementById('planes')?.scrollIntoView({behavior:'smooth'})} style={{padding:'14px 28px',fontSize:15,letterSpacing:2}}>Ver Planes →</Btn>
          <Btn onClick={()=>document.getElementById('signup')?.scrollIntoView({behavior:'smooth'})} variant="outline" style={{padding:'14px 28px',fontSize:15,letterSpacing:2}}>Inscribirme</Btn>
        </div>
        <div style={{display:'flex',gap:32,justifyContent:'center',marginTop:32,paddingTop:24,borderTop:'1px solid rgba(255,255,255,.06)'}}>
          {[['24/7','Acceso'],['+1.000m²','Instalaciones'],['0','Masificación']].map(([v,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,color:B.blue}}>{v}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.35)',letterSpacing:1.5,textTransform:'uppercase'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Planes */}
      <div id="planes" style={{padding:'48px 28px',maxWidth:960,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{fontSize:10,letterSpacing:3,color:B.blue,textTransform:'uppercase',marginBottom:8}}>Membresías</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,letterSpacing:4,color:B.white,lineHeight:.9}}>ELIGE TU PLAN</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
          {PLANS.map(p=>(
            <div key={p.id} onClick={()=>setSelPlan(p.id)}
              style={{border:p.popular?`2px solid ${B.blue}`:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'22px 18px',cursor:'pointer',position:'relative',background:p.popular?'rgba(0,102,255,.05)':'rgba(255,255,255,.02)',transition:'transform .2s'}}
              onMouseOver={e=>e.currentTarget.style.transform='translateY(-4px)'}
              onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
              {p.badge&&<div style={{position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:B.blue,color:B.white,fontSize:10,fontWeight:700,padding:'2px 12px',borderRadius:20,textTransform:'uppercase',whiteSpace:'nowrap'}}>{p.badge}</div>}
              <div style={{fontSize:11,letterSpacing:2,color:'rgba(255,255,255,.4)',textTransform:'uppercase',marginBottom:8}}>{p.name}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:B.white,letterSpacing:1,lineHeight:1}}>{clp(p.price)}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginBottom:16}}>/ {p.duration===1?'mes':`${p.duration} meses`}</div>
              {p.features.map(ft=><div key={ft} style={{display:'flex',gap:7,alignItems:'center',marginBottom:6}}><span style={{color:B.blue,fontSize:12}}>✓</span><span style={{fontSize:12,color:'rgba(255,255,255,.6)'}}>{ft}</span></div>)}
              <div style={{marginTop:16,border:`1px solid ${selPlan===p.id?B.blue:p.popular?B.blue:'rgba(255,255,255,.15)'}`,background:selPlan===p.id?B.blue:p.popular?B.blue:'transparent',color:B.white,padding:'7px 0',borderRadius:6,textAlign:'center',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase'}}>
                {selPlan===p.id?'✓ Seleccionado':'Seleccionar'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Maquinaria */}
      <div id="maquinaria" style={{background:'#0A0A0A',padding:'72px 28px'}}>
        <div style={{maxWidth:960,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{fontSize:11,letterSpacing:3.5,color:'#0066FF',textTransform:'uppercase',fontWeight:500,marginBottom:10}}>Instalaciones</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,letterSpacing:4,color:'#FFFFFF',lineHeight:.9,marginBottom:16}}>NUESTRA MAQUINARIA</div>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.45)',maxWidth:480,margin:'0 auto',lineHeight:1.7,fontWeight:300,letterSpacing:0.5}}>
              Equipamiento Hammer Strength de nivel profesional. La misma maquinaria que usan los atletas de élite.
            </p>
          </div>

          {/* Grid de fotos */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12,marginBottom:40}}>
            {[
              {
                url:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
                label:'Press de Pecho ISO-Lateral',
                tag:'Hammer Strength'
              },
              {
                url:'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80',
                label:'Zona de Pesos Libres',
                tag:'Área Principal'
              },
              {
                url:'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80',
                label:'Máquinas de Espalda',
                tag:'Hammer Strength'
              },
              {
                url:'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80',
                label:'Sala Completa',
                tag:'Sin Masificación'
              },
            ].map((item,i) => (
              <div key={i}
                style={{position:'relative',borderRadius:10,overflow:'hidden',aspectRatio:'4/3',cursor:'pointer',border:'1px solid rgba(255,255,255,0.06)'}}
                onMouseOver={e=>{e.currentTarget.querySelector('.overlay').style.opacity='1'}}
                onMouseOut={e=>{e.currentTarget.querySelector('.overlay').style.opacity='0'}}>
                <img
                  src={item.url}
                  alt={item.label}
                  style={{width:'100%',height:'100%',objectFit:'cover',display:'block',transition:'transform 0.4s'}}
                  onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'}
                  onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}
                />
                {/* Overlay */}
                <div className="overlay" style={{position:'absolute',inset:0,background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%)',opacity:0,transition:'opacity 0.3s',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'20px 18px'}}>
                  <div style={{fontSize:10,letterSpacing:2,color:'#0066FF',textTransform:'uppercase',marginBottom:4,fontWeight:600}}>{item.tag}</div>
                  <div style={{fontSize:15,fontWeight:600,color:'#FFFFFF',letterSpacing:0.5}}>{item.label}</div>
                </div>
                {/* Badge siempre visible */}
                <div style={{position:'absolute',top:12,left:12,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:'3px 10px',fontSize:10,color:'rgba(255,255,255,0.7)',letterSpacing:1,textTransform:'uppercase'}}>
                  {item.tag}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{textAlign:'center'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,marginBottom:24}}>
              <div style={{width:40,height:1,background:'rgba(255,255,255,0.1)'}}/>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.3)',letterSpacing:2,textTransform:'uppercase'}}>Próximamente fotos reales de nuestras instalaciones</span>
              <div style={{width:40,height:1,background:'rgba(255,255,255,0.1)'}}/>
            </div>
            <button
              onClick={()=>document.getElementById('signup')?.scrollIntoView({behavior:'smooth'})}
              style={{background:'transparent',border:'1px solid rgba(0,102,255,0.5)',color:'#0066FF',padding:'12px 32px',borderRadius:6,fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:600,letterSpacing:2,textTransform:'uppercase',cursor:'pointer',transition:'all 0.2s'}}
              onMouseOver={e=>{e.currentTarget.style.background='#0066FF';e.currentTarget.style.color='#fff'}}
              onMouseOut={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#0066FF'}}>
              Quiero entrenar aquí →
            </button>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div id="signup" style={{padding:'20px 28px 60px',maxWidth:580,margin:'0 auto'}}>
        <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:'32px'}}>
          {submitted ? (
            <div style={{textAlign:'center',padding:'32px 0'}}>
              <div style={{fontSize:44,marginBottom:14}}>🎉</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:3,color:B.blue,marginBottom:8}}>¡BIENVENIDO A NERO!</div>
              <p style={{color:'rgba(255,255,255,.55)',fontSize:14,lineHeight:1.7}}>Tu inscripción fue procesada.<br/>Revisa tu correo — te enviamos un regalo.</p>
              <Btn onClick={()=>{setSubmitted(false);setSelPlan(null);setForm({name:'',email:'',age:'',height:'',weight:'',goal:GOALS[0]})}} style={{marginTop:20}}>Nueva inscripción</Btn>
            </div>
          ) : (
            <>
              <div style={{marginBottom:22}}>
                <div style={{fontSize:10,letterSpacing:3,color:B.blue,textTransform:'uppercase',marginBottom:6}}>Inscripción</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:3,color:B.white}}>ÚNETE A NERO CLUB</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div style={{gridColumn:'1/-1'}}><Inp label="Nombre completo *" value={form.name} onChange={v=>f('name',v)} placeholder="Tu nombre completo"/></div>
                <div style={{gridColumn:'1/-1'}}><Inp label="Email *" type="email" value={form.email} onChange={v=>f('email',v)} placeholder="tu@email.com"/></div>
                <Inp label="Edad" type="number" value={form.age} onChange={v=>f('age',v)} placeholder="25" min="14" max="99"/>
                <Inp label="Peso (kg)" type="number" value={form.weight} onChange={v=>f('weight',v)} placeholder="70"/>
                <Inp label="Estatura (cm)" type="number" value={form.height} onChange={v=>f('height',v)} placeholder="175"/>
                <Sel label="Objetivo" value={form.goal} onChange={v=>f('goal',v)} options={GOALS.map(g=>({value:g,label:g}))}/>
              </div>
              <div style={{marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginBottom:8}}>Plan seleccionado *</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                  {PLANS.map(p=>(
                    <div key={p.id} onClick={()=>setSelPlan(p.id)} style={{border:selPlan===p.id?`2px solid ${B.blue}`:'1px solid rgba(255,255,255,.1)',borderRadius:7,padding:'10px 12px',cursor:'pointer',background:selPlan===p.id?B.blue10:'transparent'}}>
                      <div style={{fontSize:12,fontWeight:600,color:selPlan===p.id?B.blue:'rgba(255,255,255,.6)'}}>{p.name}</div>
                      <div style={{fontSize:13,color:B.white,fontWeight:700,marginTop:1}}>{clp(p.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Btn onClick={submit} disabled={!form.name||!form.email||!selPlan||busy} style={{width:'100%',padding:'13px',fontSize:15,letterSpacing:2}}>
                {busy?'Procesando...':`Inscribirme${selPlan?` — ${clp(plan(selPlan)?.price||0)}`:''}`}
              </Btn>
            </>
          )}
        </div>
      </div>
      <div style={{padding:'24px 28px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <Logo size="sm"/>
        <span style={{fontSize:12,color:'rgba(255,255,255,.25)'}}>© 2025 Nero Club Fitness · Santiago, Chile</span>
        <Btn onClick={onLoginClick} variant="ghost" small style={{color:'rgba(255,255,255,.3)',borderColor:'rgba(255,255,255,.1)'}}>Staff</Btn>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

const AdminDash = ({user, vendors, clients, setVendors, setClients, onLogout}) => {
  const [tab,      setTab]      = useState('overview')
  const [showAdd,  setShowAdd]  = useState(false)
  const [nv,       setNv]       = useState({name:'',email:'',password:''})
  const [vErr,     setVErr]     = useState('')
  const [range,    setRange]    = useState(30)

  const totalRev   = clients.reduce((s,c)=>s+(plan(c.planId)?.price||0),0)
  const active     = clients.filter(isActive).length
  const vc         = vid => clients.filter(c=>c.vendorId===vid)
  const vr         = vid => vc(vid).reduce((s,c)=>s+(plan(c.planId)?.price||0),0)
  const vname      = id => {
    if (!id || id==='online') return 'Venta Online'
    return vendors.find(v=>v.id===id)?.name || '—'
  }

  // Chart data memoized
  const salesData   = useMemo(()=>generateSalesTimeSeries(clients, range), [clients, range])
  const vendorData  = useMemo(()=>generateVendorComparison(clients, vendors, range), [clients, vendors, range])
  const churnData   = useMemo(()=>generateChurnData(clients, range), [clients, range])

  const VENDOR_COLORS = ['#0066FF','#00C6FF','#7B61FF','#FF6B6B','#FFD93D']

  const addV = () => {
    if (!nv.name||!nv.email||!nv.password) { setVErr('Todos los campos son obligatorios'); return }
    // 🔌 SUPABASE: await supabase.auth.admin.createUser({ email: nv.email, password: nv.password, user_metadata: { role:'vendor', name: nv.name } })
    setVendors(p=>[...p,{id:uid(),name:nv.name,email:nv.email}])
    setNv({name:'',email:'',password:''}); setShowAdd(false); setVErr('')
  }

  const delV = id => {
    if (!confirm('¿Eliminar este vendedor?')) return
    // 🔌 SUPABASE: await supabase.from('vendors').delete().eq('id', id)
    setVendors(p=>p.filter(v=>v.id!==id))
  }

  const delC = id => {
    if (!confirm('¿Eliminar este cliente?')) return
    // 🔌 SUPABASE: await supabase.from('clients').delete().eq('id', id)
    setClients(p=>p.filter(c=>c.id!==id))
  }

  const tabS = id => ({
    padding:'12px 18px',background:'none',border:'none',
    borderBottom:tab===id?`2px solid ${B.blue}`:'2px solid transparent',
    color:tab===id?B.blue:B.gray600,fontFamily:"'Barlow Condensed',sans-serif",
    fontSize:13,fontWeight:600,letterSpacing:1,textTransform:'uppercase',cursor:'pointer'
  })
  const thS = {padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:600,letterSpacing:1,color:B.gray600,textTransform:'uppercase',borderBottom:`1px solid ${B.gray200}`,whiteSpace:'nowrap'}
  const tdS = {padding:'10px 14px',fontSize:13}

  return (
    <div style={{background:B.gray50,minHeight:'100vh',fontFamily:"'Barlow Condensed',sans-serif"}}>
      <div style={{background:B.black,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:56}}>
        <Logo size="sm"/>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <span style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>Admin: {user?.name}</span>
          <Btn onClick={onLogout} variant="outline" small>Salir</Btn>
        </div>
      </div>

      <div style={{background:B.white,borderBottom:`1px solid ${B.gray200}`,padding:'0 24px',display:'flex'}}>
        {[['overview','Dashboard'],['clients',`Clientes (${clients.length})`],['vendors',`Vendedores (${vendors.length})`]].map(([id,l])=>
          <button key={id} style={tabS(id)} onClick={()=>setTab(id)}>{l}</button>
        )}
      </div>

      <div style={{padding:'22px 24px',maxWidth:1100,margin:'0 auto'}}>

        {/* ── OVERVIEW ── */}
        {tab==='overview' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:12}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:3,color:B.black}}>MÉTRICAS GLOBALES</div>
              <DateRangeFilter value={range} onChange={setRange}/>
            </div>

            {/* Métricas top */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
              <Metric label="Ingresos totales" value={clp(totalRev)} sub="Suma histórica" accent/>
              <Metric label="Clientes activos" value={active} sub={`de ${clients.length} totales`}/>
              <Metric label="Vendedores" value={vendors.length} sub="Activos"/>
              <Metric label="Clientes totales" value={clients.length} sub="Desde el inicio"/>
            </div>

            {/* Gráfico 1: Ventas totales en el tiempo */}
            <ChartCard
              title="Ventas totales"
              subtitle={`Ingresos CLP y planes vendidos — últimos ${DATE_RANGES.find(r=>r.days===range)?.label}`}
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={salesData} margin={{top:5,right:20,bottom:5,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.gray100}/>
                  <XAxis dataKey="fecha" tick={{fontSize:10,fill:B.gray400}} interval="preserveStartEnd"/>
                  <YAxis yAxisId="left" tick={{fontSize:10,fill:B.gray400}} tickFormatter={clpShort} width={60}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:B.gray400}} tickFormatter={v=>`${v}u`} width={35}/>
                  <Tooltip content={
                    <ChartTooltip formatter={(v,name)=>
                      name==='ingresos CLP' ? clp(v) : `${v} plan${v!==1?'es':''}`
                    }/>
                  }/>
                  <Legend wrapperStyle={{fontSize:12}}/>
                  <Line yAxisId="left"  type="monotone" dataKey="ingresos" name="ingresos CLP"
                    stroke={B.blue} strokeWidth={2} dot={false} activeDot={{r:4}}/>
                  <Line yAxisId="right" type="monotone" dataKey="clientes" name="planes vendidos"
                    stroke="#00C6FF" strokeWidth={2} dot={false} activeDot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Gráfico 2: Ventas por vendedor */}
            <ChartCard
              title="Ventas por vendedor"
              subtitle="Ingresos CLP por canal de venta — incluye venta online"
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={vendorData} margin={{top:5,right:20,bottom:5,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.gray100}/>
                  <XAxis dataKey="fecha" tick={{fontSize:10,fill:B.gray400}} interval="preserveStartEnd"/>
                  <YAxis tick={{fontSize:10,fill:B.gray400}} tickFormatter={clpShort} width={60}/>
                  <Tooltip content={<ChartTooltip formatter={(v)=>clp(v)}/>}/>
                  <Legend wrapperStyle={{fontSize:12}}/>
                  {vendors.map((v,i) => (
                    <Line key={v.id} type="monotone" dataKey={v.name}
                      stroke={VENDOR_COLORS[i%VENDOR_COLORS.length]} strokeWidth={2}
                      dot={false} activeDot={{r:4}}
                      strokeDasharray={v.isVirtual ? '5 3' : undefined}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Gráfico 3: Churn rate */}
            <ChartCard
              title="Churn Rate"
              subtitle="Clientes que no renovaron su membresía"
            >
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={churnData} margin={{top:5,right:20,bottom:5,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.gray100}/>
                  <XAxis dataKey="fecha" tick={{fontSize:10,fill:B.gray400}} interval="preserveStartEnd"/>
                  <YAxis yAxisId="left" tick={{fontSize:10,fill:B.gray400}} width={35}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:B.gray400}} tickFormatter={v=>`${v}%`} width={40}/>
                  <Tooltip content={
                    <ChartTooltip formatter={(v,name)=>name==='churn %' ? `${v}%` : `${v} cliente${v!==1?'s':''}`}/>
                  }/>
                  <Legend wrapperStyle={{fontSize:12}}/>
                  <Line yAxisId="left"  type="monotone" dataKey="activos"   stroke={B.blue}    strokeWidth={2} dot={false} name="activos"/>
                  <Line yAxisId="left"  type="monotone" dataKey="churned"   stroke="#dc2626"   strokeWidth={2} dot={false} name="no renovaron"/>
                  <Line yAxisId="right" type="monotone" dataKey="churnRate" stroke="#f97316"   strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="churn %"/>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Últimos clientes + performance vendedores */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{background:B.white,border:`1px solid ${B.gray200}`,borderRadius:10,padding:'18px 20px'}}>
                <div style={{fontSize:10,fontWeight:600,letterSpacing:1.5,color:B.gray600,textTransform:'uppercase',marginBottom:14}}>Últimos clientes</div>
                {[...clients].reverse().slice(0,5).map(c=>(
                  <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${B.gray100}`}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:B.black}}>{c.name}</div>
                      <div style={{fontSize:11,color:B.gray600}}>{plan(c.planId)?.name} — {fmtDate(c.startDate)}</div>
                    </div>
                    <Badge color={isActive(c)?'#16a34a':'#dc2626'}>{isActive(c)?'Activo':'Vencido'}</Badge>
                  </div>
                ))}
              </div>
              <div style={{background:B.white,border:`1px solid ${B.gray200}`,borderRadius:10,padding:'18px 20px'}}>
                <div style={{fontSize:10,fontWeight:600,letterSpacing:1.5,color:B.gray600,textTransform:'uppercase',marginBottom:14}}>Performance vendedores</div>
                {vendors.map(v=>{
                  const rev=vr(v.id)
                  return (
                    <div key={v.id} style={{padding:'10px 0',borderBottom:`1px solid ${B.gray100}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <div><div style={{fontSize:13,fontWeight:600,color:B.black}}>{v.name}</div><div style={{fontSize:11,color:B.gray600}}>{vc(v.id).length} clientes</div></div>
                        <div style={{fontSize:13,fontWeight:700,color:B.blue}}>{clp(rev)}</div>
                      </div>
                      <div style={{height:4,background:B.gray100,borderRadius:2}}>
                        <div style={{height:'100%',borderRadius:2,background:B.blue,width:`${Math.min((rev/Math.max(totalRev,1))*100,100)}%`}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CLIENTES ── */}
        {tab==='clients' && (
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:3,color:B.black,marginBottom:18}}>CLIENTES</div>
            <div style={{background:B.white,border:`1px solid ${B.gray200}`,borderRadius:10,overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr style={{background:B.gray50}}>
                  {['Nombre','Email','Plan','Ingreso','Vendedor','Estado','Monto',''].map(h=><th key={h} style={thS}>{h}</th>)}
                </tr></thead>
                <tbody>{clients.map(c=>{
                  const p=plan(c.planId); const ac=isActive(c)
                  return (<tr key={c.id} style={{borderBottom:`1px solid ${B.gray100}`}}
                    onMouseOver={e=>e.currentTarget.style.background=B.gray50}
                    onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{...tdS,fontWeight:600,color:B.black}}>{c.name}</td>
                    <td style={{...tdS,color:B.gray600,fontSize:12}}>{c.email}</td>
                    <td style={tdS}><Badge>{p?.name}</Badge></td>
                    <td style={{...tdS,color:B.gray600}}>{fmtDate(c.startDate)}</td>
                    <td style={{...tdS,color:B.gray600}}>{vname(c.vendorId)}</td>
                    <td style={tdS}><Badge color={ac?'#16a34a':'#dc2626'}>{ac?'Activo':'Vencido'}</Badge></td>
                    <td style={{...tdS,fontWeight:700,color:B.blue}}>{clp(p?.price||0)}</td>
                    <td style={tdS}><Btn onClick={()=>delC(c.id)} variant="danger" small>✕</Btn></td>
                  </tr>)
                })}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── VENDEDORES ── */}
        {tab==='vendors' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:3,color:B.black}}>VENDEDORES</div>
              <Btn onClick={()=>setShowAdd(true)}>+ Agregar Vendedor</Btn>
            </div>
            {showAdd && (
              <div style={{background:B.white,border:`1px solid ${B.blue}`,borderRadius:10,padding:'20px',marginBottom:16}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:B.black,marginBottom:14}}>NUEVO VENDEDOR</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
                  <Inp label="Nombre" value={nv.name} onChange={v=>setNv(p=>({...p,name:v}))} placeholder="Nombre completo"/>
                  <Inp label="Email" type="email" value={nv.email} onChange={v=>setNv(p=>({...p,email:v}))} placeholder="vendedor@neroclub.cl"/>
                  <Inp label="Contraseña temporal" type="password" value={nv.password} onChange={v=>setNv(p=>({...p,password:v}))} placeholder="••••••••"/>
                </div>
                {vErr&&<div style={{color:'#dc2626',fontSize:12,marginBottom:10}}>{vErr}</div>}
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={addV}>Crear Vendedor</Btn>
                  <Btn onClick={()=>{setShowAdd(false);setVErr('')}} variant="ghost">Cancelar</Btn>
                </div>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {vendors.map(v=>{
                const vcs=vc(v.id); const rev=vr(v.id)
                const ini=v.isVirtual ? '🌐' : v.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
                return (
                  <div key={v.id} style={{
                    background:B.white,
                    border:`1px solid ${v.isVirtual?'rgba(0,102,255,0.2)':B.gray200}`,
                    borderRadius:10,padding:'16px 20px',
                    display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{
                        width:40,height:40,borderRadius:'50%',
                        background:v.isVirtual?'rgba(0,102,255,0.06)':B.blue10,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:v.isVirtual?18:14,fontWeight:700,color:B.blue
                      }}>{ini}</div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{fontSize:14,fontWeight:700,color:B.black}}>{v.name}</div>
                          {v.isVirtual&&<span style={{fontSize:10,background:'rgba(0,102,255,0.1)',color:B.blue,padding:'1px 6px',borderRadius:10,fontWeight:600,letterSpacing:0.5}}>AUTOMÁTICO</span>}
                        </div>
                        <div style={{fontSize:12,color:B.gray600}}>{v.email}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:24,alignItems:'center'}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:B.black}}>{vcs.length}</div>
                        <div style={{fontSize:10,color:B.gray400,textTransform:'uppercase',letterSpacing:1}}>Clientes</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:B.blue}}>{clp(rev)}</div>
                        <div style={{fontSize:10,color:B.gray400,textTransform:'uppercase',letterSpacing:1}}>Ingresos</div>
                      </div>
                      {v.isVirtual
                        ? <div style={{fontSize:11,color:B.gray400,letterSpacing:0.5}}>No eliminable</div>
                        : <Btn onClick={()=>delV(v.id)} variant="danger" small>Eliminar</Btn>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VENDOR DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

const VendorDash = ({user, clients, setClients, onLogout}) => {
  const [tab,  setTab]  = useState('register')
  const [form, setForm] = useState({name:'',email:'',age:'',height:'',weight:'',goal:GOALS[0],planId:''})
  const [ok,   setOk]   = useState(false)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const [range,setRange]= useState(30)
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const mine    = clients.filter(c=>c.vendorId===user?.id)
  const myRev   = mine.reduce((s,c)=>s+(plan(c.planId)?.price||0),0)
  const myActive= mine.filter(isActive).length

  const chartData = useMemo(() => generateVendorSales(mine, range), [mine, range])

  const submit = async () => {
    if (!form.name||!form.email||!form.planId) { setErr('Nombre, email y plan son obligatorios'); return }
    setErr(''); setBusy(true)

    const selectedPlan = plan(parseInt(form.planId))
    const endDt = selectedPlan
      ? (() => { const d=new Date(); d.setMonth(d.getMonth()+selectedPlan.duration); return d.toLocaleDateString('es-CL') })()
      : '—'

    // Registrar en estado local (modo demo)
    setClients(p=>[...p,{
      id:uid(), name:form.name, email:form.email,
      age:parseInt(form.age)||0, height:parseInt(form.height)||0,
      weight:parseFloat(form.weight)||0, goal:form.goal,
      planId:parseInt(form.planId), startDate:TODAY, vendorId:user?.id,
    }])

    // Llamada REAL a Edge Function welcome-email
    try {
      await fetch(
        'https://ksfjhrlajwpaulyyuqpu.supabase.co/functions/v1/welcome-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzamhybGFqd3BhdWx5eXVxcHUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0NzY2MDExNiwiZXhwIjoyMDYzMjM2MTE2fQ.6u0bnFmKuRSiocZzXCvOF_MEu7srgq7DRDMQR-bfcMs',
          },
          body: JSON.stringify({
            clientName:  form.name,
            clientEmail: form.email,
            planName:    selectedPlan?.name || 'Nero Club Fitness',
            endDate:     endDt,
          }),
        }
      )
    } catch (err) {
      console.error('Error enviando email de bienvenida:', err)
    }

    setBusy(false); setOk(true)
    setTimeout(()=>{setOk(false);setForm({name:'',email:'',age:'',height:'',weight:'',goal:GOALS[0],planId:''});setTab('sales')},2000)
  }

  const tabS = id => ({
    padding:'12px 18px',background:'none',border:'none',
    borderBottom:tab===id?`2px solid ${B.blue}`:'2px solid transparent',
    color:tab===id?B.blue:B.gray600,fontFamily:"'Barlow Condensed',sans-serif",
    fontSize:13,fontWeight:600,letterSpacing:1,textTransform:'uppercase',cursor:'pointer'
  })
  const thS = {padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:600,letterSpacing:1,color:B.gray600,textTransform:'uppercase',borderBottom:`1px solid ${B.gray200}`,whiteSpace:'nowrap'}
  const tdS = {padding:'10px 14px',fontSize:13}

  return (
    <div style={{background:B.gray50,minHeight:'100vh',fontFamily:"'Barlow Condensed',sans-serif"}}>
      <div style={{background:B.black,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:56}}>
        <Logo size="sm"/>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <span style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>Vendedor: {user?.name}</span>
          <Btn onClick={onLogout} variant="outline" small>Salir</Btn>
        </div>
      </div>

      {/* Métricas */}
      <div style={{background:B.white,borderBottom:`1px solid ${B.gray200}`,padding:'16px 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,maxWidth:580}}>
          <Metric label="Mis clientes" value={mine.length} sub="Total registrados"/>
          <Metric label="Activos" value={myActive} sub="Plan vigente" accent/>
          <Metric label="Mis ingresos" value={clp(myRev)} sub="Suma de planes"/>
        </div>
      </div>

      <div style={{background:B.white,borderBottom:`1px solid ${B.gray200}`,padding:'0 24px',display:'flex'}}>
        <button style={tabS('register')} onClick={()=>setTab('register')}>Registrar Cliente</button>
        <button style={tabS('sales')} onClick={()=>setTab('sales')}>Mis Ventas ({mine.length})</button>
        <button style={tabS('chart')} onClick={()=>setTab('chart')}>Mi Gráfico</button>
      </div>

      <div style={{padding:'22px 24px',maxWidth:860,margin:'0 auto'}}>

        {/* ── REGISTRAR ── */}
        {tab==='register' && (
          <div style={{background:B.white,border:`1px solid ${B.gray200}`,borderRadius:12,padding:'28px'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:3,color:B.black,marginBottom:20}}>REGISTRAR NUEVO CLIENTE</div>
            {ok&&<div style={{background:'#f0fdf4',border:'1px solid #16a34a',borderRadius:8,padding:'12px 14px',marginBottom:16,color:'#16a34a',fontWeight:600}}>✓ Cliente registrado — se le enviará un email de bienvenida</div>}
            {err&&<div style={{background:'#fef2f2',border:'1px solid #dc2626',borderRadius:8,padding:'12px 14px',marginBottom:16,color:'#dc2626'}}>{err}</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:18}}>
              <div style={{gridColumn:'1/-1'}}><Inp label="Nombre completo *" value={form.name} onChange={v=>f('name',v)} placeholder="Nombre del cliente"/></div>
              <div style={{gridColumn:'1/-1'}}><Inp label="Email *" type="email" value={form.email} onChange={v=>f('email',v)} placeholder="cliente@email.com"/></div>
              <Inp label="Edad" type="number" value={form.age} onChange={v=>f('age',v)} placeholder="25" min="14"/>
              <Inp label="Peso (kg)" type="number" value={form.weight} onChange={v=>f('weight',v)} placeholder="70"/>
              <Inp label="Estatura (cm)" type="number" value={form.height} onChange={v=>f('height',v)} placeholder="175"/>
              <Sel label="Objetivo fitness" value={form.goal} onChange={v=>f('goal',v)} options={GOALS.map(g=>({value:g,label:g}))}/>
              <div style={{gridColumn:'1/-1'}}>
                <Sel label="Plan *" value={form.planId} onChange={v=>f('planId',v)}
                  options={[{value:'',label:'— Selecciona un plan —'},...PLANS.map(p=>({value:String(p.id),label:`${p.name} — ${clp(p.price)}`}))]}/>
              </div>
            </div>
            <Btn onClick={submit} disabled={busy||ok} style={{padding:'11px 26px',fontSize:14,letterSpacing:1}}>
              {busy?'Registrando...':'Registrar Cliente →'}
            </Btn>
          </div>
        )}

        {/* ── MIS VENTAS ── */}
        {tab==='sales' && (
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:3,color:B.black,marginBottom:18}}>MIS VENTAS</div>
            {mine.length===0 ? (
              <div style={{background:B.white,border:`1px solid ${B.gray200}`,borderRadius:10,padding:'50px',textAlign:'center',color:B.gray400}}>
                <div style={{fontSize:44,marginBottom:10}}>📋</div>
                <div style={{fontSize:15}}>Aún no tienes clientes registrados</div>
                <Btn onClick={()=>setTab('register')} style={{marginTop:14}}>Registrar primer cliente</Btn>
              </div>
            ) : (
              <div style={{background:B.white,border:`1px solid ${B.gray200}`,borderRadius:10,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead><tr style={{background:B.gray50}}>
                    {['Cliente','Email','Plan','Ingreso','Vence','Estado','Monto'].map(h=><th key={h} style={thS}>{h}</th>)}
                  </tr></thead>
                  <tbody>{mine.map(c=>{
                    const p=plan(c.planId); const ac=isActive(c)
                    const end=p?endDate(c.startDate,p.duration).toLocaleDateString('es-CL'):'—'
                    return (
                      <tr key={c.id} style={{borderBottom:`1px solid ${B.gray100}`}}
                        onMouseOver={e=>e.currentTarget.style.background=B.gray50}
                        onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{...tdS,fontWeight:600,color:B.black}}>{c.name}</td>
                        <td style={{...tdS,color:B.gray600,fontSize:12}}>{c.email}</td>
                        <td style={tdS}><Badge>{p?.name}</Badge></td>
                        <td style={{...tdS,color:B.gray600}}>{fmtDate(c.startDate)}</td>
                        <td style={{...tdS,color:B.gray600}}>{end}</td>
                        <td style={tdS}><Badge color={ac?'#16a34a':'#dc2626'}>{ac?'Activo':'Vencido'}</Badge></td>
                        <td style={{...tdS,fontWeight:700,color:B.blue}}>{clp(p?.price||0)}</td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MI GRÁFICO ── */}
        {tab==='chart' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:12}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:3,color:B.black}}>MIS VENTAS EN EL TIEMPO</div>
              <DateRangeFilter value={range} onChange={setRange}/>
            </div>

            <ChartCard title="Ingresos generados" subtitle="Evolución de tus ventas en el período seleccionado">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{top:5,right:20,bottom:5,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.gray100}/>
                  <XAxis dataKey="fecha" tick={{fontSize:10,fill:B.gray400}} interval="preserveStartEnd"/>
                  <YAxis yAxisId="left" tick={{fontSize:10,fill:B.gray400}} tickFormatter={clpShort} width={60}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:B.gray400}} tickFormatter={v=>`${v}u`} width={35}/>
                  <Tooltip content={
                    <ChartTooltip formatter={(v,name)=>
                      name==='ingresos CLP' ? clp(v) : `${v} plan${v!==1?'es':''}`
                    }/>
                  }/>
                  <Legend wrapperStyle={{fontSize:12}}/>
                  <Line yAxisId="left"  type="monotone" dataKey="ingresos" name="ingresos CLP"
                    stroke={B.blue} strokeWidth={2.5} dot={false} activeDot={{r:5}}/>
                  <Line yAxisId="right" type="monotone" dataKey="clientes" name="planes vendidos"
                    stroke="#00C6FF" strokeWidth={2} dot={false} activeDot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Resumen del período */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
              <Metric label="Ingresos período" value={clp(chartData.reduce((s,d)=>s+d.ingresos,0))} sub={`Últimos ${range} días`} accent/>
              <Metric label="Clientes período" value={chartData.reduce((s,d)=>s+d.clientes,0)} sub="Nuevos inscritos"/>
              <Metric label="Promedio diario" value={clp(Math.round(chartData.reduce((s,d)=>s+d.ingresos,0)/Math.max(chartData.length,1)))} sub="Ingreso promedio"/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [view,      setView]      = useState('landing')
  const [user,      setUser]      = useState(null)
  const [vendors,   setVendors]   = useState(INIT_VENDORS)
  const [clients,   setClients]   = useState(INIT_CLIENTS)
  const [showLogin, setShowLogin] = useState(false)

  const login = useCallback((email, password) => {
    // 🔌 SUPABASE — En producción usar signIn() desde lib/supabase.js
    if (email===_DEMO.admin.email && password===_DEMO.admin.password) {
      setUser(_DEMO.admin); setView('admin'); setShowLogin(false); return true
    }
    const v = _DEMO.vendors.find(x=>x.email===email && x.password===password)
    if (v) {
      setUser({id:v.id,name:v.name,email:v.email,role:'vendor'})
      setView('vendor'); setShowLogin(false); return true
    }
    return false
  }, [])

  const logout = () => {
    // 🔌 SUPABASE: await signOut()
    setUser(null); setView('landing')
  }

  const ctx = {user,vendors,clients,setVendors,setClients,onLogout:logout}

  return (
    <>
      {showLogin && <LoginModal onLogin={login} onClose={()=>setShowLogin(false)}/>}
      {view==='landing' && <Landing {...ctx} onLoginClick={()=>setShowLogin(true)}/>}
      {view==='admin'   && <AdminDash {...ctx}/>}
      {view==='vendor'  && <VendorDash {...ctx}/>}
    </>
  )
}
