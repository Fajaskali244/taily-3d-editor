import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { 
  getGuestDesigns, 
  deleteGuestDesign, 
  addToGuestCart,
  type GuestDesign 
} from '@/lib/guestStorage'
import { useGuestMigration } from '@/hooks/useGuestMigration'

interface Design {
  id: string
  name: string
  preview_url: string
  created_at: string
}

type CombinedDesign = Design | (GuestDesign & { preview_url: string | null; created_at: string })

const MyDesigns = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [designs, setDesigns] = useState<CombinedDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  
  // Handle guest data migration when user logs in
  useGuestMigration()

  useEffect(() => {
    if (user) {
      fetchDesigns()
    } else {
      fetchGuestDesigns()
    }
  }, [user])

  const fetchDesigns = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching designs:', error)
        toast({
          title: "Error",
          description: "Failed to load designs",
          variant: "destructive"
        })
      } else {
        setDesigns(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGuestDesigns = () => {
    try {
      const guestDesigns = getGuestDesigns()
      const formattedDesigns: CombinedDesign[] = guestDesigns.map(design => ({
        id: design.id,
        name: design.name,
        preview_url: design.previewUrl || null,
        created_at: design.createdAt
      }))
      setDesigns(formattedDesigns)
    } catch (error) {
      console.error('Error fetching guest designs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (designId: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return

    setDeleting(designId)

    try {
      if (user) {
        // Delete from database for authenticated users
        const { error } = await supabase
          .from('designs')
          .delete()
          .eq('id', designId)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error deleting design:', error)
          toast({
            title: "Error",
            description: "Failed to delete design",
            variant: "destructive"
          })
        } else {
          setDesigns(designs.filter(d => d.id !== designId))
          toast({
            title: "Success",
            description: "Design deleted successfully"
          })
        }
      } else {
        // Delete from local storage for guest users
        deleteGuestDesign(designId)
        setDesigns(designs.filter(d => d.id !== designId))
        toast({
          title: "Success",
          description: "Design deleted successfully"
        })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setDeleting(null)
    }
  }

  const addToCart = async (designId: string) => {
    const design = designs.find(d => d.id === designId)
    if (!design) return

    try {
      if (user) {
        // Add to database for authenticated users
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            design_id: designId,
            quantity: 1
          })

        if (error) {
          console.error('Error adding to cart:', error)
          toast({
            title: "Error",
            description: "Failed to add to cart",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Success",
            description: "Design added to cart!"
          })
        }
      } else {
        // Add to local storage for guest users
        addToGuestCart({
          designId: design.id,
          quantity: 1,
          designName: design.name,
          previewUrl: design.preview_url || undefined
        })
        toast({
          title: "Success",
          description: "Design added to cart!"
        })
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">My Designs</h1>
          <p className="text-muted-foreground">View and manage your keychain designs</p>
        </div>

        {designs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {user ? 'No designs found' : 'No designs saved'}
              </p>
              <Button onClick={() => window.location.href = '/'}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Design
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map((design) => (
              <Card key={design.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{design.name}</CardTitle>
                  <CardDescription>
                    Created {new Date(design.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      onClick={() => addToCart(design.id)}
                      className="w-full"
                    >
                      Add to Cart
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(design.id)}
                      disabled={deleting === design.id}
                      className="w-full"
                    >
                      {deleting === design.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyDesigns