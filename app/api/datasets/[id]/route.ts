import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { profileOeeRows } from '@/lib/time-series'

const DATASETS_DIR = path.join(process.cwd(), 'data', 'datasets')
const isSafeFileName = (id: string) => id.length > 0 && path.basename(id) === id

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isSafeFileName(params.id)) return NextResponse.json({ error: 'Invalid dataset ID' }, { status: 400 })
    const filePath = path.join(DATASETS_DIR, params.id)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const fileExtension = path.extname(params.id).toLowerCase()

    let data
    if (fileExtension === '.csv') {
      const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true })
      data = parsed.data
    } else if (fileExtension === '.json') {
      data = JSON.parse(fileContent)
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const rows = Array.isArray(data) ? data as Record<string, unknown>[] : []
    return NextResponse.json({ data, filename: params.id, profile: profileOeeRows(rows) })
  } catch (error) {
    console.error('Error reading dataset:', error)
    return NextResponse.json({ error: 'Failed to read dataset' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isSafeFileName(params.id)) return NextResponse.json({ error: 'Invalid dataset ID' }, { status: 400 })
    const filePath = path.join(DATASETS_DIR, params.id)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    fs.unlinkSync(filePath)
    return NextResponse.json({ message: 'Dataset deleted successfully' })
  } catch (error) {
    console.error('Error deleting dataset:', error)
    return NextResponse.json({ error: 'Failed to delete dataset' }, { status: 500 })
  }
}
