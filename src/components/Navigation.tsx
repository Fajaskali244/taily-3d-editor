import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Wand2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import lumoLogo from '@/assets/lumo-logo-new.png'

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
      navigate('/')
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center"
          >
            <img src={lumoLogo} alt="LUMO" className="h-8 w-auto" />
          </button>
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground hover:text-primary"
              onClick={() => navigate('/create')}
            >
              Cara Kerja
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground hover:text-primary"
              onClick={() => navigate('/catalog')}
            >
              Galeri
            </Button>
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground hover:text-primary"
                onClick={() => navigate('/studio')}
              >
                <Wand2 className="h-4 w-4 mr-1" />
                Studio
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground hover:text-primary"
            >
              Tentang Kami
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!user ? (
            <Button 
              onClick={() => navigate('/auth')} 
              variant="outline" 
              size="sm"
              className="rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white"
            >
              Login / Daftar
            </Button>
          ) : (
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
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navigation
