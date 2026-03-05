/**
 * DEBUG OVERLAY — Панель разработчика для карточной игры
 *
 * Включается:
 *   1. Клавиша D (toggle)
 *   2. URL-параметр ?debug=true
 *
 * Архитектура:
 *   - position: fixed, верхний правый угол
 *   - pointer-events: none для info-секций
 *   - pointer-events: auto для кнопок
 *   - z-index: 99999 (выше всего)
 *   - Не влияет на игровую логику (только вызывает engine functions)
 *
 * Режим "show interaction zones":
 *   - Показывает CSS outline на .creature-slot, .game-card-container, .game-card
 *   - Добавляет/удаляет класс .debug-zones на <body>
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, CardInstance, PlayerState } from './game/types';
import {
  playCard,
  attackPlayer,
  endTurn,
  getEffectiveAttack,
  getEffectiveHealth,
} from './game/engine';
import { ALL_CARDS } from './game/cards';

/* ─── Типы ─── */
interface DebugOverlayProps {
  gs: GameState;
  setGs: React.Dispatch<React.SetStateAction<GameState>>;
  selectedAttacker: string | null;
  selectedHand: string | null;
  phase: 'land' | 'play' | 'attack' | 'end' | 'wait';
}

/* ─── Вспомогательные функции ─── */
function shortUid(uid: string): string {
  return uid.split('_').slice(0, 2).join('_');
}

function hpColor(hp: number, max: number): string {
  const pct = hp / max;
  if (pct > 0.6) return '#4ade80';
  if (pct > 0.3) return '#fbbf24';
  return '#f87171';
}

function cardTypeIcon(type: string): string {
  return type === 'creature' ? '🐉'
    : type === 'spell' ? '✨'
    : type === 'land' ? '🏔️'
    : '🔮';
}

