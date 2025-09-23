import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Loader2, RefreshCw } from 'lucide-react'

interface Order {
  id: string
  created_at: string
  user_id: string
  payment_status: string
  fulfillment_status: string
  grand_total: number
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const { toast } = useToast()

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, user_id, payment_status, fulfillment_status, grand_total')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setOrders(data || [])
    } catch (error: any) {
      console.error('Error loading orders:', error)
      toast({
        title: "Error loading orders",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const markAsPaid = async (orderId: string) => {
    setMarkingPaid(orderId)
    try {
      const response = await supabase.functions.invoke('admin-mark-paid', {
        body: { orderId }
      })

      if (response.error) throw response.error

      toast({
        title: "Order marked as paid",
        description: "The order status has been updated successfully.",
      })

      // Refresh orders
      await loadOrders()
    } catch (error: any) {
      console.error('Error marking order as paid:', error)
      toast({
        title: "Error updating order",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setMarkingPaid(null)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default'
      case 'pending': return 'secondary'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Orders</h1>
            <p className="text-muted-foreground">Manage customer orders and payments</p>
          </div>
          <Button variant="outline" onClick={loadOrders} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="font-mono text-xs">{order.id}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {new Date(order.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-semibold">
                        Rp {Number(order.grand_total).toLocaleString('id-ID')}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <Badge variant={getStatusBadgeVariant(order.payment_status)}>
                        {order.payment_status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Actions</p>
                      {order.payment_status === 'pending' ? (
                        <Button 
                          size="sm"
                          onClick={() => markAsPaid(order.id)}
                          disabled={markingPaid === order.id}
                          className="w-full"
                        >
                          {markingPaid === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Mark Paid
                        </Button>
                      ) : (
                        <Badge variant="outline" className="w-full justify-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}