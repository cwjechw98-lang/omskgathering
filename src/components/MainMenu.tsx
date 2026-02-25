import { useState, useRef, useEffect, useCallback } from 'react';
import { ALL_CARDS } from '../data/cards';
import { WORLD_LORE, AI_CHARACTER } from '../data/lore';
import { CardInstance } from '../game/types';
import { generateUid, getEffectiveAttack, getEffectiveHealth } from '../game/engine';
import { ParticleCanvas } from './effects/ParticleCanvas';
import { Torch } from './effects/Torch';
import { getCardCoverSources, handleImageErrorWithFallback } from '../utils/cardImages';
// SparkleLoadLine removed

interface MainMenuProps {
  onStartGame: (mode: 'ai' | 'local') => void;
}

const KW_NAMES: Record<string, string> = {
  haste: '⚡ Ускорение', defender: '🛡️ Защитник', flying: '🕊️ Полёт',
  trample: '🦶 Растоптать', lifelink: '💖 Привязка к жизни', deathtouch: '☠️ Смерт. касание',
  vigilance: '👁️ Бдительность (Защитник, который атакует)', first_strike: '⚡ Первый удар',
  hexproof: '🔒 Порчеустойчивость', unblockable: '👻 Неблокируемый',
};

const COLOR_BG: Record<string, string> = {
  white: 'card-art-white', blue: 'card-art-blue', black: 'card-art-black',
  red: 'card-art-red', green: 'card-art-green', colorless: 'card-art-colorless',
};

