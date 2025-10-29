import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TextPromptForm({ 
  onSubmit 
}: { 
  onSubmit: (prompt: string) => void 
}) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim()) {
      onSubmit(prompt.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        className="flex-1"
        placeholder="Describe the object you want to create..."
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
      />
      <Button type="submit" disabled={!prompt.trim()}>
        Generate 3D
      </Button>
    </form>
  )
}
