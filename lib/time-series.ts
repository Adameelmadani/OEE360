export interface OeePoint {
  timestamp: string
  time: string
  date: string
  OEE: number
  availability: number
  performance: number
  quality: number
  shift: string
  temp: number
  humidity: number
  energy_price: number
  fatigue: number
  downtime: number
  predicted_oee: number
}

export interface DataProfile {
  rowCount: number
  validRows: number
  invalidTimestampRows: number
  missingOeeRows: number
  duplicateTimestamps: number
  inferredIntervalMinutes: number | null
  start: string | null
  end: string | null
  warnings: string[]
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function numberAt(row: Record<string, unknown>, key: string, fallback: number) {
  const value = Number(row[key])
  return Number.isFinite(value) ? value : fallback
}

function timestampAt(row: Record<string, unknown>) {
  const candidate = row.timestamp ?? row.Timestamp ?? row.date ?? row.Date
  const timestamp = new Date(String(candidate ?? ''))
  return Number.isNaN(timestamp.getTime()) ? null : timestamp
}

export function normalizeOeeRows(rows: Record<string, unknown>[]): OeePoint[] {
  return rows
    .map(row => {
      const timestamp = timestampAt(row)
      if (!timestamp) return null
      const oee = numberAt(row, 'OEE', numberAt(row, 'oee', NaN))
      if (!Number.isFinite(oee)) return null
      const hour = timestamp.getHours()
      return {
        timestamp: timestamp.toISOString(),
        time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: timestamp.toLocaleDateString(),
        OEE: clamp(oee, 0, 1),
        availability: clamp(numberAt(row, 'availability', 0.8), 0, 1),
        performance: clamp(numberAt(row, 'performance', 0.8), 0, 1),
        quality: clamp(numberAt(row, 'quality', 0.9), 0, 1),
        shift: String(row.shift ?? (hour < 8 ? 'Night' : hour < 16 ? 'Day' : 'Evening')),
        temp: numberAt(row, 'temp', 0),
        humidity: numberAt(row, 'humidity', 0),
        energy_price: numberAt(row, 'energy_price', 0),
        fatigue: numberAt(row, 'fatigue', 0),
        downtime: numberAt(row, 'downtime', 0),
        predicted_oee: clamp(numberAt(row, 'predicted_oee', oee), 0, 1),
      }
    })
    .filter((point): point is OeePoint => point !== null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function profileOeeRows(rows: Record<string, unknown>[]): DataProfile {
  const points = normalizeOeeRows(rows)
  const timestamps = points.map(point => new Date(point.timestamp).getTime())
  const uniqueTimestamps = new Set(timestamps)
  const intervals = timestamps.slice(1).map((time, index) => time - timestamps[index]).filter(interval => interval > 0)
  const sortedIntervals = [...intervals].sort((a, b) => a - b)
  const median = sortedIntervals.length ? sortedIntervals[Math.floor(sortedIntervals.length / 2)] / 60000 : null
  const missingOeeRows = rows.filter(row => !Number.isFinite(Number(row.OEE ?? row.oee))).length
  const warnings: string[] = []
  if (points.length < 48) warnings.push('Fewer than 48 valid observations; forecasts will be unstable.')
  if (missingOeeRows) warnings.push(`${missingOeeRows} row(s) have no numeric OEE value and were excluded.`)
  if (uniqueTimestamps.size !== timestamps.length) warnings.push('Duplicate timestamps detected; review the source data.')
  if (median === null) warnings.push('A regular sampling interval could not be inferred.')
  return {
    rowCount: rows.length,
    validRows: points.length,
    invalidTimestampRows: rows.length - rows.filter(row => timestampAt(row)).length,
    missingOeeRows,
    duplicateTimestamps: timestamps.length - uniqueTimestamps.size,
    inferredIntervalMinutes: median,
    start: points[0]?.timestamp ?? null,
    end: points.at(-1)?.timestamp ?? null,
    warnings,
  }
}

export type ForecastMethod = 'seasonal' | 'smoothing' | 'momentum'

export function forecastOee(history: OeePoint[], horizon: number, method: ForecastMethod): OeePoint[] {
  const lookback = history.slice(-168)
  const values = lookback.map(point => point.OEE)
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const latest = lookback.at(-1)
  if (!latest) return []
  const trend = (values.at(-1)! - values[0]) / Math.max(1, values.length - 1)
  const start = new Date(latest.timestamp)
  return Array.from({ length: horizon }, (_, index) => {
    const step = index + 1
    const seasonal = values.length >= 24 ? values[(values.length - 24 + index) % values.length] : average
    const estimate = method === 'seasonal'
      ? seasonal * 0.7 + average * 0.3
      : method === 'momentum'
        ? latest.OEE + trend * step * 0.65 + (average - latest.OEE) * 0.12
        : latest.OEE * 0.65 + average * 0.35 + trend * step * 0.35
    const timestamp = new Date(start.getTime() + step * 60 * 60 * 1000)
    const predictedOee = clamp(estimate, 0.3, 1)
    return { ...latest, timestamp: timestamp.toISOString(), time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: timestamp.toLocaleDateString(), OEE: predictedOee, predicted_oee: predictedOee }
  })
}

export function evaluateForecast(points: OeePoint[], method: ForecastMethod) {
  const testSize = Math.min(24, Math.floor(points.length * 0.2))
  if (testSize < 6) return null
  const train = points.slice(0, -testSize)
  const actual = points.slice(-testSize)
  const forecast = forecastOee(train, testSize, method)
  const errors = actual.map((point, index) => point.OEE - forecast[index].predicted_oee)
  const mae = errors.reduce((sum, error) => sum + Math.abs(error), 0) / errors.length
  const rmse = Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / errors.length)
  const smape = actual.reduce((sum, point, index) => sum + (2 * Math.abs(errors[index]) / Math.max(0.0001, Math.abs(point.OEE) + Math.abs(forecast[index].predicted_oee))), 0) / actual.length * 100
  return { holdoutPoints: testSize, mae, rmse, smape }
}
