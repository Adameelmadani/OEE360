export interface Dataset {
  id: string
  name: string
  size: number
  lastModified: Date
  type: string
}

export interface Model {
  id: string
  name: string
  size: number
  lastModified: Date
  type: string
  description?: string
  accuracy?: number
  version?: string
}

export interface AnalyticsRequest {
  datasetId: string
  modelId: string
  analysisType: string
}

export interface ForecastRequest {
  datasetId: string
  modelId: string
  horizon: number
  lookbackWindow: number
}

export interface ForecastEvaluation {
  holdoutPoints: number
  mae: number
  rmse: number
  smape: number
}

export interface ForecastComparison {
  method: 'seasonal' | 'smoothing' | 'momentum'
  evaluation: ForecastEvaluation | null
}

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

export class ApiClient {
  private baseUrl = '/api'

  async getDatasets(): Promise<Dataset[]> {
    const response = await fetch(`${this.baseUrl}/datasets`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data.datasets
  }

  async uploadDataset(file: File): Promise<Dataset> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${this.baseUrl}/datasets`, {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    
    // Return the uploaded dataset info
    return {
      id: data.id || data.filename,
      name: data.name || file.name,
      size: data.size || file.size,
      lastModified: new Date(data.lastModified || file.lastModified),
      type: data.type || file.name.split('.').pop() || ''
    }
  }

  async getDataset(id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/datasets/${id}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data
  }

  async deleteDataset(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/datasets/${id}`, {
      method: 'DELETE'
    })
    
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
  }

  async getModels(): Promise<Model[]> {
    const response = await fetch(`${this.baseUrl}/models`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data.models
  }

  async uploadModel(file: File, metadata?: any): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }
    
    const response = await fetch(`${this.baseUrl}/models`, {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
  }

  async deleteModel(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/models/${id}`, {
      method: 'DELETE'
    })
    
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
  }

  async runAnalytics(request: AnalyticsRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data
  }

  async generateForecast(request: ForecastRequest): Promise<{ forecasts: (SimulatedOeePoint & { lower_oee: number; upper_oee: number })[]; evaluation: ForecastEvaluation | null; comparisons: ForecastComparison[] }> {
    const response = await fetch(`${this.baseUrl}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data
  }

  async getSimulatedOeeData(hours = 168): Promise<SimulatedOeePoint[]> {
    const response = await fetch(`${this.baseUrl}/simulation/oee?hours=${hours}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data.data
  }
}

export const apiClient = new ApiClient()
