import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import { SecurityMonitor } from '@/components/SecurityMonitor'
import { Button } from '@/components/ui/button'
import { Upload, Box, Sparkles } from 'lucide-react'

interface ReferenceDesign {
  id: string
  title: string
  thumb_url: string | null
  preview_url: string
}

const styleOptions = [
  { id: 'chibi', label: 'Chibi', icon: '🎨' },
  { id: 'anime', label: 'Anime', icon: '✨' },
  { id: 'minimalis', label: 'Minimalis', icon: '◼️' },
]

const Index = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [designs, setDesigns] = useState<ReferenceDesign[]>([])
  const [selectedStyle, setSelectedStyle] = useState<string>('chibi')

  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('v_reference_designs')
        .select('id, title, thumb_url, preview_url')
        .eq('is_featured', true)
        .limit(3)

      if (!error && data) {
        setDesigns(data)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {typeof window !== 'undefined' && <SecurityMonitor />}
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* AI Icon Left */}
            <div className="hidden md:flex w-24 h-24 rounded-2xl bg-[#d4e5ed] items-center justify-center shadow-lg">
              <Box className="w-12 h-12 text-primary" />
            </div>
            
            {/* Main Hero Content */}
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4">
                Abadikan Momentmu<br />dalam 3D!
              </h1>
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg"
                onClick={() => navigate('/create')}
              >
                <Upload className="w-5 h-5 mr-2" />
                Unggah Foto
              </Button>
            </div>
            
            {/* 3D Icon Right */}
            <div className="hidden md:flex w-24 h-24 rounded-2xl bg-[#d4e5ed] items-center justify-center shadow-lg">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-primary mb-6">Galeri</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Gallery Card 1 - Pink */}
            <div className="gallery-card aspect-[4/3] flex items-center justify-center p-6">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-2 rounded-lg overflow-hidden">
                  {designs[0]?.thumb_url ? (
                    <img src={designs[0].thumb_url} alt={designs[0]?.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/50 flex items-center justify-center">
                      <span className="text-4xl">👨‍👩‍👧</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Gallery Card 2 - Mint */}
            <div className="gallery-card mint aspect-[4/3] flex items-center justify-center p-6">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-2 rounded-lg overflow-hidden">
                  {designs[1]?.thumb_url ? (
                    <img src={designs[1].thumb_url} alt={designs[1]?.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/50 flex items-center justify-center">
                      <span className="text-4xl">🐱</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Gallery Card 3 - Teal with photo frame effect */}
            <div className="gallery-card teal aspect-[4/3] flex items-center justify-center p-6 relative">
              <div className="absolute inset-4 border-4 border-white/30 rounded-lg pointer-events-none" />
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-2 rounded-lg overflow-hidden">
                  {designs[2]?.thumb_url ? (
                    <img src={designs[2].thumb_url} alt={designs[2]?.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/50 flex items-center justify-center">
                      <span className="text-4xl">👨‍👩‍👦</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left - Featured Gallery Item */}
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">Galeri</h3>
              <div className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-sm">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center overflow-hidden">
                  <span className="text-2xl">🎨</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Mertaga Rejias Fohbap!</p>
                </div>
              </div>
            </div>
            
            {/* Right - Style Selector */}
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">Pilih Gaya Favoritmu!</h3>
              <div className="flex flex-wrap gap-3">
                {styleOptions.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`style-pill flex items-center gap-2 ${selectedStyle === style.id ? 'active' : ''}`}
                  >
                    <span>{style.icon}</span>
                    <span>{style.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              <span className="text-red-500">L</span>
              <span className="text-blue-500">U</span>
              <span className="text-yellow-500">M</span>
              <span className="text-teal-500">O</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href="#" className="hover:text-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="#" className="hover:text-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </a>
            <a href="#" className="hover:text-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
            </a>
            <a href="#" className="hover:text-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            </a>
          </div>
          
          <div className="text-sm text-muted-foreground text-right">
            <p>RererSad: 166622611</p>
            <p>📧 LUMO@LUMOLUMO.com</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Index