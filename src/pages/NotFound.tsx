import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, Sparkles } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Page not found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/')} variant="default">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
          <Button onClick={() => navigate('/create')} variant="outline">
            <Sparkles className="h-4 w-4 mr-2" />
            Start Creating
          </Button>
        </div>
      </div>
    </div>
  )
}
