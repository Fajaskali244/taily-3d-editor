import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { User, ShoppingCart, Palette, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

const Navigation = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      })
    } else {
      toast({
        title: "Success",
        description: "Signed out successfully"
      })
    }
  }

  if (!user) {
    return (
      <nav className="fixed top-0 right-0 p-4 z-50">
        <Button onClick={() => navigate('/auth')} variant="outline">
          Sign In
        </Button>
      </nav>
    )
  }

  return (
    <nav className="fixed top-0 right-0 p-4 z-50">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/cart')}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cart
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/my-designs')}
        >
          <Palette className="h-4 w-4 mr-2" />
          My Designs
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Account
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}

export default Navigation