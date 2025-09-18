import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import { ClassicCanvas } from '@/components/classic/ClassicCanvas'
import { SelectionPanel } from '@/components/classic/SelectionPanel'
import { DesignSummary } from '@/components/classic/DesignSummary'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Undo, Redo } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PlacedItem, CatalogItem } from '@/lib/catalog'
import { CATALOG_ITEMS } from '@/lib/catalog'

export type ItemKind = 'keyring' | 'bead' | 'charm'

interface ClassicState {
  keyringId: string
  placed: PlacedItem[]
  params: { colorTheme?: string }
  pricing: { subtotal: number; itemCount: number }
}

interface HistoryState {
  state: ClassicState
  timestamp: number
}

const CustomizeClassic = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [state, setState] = useState<ClassicState>({
    keyringId: 'keyring-basic',
    placed: [],
    params: { colorTheme: 'silver' },
    pricing: { subtotal: 25, itemCount: 0 }
  })

  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<CatalogItem | null>(null)

  // Load guest data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('taily.classicDraft')
    if (saved) {
      try {
        const parsedState = JSON.parse(saved)
        setState(parsedState)
        calculatePricing(parsedState.placed, parsedState.keyringId)
      } catch (error) {
        console.error('Failed to load saved state:', error)
      }
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('taily.classicDraft', JSON.stringify(state))
  }, [state])

  // Add to history when state changes (excluding pricing updates)
  useEffect(() => {
    const newHistory = [...history.slice(0, historyIndex + 1)]
    newHistory.push({ state, timestamp: Date.now() })
    
    // Keep only last 20 entries
    if (newHistory.length > 20) {
      newHistory.shift()
    } else {
      setHistoryIndex(prev => prev + 1)
    }
    
    setHistory(newHistory)
  }, [state.placed, state.keyringId])

  const calculatePricing = (placed: PlacedItem[], keyringId: string) => {
    const keyringPrice = CATALOG_ITEMS.find(item => item.id === keyringId)?.price || 25
    const itemsPrice = placed.reduce((sum, item) => {
      const catalogItem = CATALOG_ITEMS.find(c => c.id === item.catalogId)
      return sum + (catalogItem?.price || 0)
    }, 0)
    
    setState(prev => ({
      ...prev,
      pricing: {
        subtotal: keyringPrice + itemsPrice,
        itemCount: placed.length
      }
    }))
  }

  const addItem = (catalogItem: CatalogItem) => {
    const newItem: PlacedItem = {
      uid: `${catalogItem.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      catalogId: catalogItem.id,
      kind: catalogItem.kind,
      positionIndex: state.placed.length,
      rotation: [0, 0, 0],
      color: catalogItem.kind === 'keyring' ? state.params.colorTheme : undefined
    }

    const newPlaced = [...state.placed, newItem]
    setState(prev => ({
      ...prev,
      placed: newPlaced
    }))
    calculatePricing(newPlaced, state.keyringId)

    if (newPlaced.length > 50) {
      toast({
        title: "Lots of items!",
        description: "You have over 50 items. Consider the size and weight.",
        variant: "default"
      })
    }
  }

  const removeItem = (uid: string) => {
    const newPlaced = state.placed
      .filter(item => item.uid !== uid)
      .map((item, index) => ({ ...item, positionIndex: index }))
    
    setState(prev => ({
      ...prev,
      placed: newPlaced
    }))
    calculatePricing(newPlaced, state.keyringId)
  }

  const reorderItems = (fromIndex: number, toIndex: number) => {
    const newPlaced = [...state.placed]
    const [movedItem] = newPlaced.splice(fromIndex, 1)
    newPlaced.splice(toIndex, 0, movedItem)
    
    // Update position indices
    const reindexed = newPlaced.map((item, index) => ({ ...item, positionIndex: index }))
    
    setState(prev => ({
      ...prev,
      placed: reindexed
    }))
  }

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1].state
      setState(prevState)
      setHistoryIndex(prev => prev - 1)
      calculatePricing(prevState.placed, prevState.keyringId)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1].state
      setState(nextState)
      setHistoryIndex(prev => prev + 1)
      calculatePricing(nextState.placed, nextState.keyringId)
    }
  }

  const handleDragStart = (item: CatalogItem) => {
    setIsDragging(true)
    setDraggedItem(item)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDraggedItem(null)
  }

  const handleCanvasDrop = (item: CatalogItem) => {
    if (item.kind === 'keyring') {
      setState(prev => ({ ...prev, keyringId: item.id }))
      calculatePricing(state.placed, item.id)
    } else {
      addItem(item)
    }
    handleDragEnd()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/customize')}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Editor
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Classic Charm Designer</h1>
                <p className="text-muted-foreground">Drag & drop beads and charms onto your keychain</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="h-4 w-4" />
              </Button>
              <div className="text-right">
                <div className="text-2xl font-bold">IDR {state.pricing.subtotal.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{state.pricing.itemCount} items</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 3D Visualizer */}
          <div className="lg:col-span-2 space-y-6">
            <ClassicCanvas
              state={state}
              isDragging={isDragging}
              draggedItem={draggedItem}
              onDrop={handleCanvasDrop}
              onRemoveItem={removeItem}
            />
            
            <DesignSummary
              state={state}
              onRemoveItem={removeItem}
              onReorderItems={reorderItems}
              user={user}
            />
          </div>

          {/* Selection Panel */}
          <div>
            <SelectionPanel
              onItemClick={addItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomizeClassic
