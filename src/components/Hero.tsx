import { Button } from "@/components/ui/hero-button"

export const Hero = () => {
  return (
    <section className="min-h-screen bg-gradient-primary flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center text-white">
        <h1 className="text-6xl md:text-8xl font-bold mb-4 tracking-tight">
          Taily
        </h1>
        <p className="text-xl md:text-2xl mb-8 opacity-90 font-light">
          Build it. See it. Own it.
        </p>
        
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-semibold mb-6">
            Create Your Perfect Keychain with AI
          </h2>
          <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto leading-relaxed">
            Experience the future of personalization with our interactive 3D platform. 
            Design keychains that tell your story through AI-powered recommendations and real-time visualization.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="hero-solid" 
            size="xl"
            className="font-semibold"
          >
            Start Creating
          </Button>
          <Button 
            variant="hero" 
            size="xl"
            className="font-semibold"
          >
            View Gallery
          </Button>
        </div>
      </div>
    </section>
  )
}