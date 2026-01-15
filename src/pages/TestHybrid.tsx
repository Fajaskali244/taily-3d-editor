import { useState } from 'react'
import Navigation from '@/components/Navigation'
import HybridViewer, { AssetTransform } from '@/components/Three/HybridViewer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Copy, Check, ExternalLink } from 'lucide-react'

// Sample test models - using publicly available GLB files
const SAMPLE_MODELS = [
  {
    name: 'Duck (GLTF Sample)',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb'
  },
  {
    name: 'Box (GLTF Sample)',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb'
  },
  {
    name: 'Avocado (GLTF Sample)',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb'
  }
]

export default function TestHybrid() {
  const { toast } = useToast()
  const [modelUrl, setModelUrl] = useState(SAMPLE_MODELS[0].url)
  const [customUrl, setCustomUrl] = useState('')
  const [transform, setTransform] = useState<AssetTransform>({
    position: [0, 0.3, 0],
    rotation: [0, 0, 0],
    scale: [0.5, 0.5, 0.5]
  })
  const [copied, setCopied] = useState(false)

  const handleCopyTransform = () => {
    const json = JSON.stringify(transform, null, 2)
    navigator.clipboard.writeText(json)
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Transform JSON copied to clipboard'
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLoadCustomUrl = () => {
    if (customUrl.trim()) {
      setModelUrl(customUrl.trim())
      toast({
        title: 'Loading model...',
        description: 'Custom model URL set'
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-6 pt-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Hybrid Viewer Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the assembly editor with different 3D models. Position the charm on the keyring.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main viewer - takes up 2 columns */}
          <div className="lg:col-span-2">
            <HybridViewer 
              modelUrl={modelUrl}
              initialTransform={transform}
              onTransformChange={setTransform}
              className="h-[600px] w-full"
            />
          </div>

          {/* Controls sidebar */}
          <div className="space-y-4">
            {/* Model selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Sample Models</CardTitle>
                <CardDescription>Select a test model</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {SAMPLE_MODELS.map((model) => (
                  <Button
                    key={model.name}
                    variant={modelUrl === model.url ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setModelUrl(model.url)}
                  >
                    {model.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Custom URL input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Custom Model</CardTitle>
                <CardDescription>Load your own GLB file</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="customUrl">GLB URL</Label>
                  <Input
                    id="customUrl"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/model.glb"
                  />
                </div>
                <Button 
                  onClick={handleLoadCustomUrl}
                  disabled={!customUrl.trim()}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Load Custom Model
                </Button>
              </CardContent>
            </Card>

            {/* Transform output */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Transform Data</CardTitle>
                <CardDescription>
                  Current position for <code>asset_transform</code> column
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-40">
                  {JSON.stringify(transform, null, 2)}
                </pre>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleCopyTransform}
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </Button>
              </CardContent>
            </Card>

            {/* Usage instructions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">How to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Select <strong>Move</strong>, <strong>Rotate</strong>, or <strong>Scale</strong></li>
                  <li>Drag the gizmo arrows to transform</li>
                  <li>Orbit camera by dragging the background</li>
                  <li>Scroll to zoom in/out</li>
                  <li>Copy the transform JSON when satisfied</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
