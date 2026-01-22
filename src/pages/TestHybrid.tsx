import { useState, useRef, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import HybridViewer, { AssetTransform, HybridViewerHandle } from '@/components/Three/HybridViewer'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Upload, Save, RotateCcw, Package, FileBox } from 'lucide-react'

// Sample test models - using publicly available GLB files
const SAMPLE_MODELS = [
  {
    name: 'Duck',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb'
  },
  {
    name: 'Box',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb'
  },
  {
    name: 'Avocado',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb'
  }
]

const DEFAULT_TRANSFORM: AssetTransform = {
  position: [0, -2.0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
}

export default function TestHybrid() {
  const { toast } = useToast()
  const viewerRef = useRef<HybridViewerHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [modelUrl, setModelUrl] = useState(SAMPLE_MODELS[0].url)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [transform, setTransform] = useState<AssetTransform>(DEFAULT_TRANSFORM)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = useCallback((file: File) => {
    const ext = file.name.toLowerCase()
    if (!ext.endsWith('.glb') && !ext.endsWith('.gltf')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a .glb or .gltf file',
        variant: 'destructive'
      })
      return
    }

    const blobUrl = URL.createObjectURL(file)
    setModelUrl(blobUrl)
    setUploadedFileName(file.name)
    setTransform(DEFAULT_TRANSFORM)
    toast({
      title: 'Model loaded',
      description: `${file.name} is now displayed`
    })
  }, [toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleSampleSelect = (url: string) => {
    setModelUrl(url)
    setUploadedFileName(null)
    setTransform(DEFAULT_TRANSFORM)
  }

  const handleSaveConfig = () => {
    const config = JSON.stringify(transform, null, 2)
    navigator.clipboard.writeText(config)
    toast({
      title: 'Configuration saved',
      description: 'Transform data copied to clipboard'
    })
  }

  const handleResetPosition = () => {
    setTransform(DEFAULT_TRANSFORM)
    viewerRef.current?.triggerAutoFit()
    toast({
      title: 'Position reset',
      description: 'Charm re-fitted to default position'
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex pt-16">
        {/* Main Canvas Area */}
        <div className="flex-1 p-4">
          <HybridViewer 
            ref={viewerRef}
            modelUrl={modelUrl}
            initialTransform={transform}
            onTransformChange={setTransform}
            className="h-full w-full min-h-[500px]"
          />
        </div>

        {/* Right Sidebar */}
        <div className="w-72 border-l bg-card p-4 overflow-y-auto">
          {/* Section 1: Assets */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Charm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Upload Custom Charm</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag & drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground">.glb or .gltf</p>
              </div>

              {uploadedFileName && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <FileBox className="w-4 h-4 text-primary" />
                  <span className="text-sm truncate flex-1">{uploadedFileName}</span>
                </div>
              )}

              <Separator />

              {/* Sample Models */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Sample Models
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_MODELS.map((model) => (
                    <Button
                      key={model.name}
                      variant={modelUrl === model.url ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSampleSelect(model.url)}
                    >
                      {model.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleSaveConfig}
                className="w-full"
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
              <Button 
                variant="outline"
                onClick={handleResetPosition}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Position
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
