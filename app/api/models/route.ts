import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { simulatedModelMetadata } from '@/lib/oee-simulation'

const MODELS_DIR = path.join(process.cwd(), 'data', 'models')

function seedModelsIfNeeded() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true })
  }

  const builtInModels = [
    { id: 'auto_select_model.json', name: 'Auto-select best baseline', method: 'auto' },
    { id: 'sarima_oee_model.json', name: 'Seasonal baseline', method: 'seasonal' },
    { id: 'lstm_oee_model.json', name: 'Exponential smoothing baseline', method: 'smoothing' },
    { id: 'gru_oee_model.json', name: 'Momentum baseline', method: 'momentum' },
  ]

  for (const model of builtInModels) {
    const modelPath = path.join(MODELS_DIR, model.id)
    const existing = fs.existsSync(modelPath) ? JSON.parse(fs.readFileSync(modelPath, 'utf-8')) : {}
    if (!fs.existsSync(modelPath) || existing.builtIn) {
      fs.writeFileSync(modelPath, JSON.stringify({
        ...simulatedModelMetadata(),
        name: model.name,
        method: model.method,
        builtIn: true,
      }, null, 2))
    }
  }
}

export async function GET() {
  try {
    // Ensure models directory exists
    seedModelsIfNeeded()

    const files = fs.readdirSync(MODELS_DIR)
    const models = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(MODELS_DIR, file)
        const stats = fs.statSync(filePath)
        
        // Read JSON model definitions directly; other model formats can supply
        // the same fields through a sidecar metadata file.
        let metadata = {}
        if (file.endsWith('.json')) {
          try {
            metadata = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          } catch {
            // A JSON upload may be model data rather than metadata.
          }
        }
        const metadataPath = path.join(MODELS_DIR, `${path.parse(file).name}_metadata.json`)
        if (fs.existsSync(metadataPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
          } catch (error) {
            console.warn(`Failed to read metadata for ${file}:`, error)
          }
        }

        return {
          id: file,
          name: file,
          size: stats.size,
          lastModified: stats.mtime,
          type: path.extname(file).slice(1),
          ...metadata
        }
      })

    return NextResponse.json({ models })
  } catch (error) {
    console.error('Error reading models:', error)
    return NextResponse.json({ error: 'Failed to read models' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadata = formData.get('metadata') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['.json']
    const fileExtension = path.extname(file.name).toLowerCase()
    if (!allowedTypes.includes(fileExtension) || path.basename(file.name) !== file.name) {
      return NextResponse.json({ 
        error: 'Invalid file type. This runtime accepts JSON model definitions only.'
      }, { status: 400 })
    }

    // Ensure models directory exists
    if (!fs.existsSync(MODELS_DIR)) {
      fs.mkdirSync(MODELS_DIR, { recursive: true })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = path.join(MODELS_DIR, file.name)

    fs.writeFileSync(filePath, buffer)

    // Save metadata if provided
    if (metadata) {
      try {
        const metadataObj = JSON.parse(metadata)
        const metadataPath = path.join(MODELS_DIR, `${path.parse(file.name).name}_metadata.json`)
        fs.writeFileSync(metadataPath, JSON.stringify(metadataObj, null, 2))
      } catch (error) {
        console.warn('Failed to save metadata:', error)
      }
    }

    return NextResponse.json({ 
      message: 'Model uploaded successfully',
      filename: file.name 
    })
  } catch (error) {
    console.error('Error uploading model:', error)
    return NextResponse.json({ error: 'Failed to upload model' }, { status: 500 })
  }
}
