import React, { useEffect, useRef, useState } from 'react';

interface CardAnimationProps {
  cardName: string;
  cardEmoji: string;
  cardColor: string;
  onDone: () => void;
}

// Цвета по стихиям
const colorMap: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  black: '#a855f7',
  white: '#fbbf24',
  colorless: '#9ca3af',
  land: '#78716c'
};

// ===== РОЗЫГРЫШ КАРТЫ: 0.3-0.5 сек с overshoot =====
export const CardPlayAnimation: React.FC<CardAnimationProps> = ({
  cardName,
  cardEmoji,
  cardColor,
  onDone
}) => {
  const mountedRef = useRef(true);
  const [phase, setPhase] = useState<'show' | 'hide'>('show');
  const color = colorMap[cardColor] || colorMap.colorless;

  useEffect(() => {
    mountedRef.current = true;
    
    // Показываем 0.5 сек (карта летит на поле 0.4с + 0.1с пауза)
    const hideTimer = setTimeout(() => {
      if (mountedRef.current) setPhase('hide');
    }, 500);
    
    // Полностью убираем через 0.7 сек
    const doneTimer = setTimeout(() => {
      if (mountedRef.current) onDone();
    }, 700);

    // Клик/тап/клавиша — мгновенное закрытие
    const dismiss = () => {
      if (mountedRef.current) onDone();
    };
    
    window.addEventListener('click', dismiss);
    window.addEventListener('keydown', dismiss);
    window.addEventListener('touchstart', dismiss);

    return () => {
      mountedRef.current = false;
      clearTimeout(hideTimer);
      clearTimeout(doneTimer);
      window.removeEventListener('click', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('touchstart', dismiss);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        cursor: 'pointer',
        backgroundColor: phase === 'show' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
        transition: 'background-color 0.2s ease-out'
      }}
    >
      {/* Карта с overshoot анимацией */}
      <div
        className="card-play-animation"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          opacity: phase === 'show' ? 1 : 0,
          transition: 'opacity 0.15s ease-in'
        }}
      >
        {/* Emoji карты */}
        <div
          style={{
            fontSize: '72px',
            filter: `drop-shadow(0 0 20px ${color})`,
            animation: 'emojiPulse 0.3s ease-out'
          }}
        >
          {cardEmoji}
        </div>
        
        {/* Название */}
        <div
          style={{
            fontSize: '28px',
            fontFamily: 'Cinzel, serif',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
            textAlign: 'center',
            maxWidth: '300px'
          }}
        >
          ⚡ {cardName}
        </div>

        {/* Частицы — быстрый взрыв 0.3с */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * 360;
            const distance = 80 + Math.random() * 60;
            const x = Math.cos(angle * Math.PI / 180) * distance;
            const y = Math.sin(angle * Math.PI / 180) * distance;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  boxShadow: `0 0 10px ${color}`,
                  transform: phase === 'show' 
                    ? `translate(${x}px, ${y}px) scale(1)` 
                    : 'translate(0, 0) scale(0)',
                  opacity: phase === 'show' ? 0 : 1,
                  transition: `all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.01}s`
                }}
              />
            );
          })}
        </div>
      </div>
      
      {/* Подсказка */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
          opacity: phase === 'show' ? 1 : 0,
          transition: 'opacity 0.1s'
        }}
      >
        tap to skip
      </div>
    </div>
  );
};

// ===== СМЕРТЬ КАРТЫ: 0.2с партиклы + 0.3с растворение =====
export const CardDeathAnimation: React.FC<CardAnimationProps> = ({
  cardName,
  cardEmoji,
  onDone
}) => {
  const mountedRef = useRef(true);
  const [phase, setPhase] = useState<'particles' | 'dissolve' | 'done'>('particles');

  useEffect(() => {
    mountedRef.current = true;
    
    // Фаза 1: партиклы 0.2с
    const dissolveTimer = setTimeout(() => {
      if (mountedRef.current) setPhase('dissolve');
    }, 200);
    
    // Фаза 2: растворение 0.3с, итого 0.5с
    const doneTimer = setTimeout(() => {
      if (mountedRef.current) onDone();
    }, 500);

    const dismiss = () => {
      if (mountedRef.current) onDone();
    };
    
    window.addEventListener('click', dismiss);
    window.addEventListener('keydown', dismiss);
    window.addEventListener('touchstart', dismiss);

    return () => {
      mountedRef.current = false;
      clearTimeout(dissolveTimer);
      clearTimeout(doneTimer);
      window.removeEventListener('click', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('touchstart', dismiss);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        cursor: 'pointer',
        backgroundColor: phase !== 'done' ? 'rgba(50,0,0,0.5)' : 'rgba(0,0,0,0)',
        transition: 'background-color 0.15s ease-in'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          opacity: phase === 'dissolve' ? 0 : 1,
          transform: phase === 'dissolve' ? 'scale(0.5) rotate(10deg)' : 'scale(1)',
          filter: phase === 'dissolve' ? 'grayscale(1) brightness(0.5)' : 'none',
          transition: 'all 0.3s ease-in'
        }}
      >
        {/* Emoji */}
        <div style={{ fontSize: '56px', filter: 'grayscale(0.5)' }}>
          {cardEmoji}
        </div>
        
        {/* Название */}
        <div
          style={{
            fontSize: '22px',
            fontFamily: 'Cinzel, serif',
            color: '#ff4444',
            textShadow: '0 0 15px rgba(255,0,0,0.8)'
          }}
        >
          💀 {cardName}
        </div>
      </div>

      {/* Частицы смерти — взрыв 0.2с */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 15 }).map((_, i) => {
          const angle = (i / 15) * 360;
          const distance = 60 + Math.random() * 40;
          const x = Math.cos(angle * Math.PI / 180) * distance;
          const y = Math.sin(angle * Math.PI / 180) * distance - 20; // Вверх
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#ff4444',
                boxShadow: '0 0 8px #ff4444',
                transform: phase === 'particles' 
                  ? `translate(${x}px, ${y}px)` 
                  : 'translate(0, 0)',
                opacity: phase === 'particles' ? 1 : 0,
                transition: `all 0.2s ease-out ${i * 0.01}s`
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// CardDamageEffect and TurnTransition removed - not currently used
// Can be re-added when combat animations are implemented
