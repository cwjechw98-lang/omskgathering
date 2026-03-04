import { useEffects } from '../contexts/EffectsContext';

/**
 * Effects Layer — renders all visual effects outside game grid
 * This prevents effects from affecting layout
 */
export function EffectsLayer() {
  const { damageNumbers, targetingLine, showLowHealthWarning } = useEffects();

  return (
    <div className="effects-layer" aria-hidden="true">
      {/* Damage Numbers */}
      {damageNumbers.map((dn) => (
        <div
          key={dn.id}
          className={`damage-number ${dn.type === 'heal' ? 'heal' : dn.type === 'buff' ? 'buff' : ''}`}
          style={{
            left: dn.x,
            top: dn.y,
          }}
        >
          {dn.type === 'heal' ? '+' : ''}{dn.value}
        </div>
      ))}

      {/* Targeting Line */}
      {targetingLine && (
        <svg
          className="pointer-events-none"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
          }}
        >
          <line
            x1={targetingLine.startX}
            y1={targetingLine.startY}
            x2={targetingLine.endX}
            y2={targetingLine.endY}
            stroke="url(#targetingGradient)"
            strokeWidth="3"
            strokeDasharray="8,4"
            className="targeting-line"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(255,100,0,0.8))',
            }}
          />
          <defs>
            <linearGradient id="targetingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,100,0,0)" />
              <stop offset="50%" stopColor="rgba(255,100,0,0.9)" />
              <stop offset="100%" stopColor="rgba(255,100,0,0)" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Low Health Warning */}
      {showLowHealthWarning && (
        <div className="low-health-overlay" />
      )}
    </div>
  );
}
