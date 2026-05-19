import { createClient } from '@supabase/supabase-js'

// 1. Copia tu URL y anon key desde: app.supabase.com → tu proyecto → Settings → API
// 2. Crea un archivo .env en la raíz del proyecto con:
//    VITE_SUPABASE_URL=https://xxxx.supabase.co
//    VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase no configurado. La app corre en modo demo con datos ficticios.')
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// ── Helpers de autenticación ──────────────────────────────────────────────────

export async function signIn(email, password) {
  if (!supabase) return { data: null, error: { message: 'Supabase no configurado' } }
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  if (!supabase) return
  return supabase.auth.signOut()
}

export async function getProfile() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export async function getVendors() {
  if (!supabase) return []
  const { data } = await supabase.from('vendors').select('*').order('created_at')
  return data || []
}

export async function createVendor({ name, email, password }) {
  if (!supabase) return null
  // Requiere service_role key — hacer desde backend o Supabase Dashboard
  const { data, error } = await supabase.auth.admin.createUser({
    email, password,
    user_metadata: { role: 'vendor', name },
    email_confirm: true,
  })
  if (error) throw error
  await supabase.from('vendors').insert({ id: data.user.id, name, email })
  return data.user
}

export async function deleteVendor(id) {
  if (!supabase) return
  await supabase.from('vendors').delete().eq('id', id)
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function getClients() {
  if (!supabase) return []
  const { data } = await supabase.from('clients_view').select('*').order('created_at', { ascending: false })
  return data || []
}

export async function getMyClients(vendorId) {
  if (!supabase) return []
  const { data } = await supabase.from('clients_view').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false })
  return data || []
}

export async function createClient({ name, email, age, height_cm, weight_kg, fitness_goal, plan_id, vendor_id }) {
  if (!supabase) return null
  // Primero crea el usuario en auth (sin contraseña → magic link)
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    user_metadata: { role: 'client', name },
    email_confirm: true,
  })
  if (authErr) throw authErr
  const { data, error } = await supabase.from('clients').insert({
    id: authData.user.id,
    name, email, age, height_cm, weight_kg, fitness_goal, plan_id, vendor_id,
    start_date: new Date().toISOString().split('T')[0],
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteClient(id) {
  if (!supabase) return
  await supabase.from('clients').delete().eq('id', id)
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function getDashboardMetrics() {
  if (!supabase) return null
  const { data } = await supabase.from('admin_dashboard_metrics').select('*').single()
  return data
}

export async function getVendorPerformance() {
  if (!supabase) return []
  const { data } = await supabase.from('vendor_performance').select('*').order('total_revenue_clp', { ascending: false })
  return data || []
}
