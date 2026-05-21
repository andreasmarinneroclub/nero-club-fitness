/**
 * NERO CLUB FITNESS — Generadores de datos para gráficos
 * - ingresos: suma real de precios de planes vendidos en el período
 * - clientes: cantidad de planes vendidos (no personas únicas)
 * En producción estos datos vendrán de Supabase views analíticas.
 */

const PLAN_PRICES = { 1: 29900, 2: 79900, 3: 149900, 4: 269900 }
// Precios reales para mock data realista
const PRICES_ARR = [29900, 79900, 149900, 269900]
const randPrice  = () => PRICES_ARR[Math.floor(Math.random() * PRICES_ARR.length)]

// ── Helpers ─────────────────────────────────────────────────────────────────

const addDays = (date, days) => {
  const d = new Date(date); d.setDate(d.getDate() + days); return d
}

const formatLabel = (date, granularity) => {
  const d = new Date(date)
  if (granularity === 'day')  return d.toLocaleDateString('es-CL', { day:'2-digit', month:'short' })
  if (granularity === 'week') return d.toLocaleDateString('es-CL', { day:'2-digit', month:'short' })
  return d.toLocaleDateString('es-CL', { month:'short', year:'2-digit' })
}

const getGranularity = (days) => {
  if (days <= 30)  return 'day'
  if (days <= 90)  return 'week'
  return 'month'
}

const getStep = (g) => g==='day'?1:g==='week'?7:30

// Mock: genera cantidad realista de planes vendidos por bucket
const mockPlanes = (i, total) => {
  const progress = i / Math.max(total-1, 1)
  const trend    = 1 + progress * 2 // crecimiento hacia el final
  return Math.max(0, Math.round((Math.random() * trend * 1.5)))
}

// ── Ventas totales en el tiempo ───────────────────────────────────────────────

export const generateSalesTimeSeries = (clients, days) => {
  const gran      = getGranularity(days)
  const step      = getStep(gran)
  const now       = new Date()
  const startDate = addDays(now, -days)
  const buckets   = new Map()

  // Crear buckets vacíos ordenados
  let cur = new Date(startDate)
  while (cur <= now) {
    const key = formatLabel(cur, gran)
    if (!buckets.has(key)) buckets.set(key, { fecha: key, ingresos: 0, clientes: 0 })
    cur = addDays(cur, step)
  }

  // Llenar con datos reales de clientes
  let hasReal = false
  clients.forEach(c => {
    const d = new Date(c.startDate)
    if (d >= startDate && d <= now) {
      const key = formatLabel(d, gran)
      if (buckets.has(key)) {
        const b = buckets.get(key)
        b.ingresos += PLAN_PRICES[c.planId] || 0  // suma real del precio del plan
        b.clientes += 1                             // cantidad de planes vendidos
        hasReal = true
      }
    }
  })

  const arr = Array.from(buckets.values())

  // Si no hay datos reales en el rango, generar mock realista
  if (!hasReal) {
    arr.forEach((b, i) => {
      const planes    = mockPlanes(i, arr.length)
      // Ingresos = suma de precios reales de planes mock
      let ingresos    = 0
      for (let k = 0; k < planes; k++) ingresos += randPrice()
      b.clientes = planes
      b.ingresos = ingresos
    })
  }

  return arr
}

// ── Ventas por vendedor (incluye 'online') ────────────────────────────────────

export const generateVendorComparison = (clients, vendors, days) => {
  const gran      = getGranularity(days)
  const step      = getStep(gran)
  const now       = new Date()
  const startDate = addDays(now, -days)
  const buckets   = new Map()

  let cur = new Date(startDate)
  while (cur <= now) {
    const key = formatLabel(cur, gran)
    if (!buckets.has(key)) {
      const obj = { fecha: key }
      vendors.forEach(v => { obj[v.name] = 0 })
      buckets.set(key, obj)
    }
    cur = addDays(cur, step)
  }

  let hasReal = false
  clients.forEach(c => {
    const d = new Date(c.startDate)
    if (d >= startDate && d <= now) {
      const key    = formatLabel(d, gran)
      const vendor = vendors.find(v => v.id === c.vendorId)
      if (buckets.has(key) && vendor) {
        buckets.get(key)[vendor.name] += PLAN_PRICES[c.planId] || 0
        hasReal = true
      }
    }
  })

  const arr = Array.from(buckets.values())

  if (!hasReal) {
    arr.forEach((b, i) => {
      const progress = i / Math.max(arr.length-1, 1)
      vendors.forEach((v, vi) => {
        // Cada vendor tiene tendencia y fase distintas
        const base  = 60000 + vi * 30000 + progress * 90000
        const phase = vi * 1.1
        const wave  = Math.sin(progress * 4 + phase) * 30000
        const planes = Math.max(0, Math.round(Math.random() * (1.5 + progress)))
        let   total  = 0
        for (let k = 0; k < planes; k++) total += randPrice()
        b[v.name] = total || 0
      })
    })
  }

  return arr
}

// ── Churn rate ────────────────────────────────────────────────────────────────

export const generateChurnData = (clients, days) => {
  const gran      = getGranularity(days)
  const step      = getStep(gran)
  const now       = new Date()
  const startDate = addDays(now, -days)
  const result    = []
  let   cur       = new Date(startDate)
  let   idx       = 0
  const totalB    = Math.ceil(days / step)

  while (cur <= now) {
    const bucketEnd = addDays(cur, step)

    const active = clients.filter(c => {
      const dur = [1,3,6,12][c.planId-1] || 1
      const end = new Date(c.startDate); end.setMonth(end.getMonth()+dur)
      return new Date(c.startDate) <= cur && end >= cur
    }).length

    const churned = clients.filter(c => {
      const dur = [1,3,6,12][c.planId-1] || 1
      const end = new Date(c.startDate); end.setMonth(end.getMonth()+dur)
      return end >= cur && end < bucketEnd
    }).length

    const churnRate = active > 0 ? Math.round((churned/active)*100*10)/10 : 0

    // Mock si no hay suficientes datos reales
    const mockActive  = Math.round(15 + idx*0.8 + Math.random()*5)
    const mockChurned = Math.max(0, Math.round(1.5 + Math.sin(idx/totalB*Math.PI*3)*1.5 + Math.random()))
    const mockRate    = mockActive > 0 ? Math.round((mockChurned/mockActive)*100*10)/10 : 0

    result.push({
      fecha:     formatLabel(cur, gran),
      activos:   active   > 0 ? active   : mockActive,
      churned:   churned  > 0 ? churned  : mockChurned,
      churnRate: churnRate > 0 ? churnRate : mockRate,
    })

    cur = addDays(cur, step); idx++
  }

  return result
}

// ── Alias para vendor dashboard ───────────────────────────────────────────────

export const generateVendorSales = (myClients, days) => generateSalesTimeSeries(myClients, days)
