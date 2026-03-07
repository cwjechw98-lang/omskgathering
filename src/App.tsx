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
  const [gameMode, setGameMode] = useState<'ai' | 'local'>('ai');
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  const startGame = (mode: 'ai' | 'local') => {
    setGameMode(mode);
    if (!hasSeenIntro && mode === 'ai') {
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
            <GameBoard mode={gameMode} onBack={() => setScreen('menu')} />
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