/* ─── Стили (inline, чтобы не мешать основному CSS) ─── */
const S = {
  panel: {
    position: 'fixed' as const,
    top: 8,
    right: 8,
    width: 'clamp(240px, 22vw, 310px)',
    maxHeight: 'calc(100dvh - 16px)',
    background: 'rgba(5,4,12,0.97)',
    border: '1px solid rgba(201,168,76,0.22)',
    borderRadius: 12,
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: 11,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
    backdropFilter: 'blur(12px)',
    userSelect: 'text' as const,
    /* Вся панель: pointer-events auto — перехватываем события */
    pointerEvents: 'auto' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    borderBottom: '1px solid rgba(201,168,76,0.12)',
    background: 'rgba(201,168,76,0.06)',
    flexShrink: 0,
    cursor: 'default',
  },
  title: {
    color: '#f0d68a',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.04em',
  },
  scrollBody: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '6px 0',
    scrollbarWidth: 'thin' as const,
  },
  section: {
    padding: '4px 10px 6px',
    borderBottom: '1px solid rgba(255,255,255,0.045)',
  },
  sectionTitle: {
    color: 'rgba(201,168,76,0.65)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5px 0',
    color: 'rgba(209,213,219,0.9)',
  },
  label: { color: 'rgba(107,114,128,0.85)', flexShrink: 0 },
  value: { color: '#e5e7eb', textAlign: 'right' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '60%' },
  badge: (color: string) => ({
    background: color,
    color: '#fff',
    borderRadius: 4,
    padding: '0 4px',
    fontSize: 10,
    fontWeight: 700,
  }),
  btn: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.11)',
    color: '#d1d5db',
    borderRadius: 6,
    padding: '3px 9px',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  btnDanger: {
    background: 'rgba(185,28,28,0.22)',
    border: '1px solid rgba(239,68,68,0.28)',
    color: '#fca5a5',
    borderRadius: 6,
    padding: '3px 9px',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  btnActive: {
    background: 'rgba(201,168,76,0.22)',
    border: '1px solid rgba(201,168,76,0.4)',
    color: '#f0d68a',
    borderRadius: 6,
    padding: '3px 9px',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '2px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  mono: { fontFamily: '"Courier New", monospace', fontSize: 10, color: '#6ee7b7' },
  tag: (color: string) => ({
    fontSize: 9,
    background: color,
    borderRadius: 3,
    padding: '0 3px',
    color: '#fff',
    flexShrink: 0,
  }),
};

/* ─── Кнопка с hover ─── */
function Btn({ style, onClick, children, title }: {
  style: React.CSSProperties;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{ ...style, opacity: hover ? 0.85 : 1 }}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

/* ─── Компактная строка карты ─── */
function CardDebugRow({ card, owner, opponent, highlight }: {
  card: CardInstance;
  owner: PlayerState;
  opponent: PlayerState;
  highlight?: boolean;
}) {
  const atk = getEffectiveAttack(card, owner, opponent);
  const hp  = getEffectiveHealth(card, owner);
  const half = hp <= card.maxHealth / 2;

  return (
    <div style={{
      ...S.cardRow,
      background: highlight ? 'rgba(250,204,21,0.06)' : undefined,
      borderRadius: 4,
    }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{card.data.emoji}</span>
      <span style={{ flex: 1, color: highlight ? '#fcd34d' : '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {card.data.name}
      </span>
      {card.data.type === 'creature' && (
        <>
          <span style={S.badge('rgba(185,28,28,0.75)')}>{atk}⚔</span>
          <span style={S.badge(half ? 'rgba(185,28,28,0.75)' : 'rgba(21,128,61,0.75)')}>{hp}❤</span>
        </>
      )}
      <span style={{ ...S.mono, marginLeft: 2 }}>{shortUid(card.uid)}</span>
      {card.summoningSickness && <span title="Болезнь призыва" style={S.tag('rgba(107,114,128,0.6)')}>💤</span>}
      {card.hasAttacked      && <span title="Атаковал" style={S.tag('rgba(107,114,128,0.6)')}>✓</span>}
      {card.frozen > 0       && <span title="Заморожен" style={S.tag('rgba(103,232,249,0.5)')}>❄{card.frozen}</span>}
    </div>
  );
}

/* ─── Главный компонент ─── */
export function DebugOverlay({ gs, setGs, selectedAttacker, selectedHand, phase }: DebugOverlayProps) {
  const [visible, setVisible] = useState(() => {
    // Проверяем URL-параметр при первом рендере
    return new URLSearchParams(window.location.search).get('debug') === 'true';
  });
  const [showZones, setShowZones] = useState(false);
  const [activeTab, setActiveTab] = useState<'state' | 'cards' | 'actions' | 'log'>('state');
  const [collapsed, setCollapsed]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── Клавиша D ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Не срабатывает если пользователь набирает текст
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'd' || e.key === 'D') {
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ── Режим "show interaction zones" — добавляем класс на body ── */
  useEffect(() => {
    if (showZones) {
      document.body.classList.add('debug-zones');
    } else {
      document.body.classList.remove('debug-zones');
    }
    return () => document.body.classList.remove('debug-zones');
  }, [showZones]);

  /* ── Scroll to bottom на вкладке log ── */
  useEffect(() => {
    if (activeTab === 'log' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTab, gs.log.length]);

  /* ── Debug Actions ── */

  // Добрать карту для player1
  const debugDrawCard = useCallback(() => {
    setGs(prev => {
      const p = { ...prev.player1 };
      if (p.deck.length === 0 || p.hand.length >= 10) return prev;
      const [drawn, ...rest] = p.deck;
      return {
        ...prev,
        player1: { ...p, hand: [...p.hand, drawn], deck: rest },
        log: [...prev.log, `🔧 DEBUG: Добрана карта ${drawn.data.emoji} ${drawn.data.name}`],
      };
    });
  }, [setGs]);

  // Нанести урон player1 (5 урона)
  const debugDealDamage = useCallback(() => {
    setGs(prev => {
      const newHp = Math.max(0, prev.player1.health - 5);
      const gameOver = newHp <= 0;
      return {
        ...prev,
        player1: { ...prev.player1, health: newHp },
        gameOver: gameOver || prev.gameOver,
        winner: gameOver ? 'player2' : prev.winner,
        log: [...prev.log, `🔧 DEBUG: Нанесено 5 урона игроку 1. HP: ${newHp}`],
      };
    });
  }, [setGs]);

  // Хилить player1 (+5 HP)
  const debugHeal = useCallback(() => {
    setGs(prev => {
      const newHp = Math.min(prev.player1.maxHealth, prev.player1.health + 5);
      return {
        ...prev,
        player1: { ...prev.player1, health: newHp },
        log: [...prev.log, `🔧 DEBUG: +5 HP игроку. HP: ${newHp}`],
      };
    });
  }, [setGs]);

  // Spawn случайного существа для player1
  const debugSpawnCreature = useCallback(() => {
    const creatures = ALL_CARDS.filter(c => c.type === 'creature');
    const data = creatures[Math.floor(Math.random() * creatures.length)];
    setGs(prev => {
      if (prev.player1.field.length >= 7) return prev;
      const inst = {
        uid: `debug_${Date.now()}`,
        data,
        currentHealth: data.health,
        maxHealth: data.health,
        keywords: [...data.keywords],
        summoningSickness: false,
        hasAttacked: false,
        frozen: 0,
        counters: {},
      };
      return {
        ...prev,
        player1: { ...prev.player1, field: [...prev.player1.field, inst] },
        log: [...prev.log, `🔧 DEBUG: Заспавнено ${inst.data.emoji} ${inst.data.name}`],
      };
    });
  }, [setGs]);

  // Завершить ход (через движок)
  const debugEndTurn = useCallback(() => {
    setGs(prev => endTurn(prev));
  }, [setGs]);

  // Атаковать героя enemy первым существом player1
  const debugAttackHero = useCallback(() => {
    setGs(prev => {
      if (prev.player1.field.length === 0 || prev.currentTurn !== 'player1') return prev;
      const attacker = prev.player1.field.find(c => !c.summoningSickness && !c.hasAttacked);
      if (!attacker) return prev;
      const next = attackPlayer(prev, 'player1', attacker.uid);
      return next === prev ? prev : {
        ...next,
        log: [...next.log, `🔧 DEBUG: Атака героя (${attacker.data.name})`],
      };
    });
  }, [setGs]);

  // Сыграть первую возможную карту из руки
  const debugPlayFirstCard = useCallback(() => {
    setGs(prev => {
      if (prev.currentTurn !== 'player1') return prev;
      const card = prev.player1.hand.find(c =>
        c.data.type === 'land'
          ? prev.player1.landsPlayed < prev.player1.maxLandsPerTurn
          : c.data.cost <= prev.player1.mana
      );
      if (!card) return prev;
      const next = playCard(prev, 'player1', card.uid);
      return next === prev ? prev : {
        ...next,
        log: [...next.log, `🔧 DEBUG: Разыграна карта ${card.data.name}`],
      };
    });
  }, [setGs]);

  // Добавить 5 маны
  const debugAddMana = useCallback(() => {
    setGs(prev => ({
      ...prev,
      player1: {
        ...prev.player1,
        mana: Math.min(99, prev.player1.mana + 5),
        maxMana: Math.min(99, prev.player1.maxMana + 5),
      },
      log: [...prev.log, '🔧 DEBUG: +5 маны'],
    }));
  }, [setGs]);

  // Сбросить HP enemy до 1
  const debugKillEnemy = useCallback(() => {
    setGs(prev => ({
      ...prev,
      player2: { ...prev.player2, health: 1 },
      log: [...prev.log, '🔧 DEBUG: HP противника → 1'],
    }));
  }, [setGs]);

  if (!visible) {
    /* Показываем мини-кнопку для включения */
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed',
          bottom: 8,
          right: 8,
          width: 28,
          height: 28,
          background: 'rgba(5,4,12,0.85)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 6,
          color: 'rgba(201,168,76,0.45)',
          fontSize: 11,
          cursor: 'pointer',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          transition: 'opacity 0.2s',
          opacity: 0.55,
        }}
        title="Открыть Debug панель (D)"
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.55'; }}
      >
        D
      </button>
    );
  }

  const me    = gs.player1;
  const enemy = gs.player2;
  const selectedAttackerCard = selectedAttacker
    ? me.field.find(c => c.uid === selectedAttacker)
    : null;
  const selectedHandCard = selectedHand
    ? me.hand.find(c => c.uid === selectedHand)
    : null;

  /* ── TABS ── */
  const tabs: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'state',   label: '📊 Состояние' },
    { id: 'cards',   label: '🃏 Карты' },
    { id: 'actions', label: '⚡ Действия' },
    { id: 'log',     label: '📜 Лог' },
  ];

  return (
    <div style={S.panel}>
      {/* ── HEADER ── */}
      <div style={S.header}>
        <span style={S.title}>🔧 DEBUG {gs.turnNumber > 0 ? `T${gs.turnNumber}` : ''}</span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <button
            onClick={() => setShowZones(z => !z)}
            style={showZones ? S.btnActive : S.btn}
            title="Показать зоны взаимодействия"
          >
            {showZones ? '🔲 Зоны ✓' : '🔲 Зоны'}
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={S.btn}
            title="Свернуть"
          >
            {collapsed ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setVisible(false)}
            style={S.btn}
            title="Закрыть (D)"
          >
            ✕
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* ── TAB BAR ── */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            background: 'rgba(0,0,0,0.3)',
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '5px 3px',
                  background: activeTab === tab.id ? 'rgba(201,168,76,0.1)' : 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id
                    ? '2px solid rgba(201,168,76,0.6)'
                    : '2px solid transparent',
                  color: activeTab === tab.id ? '#f0d68a' : 'rgba(107,114,128,0.8)',
                  fontSize: 9,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── SCROLL BODY ── */}
          <div ref={scrollRef} style={S.scrollBody}>

            {/* ════════════ TAB: STATE ════════════ */}
            {activeTab === 'state' && (
              <>
                {/* Engine State */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>⚙️ Engine State</div>
                  <div style={S.row}>
                    <span style={S.label}>Ход</span>
                    <span style={S.value}>{gs.turnNumber}</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Сейчас ходит</span>
                    <span style={{
                      ...S.value,
                      color: gs.currentTurn === 'player1' ? '#86efac' : '#fca5a5',
                    }}>
                      {gs.currentTurn === 'player1' ? '🟢 Игрок 1' : '🔴 Противник'}
                    </span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Фаза</span>
                    <span style={{ ...S.value, color: '#fcd34d' }}>{phase}</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>gameOver</span>
                    <span style={{ ...S.value, color: gs.gameOver ? '#f87171' : '#4ade80' }}>
                      {gs.gameOver ? `✓ winner: ${gs.winner}` : '✗'}
                    </span>
                  </div>
                </div>

                {/* Selected cards */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>🎯 Выбор</div>
                  <div style={S.row}>
                    <span style={S.label}>Атакующий</span>
                    <span style={{ ...S.value, color: selectedAttackerCard ? '#fcd34d' : '#4b5563' }}>
                      {selectedAttackerCard
                        ? `${selectedAttackerCard.data.emoji} ${selectedAttackerCard.data.name}`
                        : '—'}
                    </span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Карта в руке</span>
                    <span style={{ ...S.value, color: selectedHandCard ? '#93c5fd' : '#4b5563' }}>
                      {selectedHandCard
                        ? `${selectedHandCard.data.emoji} ${selectedHandCard.data.name}`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Player 1 stats */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>👤 Игрок 1</div>
                  <div style={S.row}>
                    <span style={S.label}>HP</span>
                    <span style={{ ...S.value, color: hpColor(me.health, me.maxHealth) }}>
                      {me.health} / {me.maxHealth}
                    </span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Мана</span>
                    <span style={{ ...S.value, color: '#60a5fa' }}>
                      {me.mana} / {me.maxMana}
                    </span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Земли</span>
                    <span style={S.value}>{me.landsPlayed}/{me.maxLandsPerTurn}</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Рука</span>
                    <span style={S.value}>{me.hand.length} карт</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Поле</span>
                    <span style={S.value}>{me.field.length} существ</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Колода</span>
                    <span style={S.value}>{me.deck.length} карт</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Кладбище</span>
                    <span style={S.value}>{me.graveyard.length} карт</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Чары</span>
                    <span style={S.value}>{me.enchantments.length}</span>
                  </div>
                </div>

                {/* Player 2 stats */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>🦉 Противник</div>
                  <div style={S.row}>
                    <span style={S.label}>HP</span>
                    <span style={{ ...S.value, color: hpColor(enemy.health, enemy.maxHealth) }}>
                      {enemy.health} / {enemy.maxHealth}
                    </span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Мана</span>
                    <span style={{ ...S.value, color: '#60a5fa' }}>
                      {enemy.mana} / {enemy.maxMana}
                    </span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Рука</span>
                    <span style={S.value}>{enemy.hand.length} карт</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Поле</span>
                    <span style={S.value}>{enemy.field.length} существ</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Колода</span>
                    <span style={S.value}>{enemy.deck.length} карт</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Кладбище</span>
                    <span style={S.value}>{enemy.graveyard.length} карт</span>
                  </div>
                </div>
              </>
            )}

            {/* ════════════ TAB: CARDS ════════════ */}
            {activeTab === 'cards' && (
              <>
                {/* My field */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>
                    👤 Поле ({me.field.length}/7)
                  </div>
                  {me.field.length === 0 && (
                    <div style={{ color: '#374151', fontStyle: 'italic', fontSize: 10 }}>Пусто</div>
                  )}
                  {me.field.map(card => (
                    <CardDebugRow
                      key={card.uid}
                      card={card}
                      owner={me}
                      opponent={enemy}
                      highlight={selectedAttacker === card.uid}
                    />
                  ))}
                </div>

                {/* Enemy field */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>
                    🦉 Поле противника ({enemy.field.length}/7)
                  </div>
                  {enemy.field.length === 0 && (
                    <div style={{ color: '#374151', fontStyle: 'italic', fontSize: 10 }}>Пусто</div>
                  )}
                  {enemy.field.map(card => (
                    <CardDebugRow
                      key={card.uid}
                      card={card}
                      owner={enemy}
                      opponent={me}
                    />
                  ))}
                </div>

                {/* My hand */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>
                    ✋ Рука ({me.hand.length})
                  </div>
                  {me.hand.length === 0 && (
                    <div style={{ color: '#374151', fontStyle: 'italic', fontSize: 10 }}>Пусто</div>
                  )}
                  {me.hand.map(card => (
                    <div key={card.uid} style={{ ...S.cardRow, borderRadius: 4 }}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>{cardTypeIcon(card.data.type)}</span>
                      <span style={{ fontSize: 13, flexShrink: 0 }}>{card.data.emoji}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e5e7eb' }}>
                        {card.data.name}
                      </span>
                      <span style={S.badge('rgba(29,78,216,0.75)')}>{card.data.cost}💎</span>
                      {card.data.type === 'creature' && (
                        <>
                          <span style={S.badge('rgba(185,28,28,0.75)')}>{card.data.attack}⚔</span>
                          <span style={S.badge('rgba(21,128,61,0.75)')}>{card.data.health}❤</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Graveyard */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>
                    ☠️ Кладбище ({me.graveyard.length})
                  </div>
                  {me.graveyard.slice(-5).map(card => (
                    <div key={card.uid} style={{ ...S.cardRow, opacity: 0.6 }}>
                      <span style={{ fontSize: 12 }}>{card.data.emoji}</span>
                      <span style={{ color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.data.name}
                      </span>
                    </div>
                  ))}
                  {me.graveyard.length === 0 && (
                    <div style={{ color: '#374151', fontStyle: 'italic', fontSize: 10 }}>Пусто</div>
                  )}
                </div>

                {/* Selected card detail */}
                {(selectedAttackerCard || selectedHandCard) && (
                  <div style={{ ...S.section, background: 'rgba(250,204,21,0.04)' }}>
                    <div style={S.sectionTitle}>🔍 Выбранная карта</div>
                    {(() => {
                      const card = selectedAttackerCard ?? selectedHandCard!;
                      const owner = selectedAttackerCard ? me : me;
                      return (
                        <>
                          <div style={S.row}>
                            <span style={S.label}>ID</span>
                            <span style={S.mono}>{card.data.id}</span>
                          </div>
                          <div style={S.row}>
                            <span style={S.label}>UID</span>
                            <span style={S.mono}>{shortUid(card.uid)}</span>
                          </div>
                          <div style={S.row}>
                            <span style={S.label}>Тип</span>
                            <span style={S.value}>{card.data.type}</span>
                          </div>
                          <div style={S.row}>
                            <span style={S.label}>Редкость</span>
                            <span style={{
                              ...S.value,
                              color: card.data.rarity === 'mythic' ? '#fb923c'
                                : card.data.rarity === 'rare' ? '#f59e0b'
                                : '#9ca3af',
                            }}>
                              {card.data.rarity}
                            </span>
                          </div>
                          <div style={S.row}>
                            <span style={S.label}>Цвет</span>
                            <span style={S.value}>{card.data.color}</span>
                          </div>
                          {card.data.type === 'creature' && (
                            <>
                              <div style={S.row}>
                                <span style={S.label}>ATK (эфф.)</span>
                                <span style={{ ...S.value, color: '#f87171' }}>
                                  {getEffectiveAttack(card, owner, enemy)}
                                </span>
                              </div>
                              <div style={S.row}>
                                <span style={S.label}>HP (эфф.)</span>
                                <span style={{ ...S.value, color: hpColor(card.currentHealth, card.maxHealth) }}>
                                  {getEffectiveHealth(card, owner)} / {card.maxHealth}
                                </span>
                              </div>
                            </>
                          )}
                          {card.keywords.length > 0 && (
                            <div style={S.row}>
                              <span style={S.label}>Keywords</span>
                              <span style={{ ...S.value, color: '#d8b4fe' }}>
                                {card.keywords.join(', ')}
                              </span>
                            </div>
                          )}
                          <div style={{ ...S.row, flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                            <span style={S.label}>Описание</span>
                            <span style={{ color: '#9ca3af', fontSize: 10, lineHeight: 1.4, maxWidth: '100%' }}>
                              {card.data.description}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            )}

            {/* ════════════ TAB: ACTIONS ════════════ */}
            {activeTab === 'actions' && (
              <>
                <div style={S.section}>
                  <div style={S.sectionTitle}>🃏 Карты</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '2px 0' }}>
                    <Btn style={S.btn} onClick={debugDrawCard} title="Добрать карту из колоды">
                      🂠 Добрать
                    </Btn>
                    <Btn style={S.btn} onClick={debugPlayFirstCard} title="Сыграть первую доступную карту">
                      🃏 Сыграть карту
                    </Btn>
                  </div>
                </div>

                <div style={S.section}>
                  <div style={S.sectionTitle}>🐉 Существа</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '2px 0' }}>
                    <Btn style={S.btn} onClick={debugSpawnCreature} title="Заспавнить случайное существо (без болезни призыва)">
                      🐉 Спавн существа
                    </Btn>
                    <Btn style={S.btn} onClick={debugAttackHero} title="Первое существо атакует героя">
                      ⚔️ Атака героя
                    </Btn>
                  </div>
                </div>

                <div style={S.section}>
                  <div style={S.sectionTitle}>❤️ Здоровье / Мана</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '2px 0' }}>
                    <Btn style={S.btnDanger} onClick={debugDealDamage} title="Нанести 5 урона себе (тест low health)">
                      💔 -5 HP себе
                    </Btn>
                    <Btn style={S.btn} onClick={debugHeal} title="+5 HP себе">
                      💚 +5 HP
                    </Btn>
                    <Btn style={S.btn} onClick={debugAddMana} title="+5 маны">
                      💎 +5 маны
                    </Btn>
                    <Btn style={S.btnDanger} onClick={debugKillEnemy} title="Здоровье противника → 1">
                      ☠️ HP врага → 1
                    </Btn>
                  </div>
                </div>

                <div style={S.section}>
                  <div style={S.sectionTitle}>⏭️ Ход</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '2px 0' }}>
                    <Btn style={S.btn} onClick={debugEndTurn} title="Завершить ход (движок)">
                      ⏭️ Конец хода
                    </Btn>
                  </div>
                </div>

                {/* Дополнительные сведения для отладки */}
                <div style={S.section}>
                  <div style={S.sectionTitle}>🔑 Быстрый статус</div>
                  <div style={S.row}>
                    <span style={S.label}>Можно разыграть</span>
                    <span style={{
                      ...S.value,
                      color: me.hand.some(c =>
                        c.data.type === 'land'
                          ? me.landsPlayed < me.maxLandsPerTurn
                          : c.data.cost <= me.mana
                      ) ? '#4ade80' : '#6b7280',
                    }}>
                      {me.hand.filter(c =>
                        c.data.type === 'land'
                          ? me.landsPlayed < me.maxLandsPerTurn
                          : c.data.cost <= me.mana
                      ).length} карт
                    </span>
                  </div>
                  <div style={S.row}>
                    <span style={S.label}>Могут атаковать</span>
                    <span style={{
                      ...S.value,
                      color: me.field.some(c =>
                        !c.summoningSickness && !c.hasAttacked && c.frozen <= 0
                      ) ? '#4ade80' : '#6b7280',
                    }}>
                      {me.field.filter(c =>
                        !c.summoningSickness && !c.hasAttacked && c.frozen <= 0
                      ).length} существ
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* ════════════ TAB: LOG ════════════ */}
            {activeTab === 'log' && (
              <div style={{ ...S.section, maxHeight: 'none' }}>
                <div style={S.sectionTitle}>
                  📜 Последние {Math.min(gs.log.length, 80)} событий
                </div>
                {gs.log.slice(-80).map((entry, i) => {
                  const isDebug = entry.startsWith('🔧 DEBUG');
                  const isDiv   = entry.startsWith('────');
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '2px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        color: isDebug ? '#fcd34d'
                          : isDiv ? 'rgba(201,168,76,0.3)'
                          : '#6b7280',
                        fontSize: isDiv ? 10 : 10,
                        fontStyle: isDiv ? 'italic' : undefined,
                        background: isDebug ? 'rgba(252,211,77,0.04)' : undefined,
                      }}
                    >
                      <span style={{ color: 'rgba(107,114,128,0.45)', marginRight: 5 }}>
                        {gs.log.length - gs.log.slice(-80).length + i + 1}
                      </span>
                      {entry}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div style={{
            flexShrink: 0,
            padding: '5px 10px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <span style={{ color: 'rgba(107,114,128,0.5)', fontSize: 9 }}>
              D — toggle • ?debug=true
            </span>
            <span style={{
              fontSize: 9,
              color: gs.gameOver ? '#f87171' : gs.currentTurn === 'player1' ? '#4ade80' : '#fca5a5',
            }}>
              {gs.gameOver ? `GAME OVER: ${gs.winner}` : gs.currentTurn}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
