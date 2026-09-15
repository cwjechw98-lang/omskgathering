import { useState } from 'react';
import { TooltipProvider } from './components/ui/tooltip';
import { EffectsProvider } from './contexts/EffectsContext';
import { EffectsLayer } from './components/EffectsLayer';
import { MainMenu } from './components/MainMenu';
import { GameBoard } from './components/GameBoard';
import { StoryIntro } from './components/StoryIntro';
import { ErrorBoundary } from './components/ErrorBoundary';

type Screen = 'menu' | 'intro' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  const startGame = () => {
    if (!hasSeenIntro) {
      setScreen('intro');
    } else {
      setScreen('game');
    }
  };

  const onIntroComplete = () => {
    setHasSeenIntro(true);
    setScreen('game');
  };

  if (screen === 'intro') {
    return (
      <EffectsProvider>
        <StoryIntro onComplete={onIntroComplete} />
      </EffectsProvider>
    );
  }

  if (screen === 'game') {
    return (
      <ErrorBoundary>
        <TooltipProvider>
          <EffectsProvider>
            <GameBoard mode="ai" onBack={() => setScreen('menu')} />
            <EffectsLayer />
          </EffectsProvider>
        </TooltipProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <EffectsProvider>
          <MainMenu onStartGame={startGame} />
          <EffectsLayer />
        </EffectsProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
