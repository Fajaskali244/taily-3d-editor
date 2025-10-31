import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import Navigation from '@/components/Navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Trash2 } from 'lucide-react'

interface Design {
  id: string
  name: string
  preview_url: string
  created_at: string
}

const MyDesigns = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchDesigns()
    } else {
      setLoading(false)
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
    if (!confirm('Are you sure you want to delete this design?')) return

    setDeleting(designId)

    try {
      const { error } = await supabase
        .from('designs')
        .delete()
        .eq('id', designId)
        .eq('user_id', user!.id)

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6 pt-24 text-center space-y-6">
          <h1 className="text-3xl font-bold">My Designs</h1>
          <p className="text-muted-foreground">Please sign in to view your designs</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Designs</h1>
          <p className="text-muted-foreground mt-2">View and manage your 3D models</p>
        </div>

        {designs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No designs found</p>
              <Button onClick={() => navigate('/create')}>
                Create Your First Model
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
                  {design.preview_url && (
                    <div className="mb-4 aspect-square bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={design.preview_url} 
                        alt={design.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
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