import { useState, useCallback, useEffect, useRef } from 'react';
import { AI_CHARACTER } from '../../data/lore';

export type GameMessage = {
  id: number;
  type: 'ai' | 'narrative' | 'death' | 'action' | 'story' | 'system';
  text: string;
  emoji: string;
  createdAt: number;
  duration: number;
};

let msgIdCounter = 0;

// eslint-disable-next-line react-refresh/only-export-components
export function useMessageFeed() {
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const addMessage = useCallback(
    (type: GameMessage['type'], text: string, emoji: string, duration = 5000) => {
      const id = ++msgIdCounter;
      const now = Date.now();
      const msg: GameMessage = { id, type, text, emoji, createdAt: now, duration };
      setMessages((prev) => [...prev.slice(-5), msg]);
    },
    []
  );

  useEffect(() => {
    if (messages.length === 0) return;
    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      const now = Date.now();
      setMessages((prev) => prev.filter((m) => now - m.createdAt < m.duration));
    }, 200);
    return () => clearInterval(interval);
  }, [messages.length]);

  const clear = useCallback(() => setMessages([]), []);

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, addMessage, clear, dismiss };
}

export function MessageFeed({
  messages,
  onDismiss,
  compact = false,
}: {
  messages: GameMessage[];
  onDismiss?: (id: number) => void;
  compact?: boolean;
}) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (messages.length === 0) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div
      className={`absolute z-40 pointer-events-none ${compact ? 'left-2 right-2' : 'left-3'}`}
      style={{
        top: compact ? 'clamp(52px, 6.8vh, 76px)' : 'clamp(55px, 7vh, 80px)',
        width: compact ? 'auto' : 'clamp(260px, 22vw, 380px)',
        maxHeight: compact ? 'clamp(136px, 24vh, 200px)' : 'clamp(200px, 35vh, 400px)',
      }}
    >
      <div
        ref={feedRef}
        className="flex flex-col gap-2 overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {messages.map((msg) => {
          const age = nowMs - msg.createdAt;
          const fadeStart = msg.duration * 0.6;
          const opacity =
            age > fadeStart ? Math.max(0, 1 - (age - fadeStart) / (msg.duration * 0.4)) : 1;
          const isAI = msg.type === 'ai';

          return (
            <div
              key={msg.id}
              className={`rounded-xl shadow-2xl pointer-events-auto transition-all duration-500 ${
                isAI
                  ? 'bg-gradient-to-r from-[#1a1508]/95 via-[#12101a]/95 to-[#1a1508]/95 border border-[#c9a84c]/40'
                  : msg.type === 'death'
                    ? 'bg-gradient-to-r from-[#1a0808]/95 to-[#12101a]/95 border border-red-500/30'
                    : msg.type === 'story'
                      ? 'bg-gradient-to-r from-[#081a18]/95 to-[#12101a]/95 border border-cyan-500/20'
                      : msg.type === 'action'
                        ? 'bg-[#12101a]/90 border border-[#c9a84c]/20'
                        : 'bg-[#12101a]/90 border border-gray-700/30'
              }`}
              style={{
                opacity,
                transform: `translateX(${opacity < 0.5 ? -20 * (1 - opacity * 2) : 0}px)`,
                padding: 'clamp(8px, 1vw, 14px)',
              }}
            >
              {isAI && (
                <div className="flex items-start gap-2">
                  <div className="shrink-0 flex flex-col items-center">
                    <span style={{ fontSize: 'clamp(24px, 2.5vw, 36px)' }}>
                      {AI_CHARACTER.avatarEmoji}
                    </span>
                    <span
                      className="text-[#c9a84c] font-heading font-bold mt-0.5"
                      style={{ fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      {AI_CHARACTER.name}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-gray-200 font-body leading-relaxed italic"
                      style={{ fontSize: 'clamp(12px, 1.15vw, 16px)' }}
                    >
                      &laquo;{msg.text}&raquo;
                    </p>
                  </div>
                </div>
              )}

              {!isAI && (
                <div className="flex items-start gap-2">
                  <span style={{ fontSize: 'clamp(16px, 1.8vw, 24px)' }}>{msg.emoji}</span>
                  <p
                    className={`font-body leading-relaxed flex-1 ${
                      msg.type === 'death'
                        ? 'text-red-300 italic'
                        : msg.type === 'story'
                          ? 'text-cyan-200 italic'
                          : msg.type === 'action'
                            ? 'text-[#f0d68a]'
                            : 'text-gray-300'
                    }`}
                    style={{ fontSize: 'clamp(11px, 1.1vw, 15px)' }}
                  >
                    {msg.text}
                  </p>
                </div>
              )}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(msg.id)}
                  className="absolute top-1 right-1 text-gray-600 hover:text-white text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-700/50 transition pointer-events-auto"
                  title="Закрыть"
                >
                  &#10005;
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
