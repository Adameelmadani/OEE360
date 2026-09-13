import { useState, useEffect, useRef } from 'react'
import { ApiClient, Dataset, Model } from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface DataModelSelectorProps {
  onSelect: (datasetId: string, modelId: string, forecastHorizon: number, lookbackWindow: number) => void
  className?: string
  initialForecastHorizon?: number
  initialLookbackWindow?: number
}

export function DataModelSelector({ 
  onSelect, 
  className,
  initialForecastHorizon = 24,
  initialLookbackWindow = 24 
}: DataModelSelectorProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [forecastHorizon, setForecastHorizon] = useState<number>(initialForecastHorizon)
  const [lookbackWindow, setLookbackWindow] = useState<number>(initialLookbackWindow)
  const [loading, setLoading] = useState<boolean>(true)
  const [uploading, setUploading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [uploadError, setUploadError] = useState<string>('')
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const apiClient = new ApiClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [datasetsData, modelsData] = await Promise.all([
        apiClient.getDatasets(),
        apiClient.getModels()
      ])
      setDatasets(datasetsData)
      // Only show models returned by the API. The old hard-coded choices did
      // not have corresponding files, so selecting one always failed analysis.
      setModels(modelsData)
      setError('')
    } catch (err) {
      setError('Failed to load data. Please try again.')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      setUploading(true)
      setError('')
      setUploadError('')
      setUploadSuccess(false)
      
      console.log('Uploading file:', file.name, file.type, file.size)
      
      // Upload the file and get the response
      const uploadResponse = await apiClient.uploadDataset(file)
      
      console.log('Upload successful', uploadResponse)
      setUploadSuccess(true)
      
      // Refresh the datasets list after upload
      await fetchData()
      
      // Auto-select the newly uploaded dataset
      if (uploadResponse && uploadResponse.id) {
        setSelectedDataset(uploadResponse.id)
      }
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error uploading dataset:', err)
      setUploadError(err.message || 'Failed to upload dataset')
    } finally {
      setUploading(false)
    }
  }

  const handleLoadData = () => {
    if (selectedDataset && selectedModel) {
      onSelect(selectedDataset, selectedModel, forecastHorizon, lookbackWindow)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading datasets and models...</div>
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-gray-400">Dataset</label>
            <div className="flex items-center">
              {uploadSuccess && (
                <span className="text-xs text-green-400 mr-2">Upload successful!</span>
              )}
              {uploadError && (
                <span className="text-xs text-red-400 mr-2">{uploadError}</span>
              )}
              <Button
                onClick={handleUploadClick}
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                disabled={uploading}
              >
                {uploading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  <>
                    <Upload className="h-3 w-3" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.json"
            className="hidden"
          />
          <Select 
            value={selectedDataset} 
            onValueChange={setSelectedDataset}
          >
            <SelectTrigger className="bg-gray-700 border-gray-600">
              <SelectValue placeholder="Select a dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((dataset) => (
                <SelectItem key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Model</label>
          <Select 
            value={selectedModel} 
            onValueChange={setSelectedModel}
          >
            <SelectTrigger className="bg-gray-700 border-gray-600">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Forecast Horizon (hours)</label>
          <Input 
            type="number" 
            min={1}
            max={168}
            value={forecastHorizon}
            onChange={(e) => setForecastHorizon(Math.min(168, Math.max(1, Number(e.target.value) || initialForecastHorizon)))}
            className="bg-gray-700 border-gray-600"
          />
        </div>
        
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Lookback Window (hours)</label>
          <Input 
            type="number"
            min={1}
            max={168}
            value={lookbackWindow}
            onChange={(e) => setLookbackWindow(Math.min(168, Math.max(1, Number(e.target.value) || initialLookbackWindow)))}
            className="bg-gray-700 border-gray-600"
          />
        </div>
        
        <Button 
          onClick={handleLoadData}
          disabled={!selectedDataset || !selectedModel}
          className="w-full"
        >
          Apply Dataset & Model
        </Button>
      </div>
    </div>
  )
}
