import React, { useState } from 'react';
import WelcomeScreen from './onboarding/WelcomeScreen.jsx';
import SeedScreen from './onboarding/SeedScreen.jsx';
import SuccessScreen from './onboarding/SuccessScreen.jsx';

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  return (
    <div className="grid">
      {step === 0 && <WelcomeScreen onNext={() => setStep(1)} />}
      {step === 1 && <SeedScreen onFinish={() => setStep(2)} />}
      {step === 2 && <SuccessScreen onDone={onDone} />}
    </div>
  );
}

