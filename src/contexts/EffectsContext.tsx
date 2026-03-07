import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface DamageNumber {
  id: number;
  value: number;
  x: number;
  y: number;
  type: 'damage' | 'heal' | 'buff';
}

interface TargetingLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface EffectsContextType {
  damageNumbers: DamageNumber[];
  targetingLine: TargetingLine | null;
  showLowHealthWarning: boolean;
  showDamageNumber: (
    value: number,
    x: number,
    y: number,
    type?: 'damage' | 'heal' | 'buff'
  ) => void;
  setTargetingLine: (line: TargetingLine | null) => void;
  setShowLowHealthWarning: (show: boolean) => void;
}

const EffectsContext = createContext<EffectsContextType | undefined>(undefined);

export function EffectsProvider({ children }: { children: ReactNode }) {
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [targetingLine, setTargetingLineState] = useState<TargetingLine | null>(null);
  const [showLowHealthWarning, setShowLowHealthWarning] = useState(false);

  const showDamageNumber = useCallback(
    (value: number, x: number, y: number, type: 'damage' | 'heal' | 'buff' = 'damage') => {
      const id = Date.now() + Math.random();
      setDamageNumbers((prev) => [...prev, { id, value, x, y, type }]);
      setTimeout(() => {
        setDamageNumbers((prev) => prev.filter((dn) => dn.id !== id));
      }, 800);
    },
    []
  );

  const setTargetingLine = useCallback((line: TargetingLine | null) => {
    setTargetingLineState(line);
  }, []);

  return (
    <EffectsContext.Provider
      value={{
        damageNumbers,
        targetingLine,
        showLowHealthWarning,
        showDamageNumber,
        setTargetingLine,
        setShowLowHealthWarning,
      }}
    >
      {children}
    </EffectsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEffects() {
  const context = useContext(EffectsContext);
  if (context === undefined) {
    throw new Error('useEffects must be used within an EffectsProvider');
  }
  return context;
}