export function MainMenu({ onStartGame }: MainMenuProps) {
  const [screen, setScreen] = useState<'menu' | 'cards' | 'rules' | 'lore'>('menu');
  const [liteFx, setLiteFx] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const lowCores = (navigator.hardwareConcurrency || 4) <= 4;
    const lowMemory = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8) <= 4;
    setLiteFx(prefersReduced || lowCores || lowMemory);
  }, []);

  if (screen === 'cards') return <CardCollection onBack={() => setScreen('menu')} />;
  if (screen === 'rules') return <Rules onBack={() => setScreen('menu')} />;
  if (screen === 'lore') return <LoreScreen onBack={() => setScreen('menu')} />;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] flex flex-col items-center justify-center py-8 px-4 relative overflow-y-auto">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(30,15,0,0.5)_0%,_rgba(5,5,10,1)_70%)]" />
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(201,168,76,0.5) 35px, rgba(201,168,76,0.5) 36px)' }} />
      <ParticleCanvas type="embers" density={liteFx ? 24 : 40} className="fixed inset-0" interactive={false} />
      <div className="fixed left-[10%] top-[30%] w-40 h-40 rounded-full fire-light pointer-events-none" />
      <div className="fixed right-[10%] top-[30%] w-40 h-40 rounded-full fire-light pointer-events-none" style={{ animationDelay: '1s' }} />

      {[
        { emoji: '🐦', x: '8%', y: '15%', size: '3rem', dur: '8s', delay: '0s' },
        { emoji: '❄️', x: '85%', y: '20%', size: '2.5rem', dur: '10s', delay: '2s' },
        { emoji: '🏭', x: '12%', y: '75%', size: '2.8rem', dur: '12s', delay: '4s' },
        { emoji: '👻', x: '90%', y: '70%', size: '2.2rem', dur: '9s', delay: '1s' },
        { emoji: '🐉', x: '75%', y: '85%', size: '3.5rem', dur: '11s', delay: '3s' },
        { emoji: '🧙‍♀️', x: '20%', y: '88%', size: '2rem', dur: '7s', delay: '5s' },
      ].map((obj, i) => (
        <div key={i} className="fixed drift-slow pointer-events-none"
          style={{ left: obj.x, top: obj.y, fontSize: obj.size, opacity: 0.06, '--dur': obj.dur, '--delay': obj.delay } as React.CSSProperties}>
          {obj.emoji}
        </div>
      ))}

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex items-center justify-center mb-6">
          <div className="relative -mr-4 mt-8"><Torch side="left" /></div>
          <div className="text-center px-8 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border border-[#c9a84c]/10"
                style={{ animation: 'runeRotate 30s linear infinite' }}>
                {['🜁', '🜂', '🜃', '🜄', '⛧', '☉', '☽', '♆'].map((r, i) => (
                  <span key={i} className="absolute text-[#c9a84c]/20 text-lg"
                    style={{ left: `${50 + 45 * Math.cos(i * Math.PI / 4)}%`, top: `${50 + 45 * Math.sin(i * Math.PI / 4)}%`, transform: 'translate(-50%, -50%)' }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <div className="inline-block p-3 rounded-full border border-[#c9a84c]/30 bg-black/60 backdrop-blur-sm">
                <span className="text-5xl md:text-6xl emoji-float inline-block">🃏</span>
              </div>
            </div>
            <h1 className="font-title text-6xl md:text-8xl lg:text-9xl tracking-wider text-gold-light title-glow select-none">OMSK</h1>
            <div className="flex items-center gap-4 justify-center my-2">
              <div className="h-px w-12 md:w-20 bg-gradient-to-r from-transparent to-[#c9a84c]/50" />
              <span className="font-heading text-base md:text-xl tracking-[0.4em] subtitle-shimmer select-none">THE GATHERING</span>
              <div className="h-px w-12 md:w-20 bg-gradient-to-l from-transparent to-[#c9a84c]/50" />
            </div>
            <p className="font-body text-[#8a7a5a] mt-3 text-sm md:text-base max-w-md mx-auto italic leading-relaxed">
              «Под слоем асфальта, под недостроенным метро,<br />пульсирует древняя сила...»
            </p>
          </div>
          <div className="relative -ml-4 mt-8"><Torch side="right" /></div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button onClick={() => onStartGame('ai')}
            className="btn-mythic w-full py-4 px-6 bg-gradient-to-r from-[#5c1a0a] via-[#8b2a1a] to-[#5c1a0a] hover:from-[#7a2a1a] hover:via-[#b03020] hover:to-[#7a2a1a] text-white rounded-xl font-heading text-lg tracking-wide border border-[#c9a84c]/40 shadow-lg shadow-red-900/40 hover:shadow-red-600/50 hover:scale-[1.03] transition-all duration-300 flex items-center justify-center gap-4 relative z-10">
            <span className="text-3xl emoji-float inline-block" style={{ animationDelay: '0.5s' }}>🗿</span>
            <div className="text-left">
              <div className="font-bold text-lg">Против Хранителя</div>
              <div className="text-xs text-red-300/70 font-body">Сразитесь с Древним Духом Города</div>
            </div>
          </button>
          <button onClick={() => onStartGame('local')}
            className="w-full py-3 px-6 bg-gradient-to-r from-[#0a2a4c] via-[#1a4070] to-[#0a2a4c] hover:from-[#1a3a6a] hover:via-[#2a5090] hover:to-[#1a3a6a] text-white rounded-xl font-heading tracking-wide border border-[#c9a84c]/25 shadow-lg hover:shadow-blue-700/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 relative z-10">
            <span className="text-2xl">👥</span> Два Игрока
          </button>
          <div className="h-px bg-gradient-to-r from-transparent via-[#c9a84c]/20 to-transparent my-1" />
          <button onClick={() => setScreen('lore')}
            className="w-full py-3 px-6 bg-gradient-to-r from-[#2a1a04] via-[#4a3010] to-[#2a1a04] hover:from-[#4a3010] hover:via-[#6a4a1a] hover:to-[#4a3010] text-[#f0d68a] rounded-xl font-heading tracking-wide border border-[#c9a84c]/25 shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 relative z-10">
            📜 Легенда Омска
          </button>
          <button onClick={() => setScreen('cards')}
            className="w-full py-3 px-6 bg-gradient-to-r from-[#1a0a2a] via-[#2a1a4a] to-[#1a0a2a] hover:from-[#2a1a4a] hover:via-[#4a2a6a] hover:to-[#2a1a4a] text-purple-200 rounded-xl font-heading tracking-wide border border-[#c9a84c]/20 shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 relative z-10">
            📖 Коллекция <span className="font-body text-xs text-purple-400/60 ml-1">({ALL_CARDS.filter(c => c.id !== 'chinovnik').length} карт)</span>
          </button>
          <button onClick={() => setScreen('rules')}
            className="w-full py-2.5 px-6 bg-[#12121e] hover:bg-[#1e1e30] text-gray-400 rounded-xl font-heading text-sm tracking-wide border border-gray-700/40 hover:border-[#c9a84c]/30 shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 relative z-10">
            📋 Правила Игры
          </button>
        </div>

        <div className="mt-6 text-center relative z-10">
          <p className="font-body text-[#5a4a30] text-xs italic">«Ты не можешь покинуть Омск. Никто не может.»</p>
          <p className="font-heading text-[#3a3020] text-[10px] mt-1 tracking-widest">OMSK: THE GATHERING © MMXXVI</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// LORE SCREEN
// ═══════════════════════════════════════
function LoreScreen({ onBack }: { onBack: () => void }) {
  const [ch, setCh] = useState(0);
  const [liteFx, setLiteFx] = useState(false);
  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const lowCores = (navigator.hardwareConcurrency || 4) <= 4;
    const lowMemory = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8) <= 4;
    setLiteFx(prefersReduced || lowCores || lowMemory);
  }, []);
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] relative overflow-y-auto">
      <ParticleCanvas type="magic" density={liteFx ? 12 : 22} className="fixed inset-0" interactive={false} />
      <div className="max-w-3xl mx-auto p-4 pb-12 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-[#8a7a5a] hover:text-[#f0d68a] font-heading text-sm transition">← Назад</button>
          <h2 className="font-title text-2xl text-gold-light title-glow">📜 Легенда Омска</h2>
          <div className="w-16" />
        </div>

        <div className="bg-gradient-to-r from-[#1a1508]/80 to-[#0f0f18]/80 rounded-xl border border-[#c9a84c]/20 p-5 mb-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="text-5xl shrink-0 emoji-float inline-block">{AI_CHARACTER.avatarEmoji}</div>
            <div>
              <h3 className="font-heading text-lg text-[#f0d68a]">{AI_CHARACTER.name}</h3>
              <p className="text-xs text-[#8a7a5a] mb-2 font-body">{AI_CHARACTER.title}</p>
              <p className="text-sm text-gray-300 leading-relaxed font-body">{AI_CHARACTER.backstory}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {WORLD_LORE.map((c, i) => (
            <button key={i} onClick={() => setCh(i)}
              className={`px-3 py-1.5 rounded-lg font-heading text-xs transition-all ${
                ch === i ? 'bg-[#5a4010] text-[#f0d68a] border border-[#c9a84c]/50' : 'bg-[#1a1a2a] text-gray-500 hover:text-gray-300 border border-gray-800'
              }`}>
              {c.emoji} {i === 0 ? 'Пролог' : i === WORLD_LORE.length - 1 ? 'Эпилог' : `Глава ${i}`}
            </button>
          ))}
        </div>

        <div className="bg-[#0f0f18]/90 rounded-xl border border-[#c9a84c]/15 overflow-hidden backdrop-blur-sm">
          <div className="bg-gradient-to-r from-[#2a1a08]/60 to-transparent px-5 py-3 border-b border-[#c9a84c]/15">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{WORLD_LORE[ch].emoji}</span>
              <h3 className="font-heading text-lg text-[#f0d68a]">{WORLD_LORE[ch].title}</h3>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="font-body text-gray-300 text-sm leading-relaxed whitespace-pre-line">{WORLD_LORE[ch].text}</p>
          </div>
          <div className="flex justify-between px-5 py-3 border-t border-[#c9a84c]/10">
            <button onClick={() => setCh(Math.max(0, ch - 1))} disabled={ch === 0}
              className={`font-heading text-xs px-3 py-1 rounded transition ${ch === 0 ? 'text-gray-700' : 'text-[#c9a84c] hover:bg-[#1a1508]'}`}>← Назад</button>
            <span className="text-gray-600 text-xs font-heading">{ch + 1} / {WORLD_LORE.length}</span>
            <button onClick={() => setCh(Math.min(WORLD_LORE.length - 1, ch + 1))} disabled={ch === WORLD_LORE.length - 1}
              className={`font-heading text-xs px-3 py-1 rounded transition ${ch === WORLD_LORE.length - 1 ? 'text-gray-700' : 'text-[#c9a84c] hover:bg-[#1a1508]'}`}>Далее →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// CARD COLLECTION — full-height scroll with sparkle line
// ═══════════════════════════════════════
function CardCollection({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayCards = ALL_CARDS.filter(c => c.id !== 'chinovnik');
  const filtered = filter === 'all' ? displayCards : displayCards.filter(c => c.type === filter || c.color === filter);
  const detail = selectedCard ? displayCards.find(c => c.id === selectedCard) : null;
  const detailArt = detail ? getCardCoverSources(detail) : null;
  const hasMore = visibleCount < filtered.length;
  const [liteFx, setLiteFx] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const lowCores = (navigator.hardwareConcurrency || 4) <= 4;
    const lowMemory = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8) <= 4;
    setLiteFx(prefersReduced || lowCores || lowMemory);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount(prev => Math.min(prev + 8, filtered.length));
    }
  }, [filtered.length]);

  useEffect(() => { setVisibleCount(12); }, [filter]);

  return (
    <div className="h-[100dvh] bg-[#0a0a0f] flex flex-col relative overflow-hidden">
      <ParticleCanvas type="magic" density={liteFx ? 8 : 12} className="pointer-events-none" interactive={false} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-20 border-b border-[#c9a84c]/15 shrink-0">
        <button onClick={onBack} className="text-[#8a7a5a] hover:text-[#f0d68a] font-heading text-sm transition">← Назад</button>
        <h2 className="font-title text-xl text-gold-light">📖 Коллекция ({filtered.length})</h2>
        <div className="w-16" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-4 py-2 justify-center bg-black/40 border-b border-[#c9a84c]/10 shrink-0 z-10">
        {[
          { key: 'all', label: '🃏 Все' }, { key: 'creature', label: '⚔️ Существа' },
          { key: 'spell', label: '✨ Заклинания' }, { key: 'enchantment', label: '🔮 Наложения' },
          { key: 'land', label: '🏔️ Земли' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg font-heading text-xs transition-all border ${
              filter === f.key ? 'bg-[#5a4010] text-[#f0d68a] border-[#c9a84c]/50' : 'bg-[#1a1a2a] text-gray-400 border-gray-800 hover:border-gray-600'
            }`}>{f.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Card grid — vertical scroll */}
        <div ref={scrollRef} onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ scrollbarWidth: 'thin' }}>
          <div className="grid gap-4" style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 45vw), 1fr))',
          }}>
            {filtered.slice(0, visibleCount).map((cardData, idx) => {
              const instance: CardInstance = {
                uid: generateUid(), data: cardData,
                currentAttack: cardData.attack ?? 0, currentHealth: cardData.health ?? 0,
                maxHealth: cardData.health ?? 0, frozen: 0, hasAttacked: false,
                summoningSickness: false, buffAttack: 0, buffHealth: 0,
                tempBuffAttack: 0, tempBuffHealth: 0, keywords: [...(cardData.keywords || [])],
              };
              const isSelected = selectedCard === cardData.id;
              const art = getCardCoverSources(cardData);
              const rarityBorder = cardData.rarity === 'mythic' ? 'border-orange-500/60 shadow-orange-500/20'
                : cardData.rarity === 'rare' ? 'border-[#c9a84c]/50 shadow-[#c9a84c]/15'
                : 'border-gray-700/50';

              return (
                <div key={cardData.id}
                  onClick={() => setSelectedCard(isSelected ? null : cardData.id)}
                  className={`card-frame cursor-pointer transition-all duration-300 ${
                    isSelected ? 'scale-[1.03] ring-2 ring-[#c9a84c]' : 'hover:scale-[1.02]'
                  } ${cardData.rarity === 'mythic' ? 'card-frame-mythic' : cardData.rarity === 'rare' ? 'card-frame-rare' : ''}`}
                  style={{ animationDelay: `${idx * 50}ms`, animation: 'cardAppear 0.4s ease-out backwards' }}>
                  <div className={`border-2 rounded-xl overflow-hidden ${rarityBorder} shadow-lg`}>
                    {/* Art section — 60% height */}
                    <div className={`relative ${COLOR_BG[cardData.color]} overflow-hidden`}
                      style={{ paddingTop: '75%' /* aspect ratio */ }}>
                      {art.src && (
                        <img src={art.src} data-fallback={art.fallback} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80"
                          loading="lazy" onError={e => handleImageErrorWithFallback(e.currentTarget)} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />

                      {/* Cost badge */}
                      <div className="absolute top-2 left-2 bg-blue-700/90 text-white rounded-full flex items-center justify-center font-bold shadow-lg font-heading"
                        style={{ width: '28px', height: '28px', fontSize: '14px' }}>
                        {cardData.cost}
                      </div>

                      {/* Rarity */}
                      <div className="absolute top-2 right-2">
                        <span className={`text-xs font-heading ${
                          cardData.rarity === 'mythic' ? 'text-orange-400' : cardData.rarity === 'rare' ? 'text-[#f0d68a]' : cardData.rarity === 'uncommon' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {cardData.rarity === 'mythic' ? '★★★' : cardData.rarity === 'rare' ? '★★' : cardData.rarity === 'uncommon' ? '★' : ''}
                        </span>
                      </div>

                      {/* Emoji */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-4xl drop-shadow-lg">
                        {cardData.emoji}
                      </div>
                    </div>

                    {/* Info section */}
                    <div className="bg-gradient-to-b from-[#1a1a24] to-[#10101a] p-3">
                      <div className="font-heading text-white font-bold text-sm mb-0.5">{cardData.name}</div>
                      <div className="text-[10px] text-gray-500 font-body mb-1.5">
                        {cardData.type === 'creature' ? 'Существо' : cardData.type === 'spell' ? 'Заклинание' : cardData.type === 'enchantment' ? 'Наложение' : 'Земля'}
                      </div>

                      {/* Keywords */}
                      {cardData.keywords && cardData.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {cardData.keywords.map(k => (
                            <span key={k} className="text-[8px] bg-[#2a1a3a] text-purple-200 px-1.5 py-0.5 rounded border border-purple-800/30 font-body">
                              {KW_NAMES[k] || k}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-[11px] text-gray-300 font-body leading-relaxed mb-2">{cardData.description}</div>

                      {cardData.type === 'creature' && (
                        <div className="flex gap-2 mb-1.5">
                          <span className="bg-red-700/80 text-white rounded px-2 py-0.5 font-bold font-heading text-xs">
                            {getEffectiveAttack(instance, { field: [], enchantments: [], hand: [], deck: [], graveyard: [], health: 30, maxHealth: 30, mana: 0, maxMana: 0, landsPlayed: 0, maxLandsPerTurn: 1 })}⚔
                          </span>
                          <span className="bg-green-700/80 text-white rounded px-2 py-0.5 font-bold font-heading text-xs">
                            {getEffectiveHealth(instance, { field: [], enchantments: [], hand: [], deck: [], graveyard: [], health: 30, maxHealth: 30, mana: 0, maxMana: 0, landsPlayed: 0, maxLandsPerTurn: 1 })}❤
                          </span>
                        </div>
                      )}

                      <div className="border-t border-[#c9a84c]/15 pt-1.5 mt-1">
                        <p className="text-[9px] text-[#c9a84c]/50 italic leading-relaxed font-body line-clamp-2">{cardData.flavor}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load more indicator */}
          {hasMore && (
            <div className="flex justify-center py-4">
              <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-[#c9a84c]/50 to-transparent animate-pulse" />
            </div>
          )}

          {!hasMore && filtered.length > 0 && (
            <div className="text-center py-4">
              <p className="text-gray-600 text-xs font-body italic">— Все карты показаны —</p>
            </div>
          )}
        </div>

        {/* Detail sidebar */}
        {detail && (
          <div className="w-80 shrink-0 bg-[#0f0f18]/98 border-l border-[#c9a84c]/20 overflow-y-auto">
            <div className={`relative h-56 ${COLOR_BG[detail.color]} overflow-hidden`}>
              {detailArt?.src && (
                <img src={detailArt.src} data-fallback={detailArt.fallback} alt="" className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy" onError={e => handleImageErrorWithFallback(e.currentTarget)} />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0f0f18]" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-7xl drop-shadow-lg">{detail.emoji}</div>
              <button onClick={() => setSelectedCard(null)}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 transition text-sm">✕</button>
            </div>

            <div className="p-5 -mt-4 relative z-10">
              <div className="font-heading font-bold text-white text-lg">{detail.name}</div>
              <div className="text-xs text-gray-400 font-body mb-3">
                {detail.type === 'creature' ? 'Существо' : detail.type === 'spell' ? 'Заклинание' : detail.type === 'enchantment' ? 'Наложение' : 'Земля'}
                {' · '}
                <span className={detail.rarity === 'mythic' ? 'text-orange-400' : detail.rarity === 'rare' ? 'text-[#f0d68a]' : ''}>
                  {detail.rarity === 'mythic' ? '★★★ Мифическая' : detail.rarity === 'rare' ? '★★ Редкая' : detail.rarity === 'uncommon' ? '★ Необычная' : '○ Обычная'}
                </span>
                {' · 💎'}{detail.cost}
              </div>

              {detail.keywords && detail.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {detail.keywords.map(k => (
                    <span key={k} className="text-[10px] bg-[#2a1a3a] text-purple-200 px-2 py-1 rounded border border-purple-800/30 font-body">
                      {KW_NAMES[k] || k}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-300 mb-3 font-body leading-relaxed">{detail.description}</p>

              {detail.type === 'creature' && (
                <div className="flex gap-4 text-base mb-3 font-heading">
                  <span className="text-red-400">⚔️ {detail.attack}</span>
                  <span className="text-green-400">❤️ {detail.health}</span>
                </div>
              )}

              <div className="border-t border-[#c9a84c]/15 pt-3 mt-3">
                <p className="text-xs text-[#c9a84c]/70 italic leading-relaxed font-body">{detail.flavor}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// RULES
// ═══════════════════════════════════════
function Rules({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] p-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto pb-8 relative z-10">
        <button onClick={onBack} className="text-[#8a7a5a] hover:text-[#f0d68a] mb-4 font-heading text-sm">← Назад</button>
        <h2 className="font-title text-2xl text-gold-light mb-6 text-center title-glow">📋 Правила Игры</h2>
        <div className="space-y-2">
          <R title="🎯 Цель" text={`Уменьшить здоровье Хранителя Омска (или противника) с 30 до 0.\nОба игрока начинают с 30 HP, 5 картами и колодой. Максимум карт в руке — 10.`} />
          <R title="🔄 Структура хода" text={`1. НАЧАЛО ХОДА — автоматически: тяните карту, мана восстанавливается\n2. ЗЕМЛЯ — разыграйте одну землю (бесплатно, +1 мана)\n3. ОСНОВНАЯ ФАЗА — разыгрывайте карты за ману\n4. БОЙ — атакуйте существами\n5. КОНЕЦ ХОДА — передайте ход`} />
          <R title="🏔️ Земли и Мана" text={`• Каждый ход можно разыграть ОДНУ землю бесплатно\n• Земля даёт +1 максимум маны и сразу восстанавливает 1 ману\n• В начале хода ВСЯ мана восстанавливается\n• Без земель нет маны — играйте земли КАЖДЫЙ ход!`} />
          <R title="🖱️ Управление" text={`ДВОЙНОЙ КЛИК — выберите карту в руке (1 клик), кликните ещё раз чтобы разыграть\nПЕРЕТАСКИВАНИЕ — схватите карту мышкой и перетащите на поле боя\nАТАКА — кликните своё существо (зелёная рамка), затем кликните вражеское или «В героя»\nОСМОТР — кликните любую карту чтобы увидеть подробности`} />
          <R title="⚔️ Бой" text={`• Существа НЕ атакуют в первый ход (💤 болезнь призыва), кроме ⚡ Ускорение\n• Выберите своё существо (зелёная рамка) → нажмите на врага или «В героя»\n• Существа обмениваются ударами — оба получают урон\n• Каждое существо атакует только РАЗ за ход`} />
          <R title="🛡️ Защитники" text={`• Пока есть защитник — враг ОБЯЗАН атаковать его первым\n• Защитники не могут атаковать сами\n• Летающие и неблокируемые ОБХОДЯТ наземных защитников`} />
          <R title="🔑 Ключевые слова" text={`⚡ Ускорение — атака сразу\n🛡️ Защитник — блокирует обязательно\n🕊️ Полёт — только летающие могут блокировать\n🦶 Растоптать — избыток урона в героя\n💖 Привязка к жизни — хил при ударе\n☠️ Смертельное касание — любой урон = смерть\n👁️ Бдительность — защищает как Защитник, но МОЖЕТ атаковать\n⚡ Первый удар — бьёт первым\n🔒 Порчеустойчивость — нельзя целиться\n👻 Неблокируемый — обходит всех`} />
          <R title="✨ Типы карт" text={`СУЩЕСТВА — выходят на поле, атакуют, защищают\nЗАКЛИНАНИЯ — одноразовые мощные эффекты\nНАЛОЖЕНИЯ — постоянные эффекты на поле\nЗЕМЛИ — источники маны (бесплатно, 1 в ход)`} />
          <R title="💡 Советы" text={`1. ЗЕМЛИ — играйте КАЖДЫЙ ход!\n2. Защитники спасают жизнь — ставьте их\n3. Выгодные размены > слепая атака героя\n4. Наложения дают преимущество — играйте рано\n5. Летающие — отличные финишеры\n6. Перетаскивайте карты мышкой — это быстрее!`} />
        </div>
      </div>
    </div>
  );
}

function R({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#0f0f18] rounded-xl border border-[#c9a84c]/10 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#1a1508]/40 transition-colors">
        <h3 className="font-heading text-[#f0d68a] text-sm">{title}</h3>
        <span className="text-gray-600 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-3 text-sm whitespace-pre-line text-gray-300 font-body leading-relaxed">{text}</div>}
    </div>
  );
}
