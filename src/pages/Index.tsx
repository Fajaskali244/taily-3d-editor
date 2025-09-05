import { useState, useEffect } from "react"
import { Hero } from "@/components/Hero"
import { Customizer } from "@/components/Customizer"
import { GenderPreferenceModal } from "@/components/GenderPreferenceModal"

const Index = () => {
  const [genderPreference, setGenderPreference] = useState<'him' | 'her'>('her')

  const handlePreferenceSelect = (preference: 'him' | 'her') => {
    setGenderPreference(preference)
    
    // Apply theme class to body
    if (preference === 'him') {
      document.body.classList.add('masculine-theme')
    } else {
      document.body.classList.remove('masculine-theme')
    }
  }

  // Check for saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('gender-preference')
    if (saved) {
      handlePreferenceSelect(saved as 'him' | 'her')
    }
  }, [])

  return (
    <div className="min-h-screen">
      <GenderPreferenceModal onPreferenceSelect={handlePreferenceSelect} />
      <Hero genderPreference={genderPreference} />
      <Customizer genderPreference={genderPreference} />
    </div>
  );
};

export default Index;
