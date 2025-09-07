import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2 } from 'lucide-react'

interface Design {
  id: string
  name: string
  design_data_url: string
  created_at: string
}

const MyDesigns = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchDesigns()
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

  const handleDelete = async (designId: string) => {
    if (!user || !confirm('Are you sure you want to delete this design?')) return

    setDeleting(designId)

    try {
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
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setDeleting(null)
    }
  }

  const addToCart = async (designId: string) => {
    if (!user) return

    try {
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
          <h1 className="text-3xl font-bold">My Designs</h1>
          <p className="text-muted-foreground">View and manage your keychain designs</p>
        </div>

        {designs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No designs found</p>
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