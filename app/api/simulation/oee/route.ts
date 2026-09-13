import { NextRequest, NextResponse } from 'next/server'
import { generateSimulatedOeeData } from '@/lib/oee-simulation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const hoursParam = Number(url.searchParams.get('hours') ?? '168')
    const hours = Number.isFinite(hoursParam) && hoursParam > 0 ? hoursParam : 168

    const data = generateSimulatedOeeData(hours)

    return NextResponse.json({
      data,
      generatedAt: new Date().toISOString(),
      rowCount: data.length,
    })
  } catch (error) {
    console.error('Error generating simulated OEE data:', error)
    return NextResponse.json({ error: 'Failed to generate simulated data' }, { status: 500 })
  }
}