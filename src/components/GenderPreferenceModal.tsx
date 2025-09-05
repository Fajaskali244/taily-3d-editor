import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface GenderPreferenceModalProps {
  onPreferenceSelect: (preference: 'him' | 'her') => void
}

export const GenderPreferenceModal = ({ onPreferenceSelect }: GenderPreferenceModalProps) => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Show modal automatically on every page load/refresh
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleSelection = (preference: 'him' | 'her') => {
    // Don't save to localStorage - session only
    onPreferenceSelect(preference)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold mb-2">
            Who is this keychain for?
          </DialogTitle>
          <DialogDescription className="text-base">
            Help us personalize your experience with the perfect design and recommendations
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            onClick={() => handleSelection('him')}
            variant="outline"
            size="lg"
            className="flex-1 h-16 text-lg font-semibold hover:scale-105 transition-transform"
          >
            🔧 For Him
          </Button>
          <Button
            onClick={() => handleSelection('her')}
            variant="outline"
            size="lg"
            className="flex-1 h-16 text-lg font-semibold hover:scale-105 transition-transform"
          >
            💎 For Her
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}