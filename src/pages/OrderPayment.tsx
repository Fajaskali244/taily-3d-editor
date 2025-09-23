import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Upload, Copy, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { BANK_CONFIG } from '@/lib/payments'

export default function OrderPayment() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [order, setOrder] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !user) return

    const loadOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, grand_total, payment_status, created_at')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error
        if (!data) {
          toast({
            title: "Order not found",
            description: "This order doesn't exist or you don't have access to it.",
            variant: "destructive"
          })
          navigate('/')
          return
        }

        setOrder(data)
      } catch (error: any) {
        console.error('Error loading order:', error)
        toast({
          title: "Error loading order",
          description: error.message,
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [id, user, toast, navigate])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard",
        description: "Bank account number copied successfully",
      })
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast({
        title: "Copied to clipboard",
        description: "Bank account number copied successfully",
      })
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !order || !user) return

    setUploading(true)
    try {
      // Create file path: userId/orderId/timestamp-filename
      const timestamp = Date.now()
      const path = `${user.id}/${order.id}/${timestamp}-${file.name}`

      // Upload to private bucket
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(path, file, { upsert: false })

      if (uploadError) throw uploadError

      // Get signed URL for the uploaded file (since bucket is private)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('payment-receipts')
        .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 days

      if (signedUrlError) throw signedUrlError

      // Save receipt record
      const { error: insertError } = await supabase
        .from('payment_receipts')
        .insert({
          order_id: order.id,
          user_id: user.id,
          image_url: signedUrlData.signedUrl,
          note: note.trim() || null
        })

      if (insertError) throw insertError

      toast({
        title: "Receipt uploaded successfully",
        description: "We will verify your payment and update the order status.",
      })

      // Clear form
      setNote('')
      e.target.value = ''

    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Order not found</p>
        </div>
      </div>
    )
  }

  const isPaid = order.payment_status === 'paid'

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {isPaid && <CheckCircle className="h-5 w-5 text-green-600" />}
                <span>Order Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono text-sm">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold text-lg">
                  Rp {Number(order.grand_total).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isPaid 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isPaid ? 'Paid' : 'Awaiting Payment'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(order.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </CardContent>
          </Card>

          {!isPaid && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Payment Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Bank:</Label>
                    <p className="font-medium">{BANK_CONFIG.name}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Account Number:</Label>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono bg-muted px-3 py-2 rounded flex-1">
                        {BANK_CONFIG.account}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(BANK_CONFIG.account)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Account Holder:</Label>
                    <p className="font-medium">{BANK_CONFIG.holder}</p>
                  </div>

                  <div className="pt-4">
                    <img 
                      src={BANK_CONFIG.qrUrl} 
                      alt="QR Code for payment" 
                      className="w-48 h-48 object-contain mx-auto border rounded"
                    />
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      Scan QR code or transfer manually
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload Payment Receipt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="receipt">Receipt Image</Label>
                    <input
                      id="receipt"
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={uploading}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="note">Optional Note</Label>
                    <Textarea
                      id="note"
                      placeholder="Add any additional information..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Please upload a clear image of your payment receipt. 
                    We will verify your payment and update the order status within 24 hours.
                  </p>

                  {uploading && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Upload className="h-4 w-4 animate-pulse" />
                      <span>Uploading receipt...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {isPaid && (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Payment Confirmed!</h3>
                <p className="text-muted-foreground mb-4">
                  Thank you for your payment. We're preparing your order for shipment.
                </p>
                <Button onClick={() => navigate('/')}>
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}