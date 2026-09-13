import Papa from 'papaparse'

export interface SimulatedOeePoint {
  timestamp: string
  hour: number
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function generateSimulatedOeeData(hours = 168): SimulatedOeePoint[] {
  const data: SimulatedOeePoint[] = []
  const now = new Date()

  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hour = timestamp.getHours()
    const dayOfWeek = timestamp.getDay()

    const shift = hour < 8 ? 'Night' : hour < 16 ? 'Day' : 'Evening'
    const shiftFactor = shift === 'Day' ? 1.0 : shift === 'Evening' ? 0.92 : 0.85
    const weeklyFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.9 : 1.0

    const availability = clamp(0.85 * shiftFactor * weeklyFactor + (Math.random() - 0.5) * 0.1, 0.5, 0.98)
    const performance = clamp(0.8 * shiftFactor + (Math.random() - 0.5) * 0.15, 0.4, 0.95)
    const quality = clamp(0.9 * shiftFactor + (Math.random() - 0.5) * 0.08, 0.7, 0.99)
    const oee = availability * performance * quality
    const temp = 20 + Math.sin(i / 24) * 5 + (Math.random() - 0.5) * 6
    const humidity = 45 + Math.sin((i + 12) / 24) * 10 + (Math.random() - 0.5) * 10
    const energyPrice = 0.12 + Math.sin((hour / 24) * Math.PI * 2) * 0.03 + (Math.random() - 0.5) * 0.02
    const shiftHour = hour % 8
    const fatigue = clamp(0.1 + (shiftHour / 8) * 0.4 + (Math.random() - 0.5) * 0.2, 0, 1)
    const downtime = Math.random() < 0.05 ? Math.random() * 2 : 0

    data.push({
      timestamp: timestamp.toISOString(),
      hour: i,
      time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: timestamp.toLocaleDateString(),
      OEE: oee,
      availability,
      performance,
      quality,
      shift,
      temp,
      humidity,
      energy_price: energyPrice,
      fatigue,
      downtime,
      predicted_oee: clamp(oee + (Math.random() - 0.5) * 0.1, 0.3, 1.0),
    })
  }

  return data
}

export function simulatedOeeCsv(hours = 168): string {
  return Papa.unparse(generateSimulatedOeeData(hours))
}

export function simulatedModelMetadata() {
  return {
    name: 'simulated_oee_model',
    description: 'Simulated model metadata used by the backend for OEE analysis demos.',
    accuracy: 0.91,
    version: '1.0',
    source: 'backend-simulation',
  }
}