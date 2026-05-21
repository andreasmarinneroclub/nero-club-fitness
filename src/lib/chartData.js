/**
 * NERO CLUB FITNESS — Generadores de datos para gráficos
 * En producción estos datos vendrán de Supabase (views analíticas).
 * En demo generamos datos mock realistas.
 */

const PLAN_PRICES = { 1: 29900, 2: 79900, 3: 149900, 4: 269900 }

// ── Helpers ─────────────────────────────────────────────────────────────────

const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const formatLabel = (date, granularity) => {
  const d = new Date(date)
  if (granularity === 'day')   return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  if (granularity === 'week')  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
}

const getGranularity = (days) => {
  if (days <= 30)  return 'day'
  if (days <= 90)  return 'week'
  return 'month'
}

const getStep = (granularity) => {
  if (granularity === 'day')   return 1
  if (granularity === 'week')  return 7
  return 30
}

// Genera ruido gaussiano aproximado para curvas realistas
const noise = (base, variance) => Math.max(0, base + (Math.random() - 0.5) * variance * 2)

// ── Función principal: ventas totales en el tiempo ────────────────────────────

export const generateSalesTimeSeries = (clients, days) => {
  const granularity = getGranularity(days)
  const step = getStep(granularity)
  const now = new Date()
  const startDate = addDays(now, -days)
  const buckets = new Map()

  // Crear buckets vacíos
  let cur = new Date(startDate)
  while (cur <= now) {
    const key = formatLabel(cur, granularity)
    if (!buckets.has(key)) buckets.set(key, { fecha: key, ingresos: 0, clientes: 0, _date: new Date(cur) })
    cur = addDays(cur, step)
  }

  // Llenar con clientes reales
  clients.forEach(c => {
    const d = new Date(c.startDate)
    if (d >= startDate && d <= now) {
      const key = formatLabel(d, granularity)
      if (buckets.has(key)) {
        const b = buckets.get(key)
        b.ingresos += PLAN_PRICES[c.planId] || 0
        b.clientes += 1
      }
    }
  })

  // Rellenar buckets vacíos con datos mock realistas para que el gráfico se vea bien
  const arr = Array.from(buckets.values())
  const hasRealData = arr.some(b => b.clientes > 0)

  if (!hasRealData) {
    // Generar curva de crecimiento mock para modo demo
    arr.forEach((b, i) => {
      const progress = i / arr.length
      const trend = 50000 + progress * 80000
      b.ingresos = Math.round(noise(trend, 25000) / 1000) * 1000
      b.clientes = Math.max(0, Math.round(noise(2 + progress * 3, 1.5)))
    })
  }

  return arr.map(({ fecha, ingresos, clientes }) => ({ fecha, ingresos, clientes }))
}

// ── Ventas por vendedor en el tiempo ─────────────────────────────────────────

export const generateVendorComparison = (clients, vendors, days) => {
  const granularity = getGranularity(days)
  const step = getStep(granularity)
  const now = new Date()
  const startDate = addDays(now, -days)
  const buckets = new Map()

  // Crear buckets
  let cur = new Date(startDate)
  while (cur <= now) {
    const key = formatLabel(cur, granularity)
    if (!buckets.has(key)) {
      const obj = { fecha: key }
      vendors.forEach(v => { obj[v.name] = 0 })
      buckets.set(key, obj)
    }
    cur = addDays(cur, step)
  }

  // Llenar con datos reales
  clients.forEach(c => {
    const d = new Date(c.startDate)
    if (d >= startDate && d <= now) {
      const key = formatLabel(d, granularity)
      const vendor = vendors.find(v => v.id === c.vendorId)
      if (buckets.has(key) && vendor) {
        buckets.get(key)[vendor.name] += PLAN_PRICES[c.planId] || 0
      }
    }
  })

  const arr = Array.from(buckets.values())
  const hasData = arr.some(b => vendors.some(v => b[v.name] > 0))

  if (!hasData) {
    // Mock con curvas distintas por vendedor
    arr.forEach((b, i) => {
      const progress = i / arr.length
      vendors.forEach((v, vi) => {
        const base = 30000 + vi * 15000 + progress * 40000
        const phase = vi * 0.7
        b[v.name] = Math.round(noise(base + Math.sin(progress * 4 + phase) * 15000, 12000) / 1000) * 1000
      })
    })
  }

  return arr
}

// ── Churn rate en el tiempo ───────────────────────────────────────────────────

export const generateChurnData = (clients, days) => {
  const granularity = getGranularity(days)
  const step = getStep(granularity)
  const now = new Date()
  const startDate = addDays(now, -days)
  const result = []

  let cur = new Date(startDate)
  let idx = 0
  const totalBuckets = Math.ceil(days / step)

  while (cur <= now) {
    const bucketEnd = addDays(cur, step)
    const active = clients.filter(c => {
      const end = new Date(c.startDate)
      // Simular fecha de vencimiento
      const dur = [1, 3, 6, 12][c.planId - 1] || 1
      end.setMonth(end.getMonth() + dur)
      return new Date(c.startDate) <= cur && end >= cur
    }).length

    const churned = clients.filter(c => {
      const end = new Date(c.startDate)
      const dur = [1, 3, 6, 12][c.planId - 1] || 1
      end.setMonth(end.getMonth() + dur)
      return end >= cur && end < bucketEnd
    }).length

    const churnRate = active > 0 ? Math.round((churned / active) * 100 * 10) / 10 : 0

    // En demo, agregar mock si no hay suficientes datos
    const mockBase = 5 + Math.sin(idx / totalBuckets * Math.PI * 2) * 3
    result.push({
      fecha: formatLabel(cur, granularity),
      activos: active > 0 ? active : Math.round(noise(20 + idx * 0.5, 5)),
      churned: churned > 0 ? churned : Math.max(0, Math.round(noise(mockBase, 2))),
      churnRate: churnRate > 0 ? churnRate : Math.round(noise(mockBase, 1.5) * 10) / 10,
    })

    cur = addDays(cur, step)
    idx++
  }

  return result
}

// ── Vendor: ventas propias en el tiempo ───────────────────────────────────────

export const generateVendorSales = (myClients, days) => {
  return generateSalesTimeSeries(myClients, days)
}
