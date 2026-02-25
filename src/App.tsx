import { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { GameBoard } from './components/GameBoard';
import { StoryIntro } from './components/StoryIntro';

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
    return <StoryIntro onComplete={onIntroComplete} />;
  }

  if (screen === 'game') {
    return <GameBoard mode={gameMode} onBack={() => setScreen('menu')} />;
  }

  return <MainMenu onStartGame={startGame} />;
}

export default App;
