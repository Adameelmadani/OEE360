import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { evaluateForecast, forecastOee, normalizeOeeRows, profileOeeRows, type ForecastMethod } from '@/lib/time-series'

const DATASETS_DIR = path.join(process.cwd(), 'data', 'datasets')
const MODELS_DIR = path.join(process.cwd(), 'data', 'models')
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function safeFileName(name: unknown) {
  return typeof name === 'string' && name.length > 0 && path.basename(name) === name
}

export async function POST(request: NextRequest) {
  try {
    const { datasetId, modelId, horizon = 24, lookbackWindow = 24 } = await request.json()
    if (!safeFileName(datasetId) || !safeFileName(modelId)) {
      return NextResponse.json({ error: 'A valid dataset and model are required' }, { status: 400 })
    }

    const datasetPath = path.join(DATASETS_DIR, datasetId)
    const modelPath = path.join(MODELS_DIR, modelId)
    if (!fs.existsSync(datasetPath) || !fs.existsSync(modelPath)) {
      return NextResponse.json({ error: 'Selected dataset or model was not found' }, { status: 404 })
    }

    const parsedHorizon = clamp(Math.floor(Number(horizon) || 24), 1, 168)
    const parsedLookback = clamp(Math.floor(Number(lookbackWindow) || 24), 1, 168)
    const content = fs.readFileSync(datasetPath, 'utf-8')
    const rows: Record<string, unknown>[] = datasetId.endsWith('.csv')
      ? Papa.parse<Record<string, unknown>>(content, { header: true, skipEmptyLines: true }).data
      : JSON.parse(content)

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'The selected dataset has no usable rows' }, { status: 400 })
    }

    const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'))
    const points = normalizeOeeRows(rows)
    if (!points.length) return NextResponse.json({ error: 'No valid timestamp and OEE pairs were found' }, { status: 400 })
    const methods: ForecastMethod[] = ['seasonal', 'smoothing', 'momentum']
    const comparisons = methods.map(method => ({ method, evaluation: evaluateForecast(points, method) }))
    const configuredMethod = methods.includes(model.method) ? model.method as ForecastMethod : null
    const method = configuredMethod ?? comparisons
      .filter(result => result.evaluation)
      .sort((a, b) => a.evaluation!.smape - b.evaluation!.smape)[0]?.method ?? 'smoothing'
    const evaluation = comparisons.find(result => result.method === method)?.evaluation ?? null
    const forecasts = forecastOee(points.slice(-parsedLookback), parsedHorizon, method).map((point, index) => {
      // A widening empirical 95% interval based on chronological holdout RMSE.
      const radius = evaluation ? 1.96 * evaluation.rmse * Math.sqrt(index + 1) : 0.05
      return { ...point, lower_oee: clamp(point.predicted_oee - radius, 0, 1), upper_oee: clamp(point.predicted_oee + radius, 0, 1) }
    })

    return NextResponse.json({ forecasts, model: { id: modelId, name: model.name, method }, horizon: parsedHorizon, profile: profileOeeRows(rows), evaluation, comparisons })
  } catch (error) {
    console.error('Error generating forecast:', error)
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? String(error) : 'Failed to generate forecast' }, { status: 500 })
  }
}
