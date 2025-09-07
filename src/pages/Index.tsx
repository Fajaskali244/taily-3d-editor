import { useState, useEffect } from "react"
import { Hero } from "@/components/Hero"
import { Customizer } from "@/components/Customizer"
import { GenderPreferenceModal } from "@/components/GenderPreferenceModal"
import Navigation from "@/components/Navigation"

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

  // Remove saved preference check - always start fresh
  // No useEffect needed since we want modal to show every time

  return (
    <div className="min-h-screen">
      <Navigation />
      <GenderPreferenceModal onPreferenceSelect={handlePreferenceSelect} />
      <Hero genderPreference={genderPreference} />
      <Customizer genderPreference={genderPreference} />
    </div>
  );
};

export default Index;
