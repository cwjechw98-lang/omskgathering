import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { GameState, CardInstance, PlayerState } from '../game/types';
import {
  createInitialGameState,
  createCardInstance,
  playCard,
  attackPlayer,
  attackCreature,
  endTurn,
  getEffectiveAttack,
} from '../game/engine';
import { createDeckFromCardIds } from '../data/cards';
import { expandDeckCardIds, getActiveDeck, loadDecksState } from '../utils/decksStorage';
import { aiTurn } from '../game/ai';
import {
  CARD_NARRATIVES,
  STORY_EVENTS,
  DEATH_QUOTES,
  getAILoreComment,
  AI_CHARACTER,
} from '../data/lore';
import {
  getCardCoverSources,
  getCardBackSource,
  handleImageErrorWithFallback,
} from '../utils/cardImages';
import { Card as UICard, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { CardPreview } from './game/CardPreview';
import { FieldCard, COLOR_ART } from './game/FieldCard';
import { ModalOverlay } from './ui/modal-overlay';
import { Tutorial } from './game/Tutorial';
import { PhaseIndicator } from './game/PhaseIndicator';

interface Props {
  mode: 'ai' | 'local' | 'online';
  onBack: () => void;
}

type ElementType = 'fire' | 'ice' | 'poison' | 'explosion' | 'neutral';
function getCardElement(card: CardInstance): ElementType {
  const id = card.data.id;
  if (id.includes('vzryv') || id.includes('bomb') || id.includes('posledniy_argument'))
    return 'explosion';
  if (card.data.color === 'red') return 'fire';
  if (card.data.color === 'blue' || card.data.keywords?.includes('hexproof')) return 'ice';
  if (card.data.color === 'black' || card.data.keywords?.includes('deathtouch')) return 'poison';
  return 'neutral';
}

/* ═══════════════════════════════════════════
   UNIFIED MESSAGE SYSTEM
   ═══════════════════════════════════════════ */
type GameMessage = {
  id: number;
  type: 'ai' | 'narrative' | 'death' | 'action' | 'story' | 'system';
  text: string;
  emoji: string;
  createdAt: number;
  duration: number;
};

let msgIdCounter = 0;

type DailyQuestId = 'play_land' | 'play_non_land' | 'complete_match';

type AchievementId =
  | 'first_land'
  | 'first_spell_or_creature'
  | 'first_match_complete'
  | 'first_victory';

type DailyQuestState = {
  dateKey: string;
  progress: Record<DailyQuestId, number>;
};

type AchievementsState = {
  version: 0;
  unlocked: Record<AchievementId, boolean>;
  unlockedAt: Record<AchievementId, number | null>;
};

type XPProfileState = {
  version: 0;
  xpTotal: number;
  level: number;
  xpInLevel: number;
};

type TelemetryEventName =
  | 'tutorial_hint_shown'
  | 'tutorial_skipped'
  | 'card_played_land'
  | 'card_played_non_land'
  | 'match_completed'
  | 'match_victory'
  | 'daily_quest_completed'
  | 'achievement_unlocked';

type TelemetryPayload = Record<string, string | number | boolean | null>;

type TelemetryEvent = {
  name: TelemetryEventName;
  timestamp: number;
  payload: TelemetryPayload;
};

type TelemetryBufferState = {
  version: 0;
  events: TelemetryEvent[];
};

type BaselineMetricsState = {
  version: 0;
  counters: {
    matchesCompleted: number;
    turnsEnded: number;
    cardsPlayed: number;
    aiTurns: number;
  };
  recentTurnDurationsMs: number[];
  recentAiTurnDurationsMs: number[];
  recentCardActionLatencyMs: number[];
  updatedAt: number | null;
};

const DAILY_QUESTS_STORAGE_KEY = 'omsk.daily-quests.v0';
const ACHIEVEMENTS_STORAGE_KEY = 'omsk.achievements.v0';
const XP_PROFILE_STORAGE_KEY = 'omsk.xp-profile.v0';
const TELEMETRY_STORAGE_KEY = 'omsk.telemetry.v0';
const BASELINE_STORAGE_KEY = 'omsk.baseline.v0';
const TUTORIAL_STORAGE_KEY = 'tutorialCompleted';
const DAILY_QUEST_TARGET = 1;
const XP_PER_LEVEL = 100;
const TELEMETRY_MAX_EVENTS = 200;
const BASELINE_MAX_SAMPLES = 120;

const TELEMETRY_EVENT_NAMES: ReadonlySet<TelemetryEventName> = new Set([
  'tutorial_hint_shown',
  'tutorial_skipped',
  'card_played_land',
  'card_played_non_land',
  'match_completed',
  'match_victory',
  'daily_quest_completed',
  'achievement_unlocked',
]);

function createInitialGameStateForActiveDeck(): GameState {
  const base = createInitialGameState();
  const decksState = loadDecksState();
  const activeDeck = getActiveDeck(decksState);
  if (!activeDeck) return base;

  const selectedCardIds = expandDeckCardIds(activeDeck);
  const selectedDeckData = createDeckFromCardIds(selectedCardIds);
  const selectedInstances = selectedDeckData.map((card) => createCardInstance(card));
  if (selectedInstances.length === 0) return base;

  const player1HandSize = Math.min(6, selectedInstances.length);
  base.player1.hand = selectedInstances.slice(0, player1HandSize);
  base.player1.deck = selectedInstances.slice(player1HandSize);

  base.log.push(`🧱 Активная колода: ${activeDeck.name}`);

  return base;
}

const DAILY_QUEST_META: Array<{ id: DailyQuestId; label: string }> = [
  { id: 'play_land', label: 'Play 1 land in a match' },
  { id: 'play_non_land', label: 'Play 1 non-land card in a match' },
  { id: 'complete_match', label: 'Complete 1 match (win or lose)' },
];

const ACHIEVEMENTS_META: Array<{ id: AchievementId; label: string; emoji: string }> = [
  { id: 'first_land', label: 'First land played', emoji: '🏔️' },
  { id: 'first_spell_or_creature', label: 'First non-land played', emoji: '✨' },
  { id: 'first_match_complete', label: 'First match complete', emoji: '🏁' },
  { id: 'first_victory', label: 'First victory', emoji: '🏆' },
];

function getLocalDateKey(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function createInitialDailyQuestState(dateKey = getLocalDateKey()): DailyQuestState {
  return {
    dateKey,
    progress: {
      play_land: 0,
      play_non_land: 0,
      complete_match: 0,
    },
  };
}

function normalizeDailyQuestState(value: unknown): DailyQuestState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<DailyQuestState>;
  if (typeof candidate.dateKey !== 'string') return null;
  const progress = candidate.progress;
  if (!progress || typeof progress !== 'object') return null;

  return {
    dateKey: candidate.dateKey,
    progress: {
      play_land: Number((progress as Record<string, unknown>).play_land) || 0,
      play_non_land: Number((progress as Record<string, unknown>).play_non_land) || 0,
      complete_match: Number((progress as Record<string, unknown>).complete_match) || 0,
    },
  };
}

function loadDailyQuestState(): DailyQuestState {
  if (typeof window === 'undefined') return createInitialDailyQuestState();
  try {
    const raw = window.localStorage.getItem(DAILY_QUESTS_STORAGE_KEY);
    if (!raw) return createInitialDailyQuestState();
    const parsed = normalizeDailyQuestState(JSON.parse(raw));
    if (!parsed) return createInitialDailyQuestState();
    const todayKey = getLocalDateKey();
    if (parsed.dateKey !== todayKey) return createInitialDailyQuestState(todayKey);
    return parsed;
  } catch {
    return createInitialDailyQuestState();
  }
}

function saveDailyQuestState(state: DailyQuestState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DAILY_QUESTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

function incrementDailyQuest(state: DailyQuestState, questId: DailyQuestId): DailyQuestState {
  return {
    ...state,
    progress: {
      ...state.progress,
      [questId]: Math.min(DAILY_QUEST_TARGET, state.progress[questId] + 1),
    },
  };
}

function createInitialAchievementsState(): AchievementsState {
  return {
    version: 0,
    unlocked: {
      first_land: false,
      first_spell_or_creature: false,
      first_match_complete: false,
      first_victory: false,
    },
    unlockedAt: {
      first_land: null,
      first_spell_or_creature: null,
      first_match_complete: null,
      first_victory: null,
    },
  };
}

function normalizeAchievementsState(value: unknown): AchievementsState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<AchievementsState>;
  if (candidate.version !== 0) return null;
  const unlocked = candidate.unlocked;
  const unlockedAt = candidate.unlockedAt;
  if (!unlocked || typeof unlocked !== 'object') return null;
  if (!unlockedAt || typeof unlockedAt !== 'object') return null;

  return {
    version: 0,
    unlocked: {
      first_land: Boolean((unlocked as Record<string, unknown>).first_land),
      first_spell_or_creature: Boolean(
        (unlocked as Record<string, unknown>).first_spell_or_creature
      ),
      first_match_complete: Boolean((unlocked as Record<string, unknown>).first_match_complete),
      first_victory: Boolean((unlocked as Record<string, unknown>).first_victory),
    },
    unlockedAt: {
      first_land: Number((unlockedAt as Record<string, unknown>).first_land) || null,
      first_spell_or_creature:
        Number((unlockedAt as Record<string, unknown>).first_spell_or_creature) || null,
      first_match_complete:
        Number((unlockedAt as Record<string, unknown>).first_match_complete) || null,
      first_victory: Number((unlockedAt as Record<string, unknown>).first_victory) || null,
    },
  };
}

function loadAchievementsState(): AchievementsState {
  if (typeof window === 'undefined') return createInitialAchievementsState();
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return createInitialAchievementsState();
    const parsed = normalizeAchievementsState(JSON.parse(raw));
    return parsed ?? createInitialAchievementsState();
  } catch {
    return createInitialAchievementsState();
  }
}

function saveAchievementsState(state: AchievementsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

function unlockAchievementState(state: AchievementsState, achievementId: AchievementId): AchievementsState {
  if (state.unlocked[achievementId]) return state;
  const now = Date.now();
  return {
    ...state,
    unlocked: {
      ...state.unlocked,
      [achievementId]: true,
    },
    unlockedAt: {
      ...state.unlockedAt,
      [achievementId]: now,
    },
  };
}

function toXPProfileState(xpTotal: number): XPProfileState {
  const normalizedXpTotal = Math.max(0, Math.floor(xpTotal));
  return {
    version: 0,
    xpTotal: normalizedXpTotal,
    level: Math.floor(normalizedXpTotal / XP_PER_LEVEL) + 1,
    xpInLevel: normalizedXpTotal % XP_PER_LEVEL,
  };
}

function createInitialXPProfileState(): XPProfileState {
  return toXPProfileState(0);
}

function normalizeXPProfileState(value: unknown): XPProfileState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<XPProfileState>;
  if (candidate.version !== 0) return null;

  const xpTotalRaw = Number(candidate.xpTotal);
  if (Number.isFinite(xpTotalRaw) && xpTotalRaw >= 0) {
    return toXPProfileState(xpTotalRaw);
  }

  const levelRaw = Number(candidate.level);
  const xpInLevelRaw = Number(candidate.xpInLevel);
  if (!Number.isFinite(levelRaw) || !Number.isFinite(xpInLevelRaw)) return null;
  if (levelRaw < 1 || xpInLevelRaw < 0) return null;

  const normalizedLevel = Math.max(1, Math.floor(levelRaw));
  const normalizedXpInLevel = Math.floor(xpInLevelRaw);
  const inferredTotal = (normalizedLevel - 1) * XP_PER_LEVEL + normalizedXpInLevel;
  return toXPProfileState(inferredTotal);
}

function loadXPProfileState(): XPProfileState {
  if (typeof window === 'undefined') return createInitialXPProfileState();
  try {
    const raw = window.localStorage.getItem(XP_PROFILE_STORAGE_KEY);
    if (!raw) return createInitialXPProfileState();
    const parsed = normalizeXPProfileState(JSON.parse(raw));
    return parsed ?? createInitialXPProfileState();
  } catch {
    return createInitialXPProfileState();
  }
}

function saveXPProfileState(state: XPProfileState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(XP_PROFILE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

function awardXP(state: XPProfileState, amount: number): XPProfileState {
  const normalizedAmount = Math.max(0, Math.floor(amount));
  if (normalizedAmount === 0) return state;
  return toXPProfileState(state.xpTotal + normalizedAmount);
}

function createInitialTelemetryBufferState(): TelemetryBufferState {
  return {
    version: 0,
    events: [],
  };
}

function normalizeTelemetryEventName(value: unknown): TelemetryEventName | null {
  if (typeof value !== 'string') return null;
  if (!TELEMETRY_EVENT_NAMES.has(value as TelemetryEventName)) return null;
  return value as TelemetryEventName;
}

function normalizeTelemetryPayload(value: unknown): TelemetryPayload {
  if (!value || typeof value !== 'object') return {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 8);
  const payload: TelemetryPayload = {};
  for (const [key, raw] of entries) {
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean' || raw === null) {
      payload[key] = raw;
    }
  }
  return payload;
}

function normalizeTelemetryBufferState(value: unknown): TelemetryBufferState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<TelemetryBufferState>;
  if (candidate.version !== 0) return null;
  if (!Array.isArray(candidate.events)) return null;

  const events = candidate.events
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const event = entry as Partial<TelemetryEvent>;
      const name = normalizeTelemetryEventName(event.name);
      const timestamp = Number(event.timestamp);
      if (!name || !Number.isFinite(timestamp) || timestamp <= 0) return null;
      return {
        name,
        timestamp: Math.floor(timestamp),
        payload: normalizeTelemetryPayload(event.payload),
      } satisfies TelemetryEvent;
    })
    .filter((event): event is TelemetryEvent => event !== null)
    .slice(-TELEMETRY_MAX_EVENTS);

  return {
    version: 0,
    events,
  };
}

function loadTelemetryBufferState(): TelemetryBufferState {
  if (typeof window === 'undefined') return createInitialTelemetryBufferState();
  try {
    const raw = window.localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return createInitialTelemetryBufferState();
    const parsed = normalizeTelemetryBufferState(JSON.parse(raw));
    return parsed ?? createInitialTelemetryBufferState();
  } catch {
    return createInitialTelemetryBufferState();
  }
}

function saveTelemetryBufferState(state: TelemetryBufferState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

function pushTelemetryEvent(
  state: TelemetryBufferState,
  name: TelemetryEventName,
  payload: TelemetryPayload = {}
): TelemetryBufferState {
  const nextEvent: TelemetryEvent = {
    name,
    timestamp: Date.now(),
    payload: normalizeTelemetryPayload(payload),
  };
  const nextEvents = [...state.events, nextEvent].slice(-TELEMETRY_MAX_EVENTS);
  return {
    version: 0,
    events: nextEvents,
  };
}

function createInitialBaselineMetricsState(): BaselineMetricsState {
  return {
    version: 0,
    counters: {
      matchesCompleted: 0,
      turnsEnded: 0,
      cardsPlayed: 0,
      aiTurns: 0,
    },
    recentTurnDurationsMs: [],
    recentAiTurnDurationsMs: [],
    recentCardActionLatencyMs: [],
    updatedAt: null,
  };
}

function normalizeMetricSample(value: unknown): number | null {
  const num = Math.floor(Number(value));
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.min(num, 600_000);
}

function normalizeMetricSamples(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeMetricSample(item))
    .filter((item): item is number => item !== null)
    .slice(-BASELINE_MAX_SAMPLES);
}

function normalizeBaselineMetricsState(value: unknown): BaselineMetricsState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<BaselineMetricsState>;
  if (candidate.version !== 0) return null;

  const countersRaw = candidate.counters;
  if (!countersRaw || typeof countersRaw !== 'object') return null;

  const matchesCompleted = Math.max(
    0,
    Math.floor(Number((countersRaw as Record<string, unknown>).matchesCompleted) || 0)
  );
  const turnsEnded = Math.max(0, Math.floor(Number((countersRaw as Record<string, unknown>).turnsEnded) || 0));
  const cardsPlayed = Math.max(0, Math.floor(Number((countersRaw as Record<string, unknown>).cardsPlayed) || 0));
  const aiTurns = Math.max(0, Math.floor(Number((countersRaw as Record<string, unknown>).aiTurns) || 0));

  const updatedAtRaw = Number(candidate.updatedAt);
  const updatedAt = Number.isFinite(updatedAtRaw) && updatedAtRaw > 0 ? Math.floor(updatedAtRaw) : null;

  return {
    version: 0,
    counters: {
      matchesCompleted,
      turnsEnded,
      cardsPlayed,
      aiTurns,
    },
    recentTurnDurationsMs: normalizeMetricSamples(candidate.recentTurnDurationsMs),
    recentAiTurnDurationsMs: normalizeMetricSamples(candidate.recentAiTurnDurationsMs),
    recentCardActionLatencyMs: normalizeMetricSamples(candidate.recentCardActionLatencyMs),
    updatedAt,
  };
}

function loadBaselineMetricsState(): BaselineMetricsState {
  if (typeof window === 'undefined') return createInitialBaselineMetricsState();
  try {
    const raw = window.localStorage.getItem(BASELINE_STORAGE_KEY);
    if (!raw) return createInitialBaselineMetricsState();
    const parsed = normalizeBaselineMetricsState(JSON.parse(raw));
    return parsed ?? createInitialBaselineMetricsState();
  } catch {
    return createInitialBaselineMetricsState();
  }
}

function saveBaselineMetricsState(state: BaselineMetricsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

function appendMetricSample(samples: number[], valueMs: number): number[] {
  const normalized = normalizeMetricSample(valueMs);
  if (normalized === null) return samples;
  return [...samples, normalized].slice(-BASELINE_MAX_SAMPLES);
}

function withBaselineUpdatedAt(state: BaselineMetricsState): BaselineMetricsState {
  return {
    ...state,
    updatedAt: Date.now(),
  };
}

function recordBaselineTurnEnded(state: BaselineMetricsState, durationMs: number): BaselineMetricsState {
  return withBaselineUpdatedAt({
    ...state,
    counters: {
      ...state.counters,
      turnsEnded: state.counters.turnsEnded + 1,
    },
    recentTurnDurationsMs: appendMetricSample(state.recentTurnDurationsMs, durationMs),
  });
}

function recordBaselineAiTurn(state: BaselineMetricsState, durationMs: number): BaselineMetricsState {
  return withBaselineUpdatedAt({
    ...state,
    counters: {
      ...state.counters,
      aiTurns: state.counters.aiTurns + 1,
    },
    recentAiTurnDurationsMs: appendMetricSample(state.recentAiTurnDurationsMs, durationMs),
  });
}

function recordBaselineCardPlayed(state: BaselineMetricsState, actionLatencyMs: number): BaselineMetricsState {
  return withBaselineUpdatedAt({
    ...state,
    counters: {
      ...state.counters,
      cardsPlayed: state.counters.cardsPlayed + 1,
    },
    recentCardActionLatencyMs: appendMetricSample(state.recentCardActionLatencyMs, actionLatencyMs),
  });
}

function recordBaselineMatchCompleted(state: BaselineMetricsState): BaselineMetricsState {
  return withBaselineUpdatedAt({
    ...state,
    counters: {
      ...state.counters,
      matchesCompleted: state.counters.matchesCompleted + 1,
    },
  });
}

function averageMetricMs(samples: number[]): number {
  if (samples.length === 0) return 0;
  const total = samples.reduce((sum, item) => sum + item, 0);
  return Math.round(total / samples.length);
}

function useMessageFeed() {
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
      const msg: GameMessage = { id, type, text, emoji, createdAt: Date.now(), duration };
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

function MessageFeed({
  messages,
  onDismiss,
}: {
  messages: GameMessage[];
  onDismiss?: (id: number) => void;
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
      className="absolute z-layer-ui pointer-events-none left-3"
      style={{
        top: 'clamp(55px, 7vh, 80px)',
        width: 'clamp(260px, 22vw, 380px)',
        maxHeight: 'clamp(200px, 35vh, 400px)',
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
                      «{msg.text}»
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
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyQuestsPanel({ quests }: { quests: DailyQuestState }) {
  return (
    <UICard className="bg-[#12101a]/85 border border-[#c9a84c]/20 p-2 rounded-lg w-[260px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-heading text-[#f0d68a] text-[11px]">📅 Daily Quests</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-gray-600/60 text-gray-300">
          v0
        </Badge>
      </div>
      <div className="flex flex-col gap-1.5">
        {DAILY_QUEST_META.map((quest) => {
          const value = quests.progress[quest.id];
          const pct = Math.min(100, (value / DAILY_QUEST_TARGET) * 100);
          const done = value >= DAILY_QUEST_TARGET;
          return (
            <div key={quest.id}>
              <div className="flex items-center justify-between text-[10px] leading-tight mb-0.5">
                <span className={done ? 'text-[#f0d68a]' : 'text-gray-300'}>{quest.label}</span>
                <span className={done ? 'text-[#f0d68a]' : 'text-gray-400'}>
                  {Math.min(value, DAILY_QUEST_TARGET)}/{DAILY_QUEST_TARGET}
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          );
        })}
      </div>
    </UICard>
  );
}

function AchievementsPanel({ achievements }: { achievements: AchievementsState }) {
  return (
    <UICard className="bg-[#12101a]/85 border border-[#c9a84c]/20 p-2 rounded-lg w-[240px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-heading text-[#f0d68a] text-[11px]">🏆 Achievements</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-gray-600/60 text-gray-300">
          v0
        </Badge>
      </div>
      <div className="flex flex-col gap-1">
        {ACHIEVEMENTS_META.map((achievement) => {
          const unlocked = achievements.unlocked[achievement.id];
          return (
            <div
              key={achievement.id}
              className={cn(
                'flex items-center justify-between text-[10px] px-1 py-0.5 rounded',
                unlocked ? 'bg-[#f0d68a]/10 text-[#f0d68a]' : 'text-gray-400'
              )}
            >
              <span className="truncate">
                {achievement.emoji} {achievement.label}
              </span>
              <span className={unlocked ? 'text-[#f0d68a]' : 'text-gray-600'}>{unlocked ? '✓' : '•'}</span>
            </div>
          );
        })}
      </div>
    </UICard>
  );
}

function XPProfilePanel({ profile }: { profile: XPProfileState }) {
  return (
    <UICard className="bg-[#12101a]/85 border border-[#c9a84c]/20 p-2 rounded-lg w-[180px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-heading text-[#f0d68a] text-[11px]">⭐ Profile</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-gray-600/60 text-gray-300">
          XP v0
        </Badge>
      </div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-gray-300">Level {profile.level}</span>
        <span className="text-[#f0d68a]">
          {profile.xpInLevel}/{XP_PER_LEVEL}
        </span>
      </div>
      <Progress value={(profile.xpInLevel / XP_PER_LEVEL) * 100} className="h-1.5" />
    </UICard>
  );
}

function BaselineMetricsPanel({ metrics }: { metrics: BaselineMetricsState }) {
  const avgTurn = averageMetricMs(metrics.recentTurnDurationsMs);
  const avgAiTurn = averageMetricMs(metrics.recentAiTurnDurationsMs);
  const avgAction = averageMetricMs(metrics.recentCardActionLatencyMs);

  return (
    <UICard className="bg-[#12101a]/85 border border-[#c9a84c]/20 p-2 rounded-lg w-[230px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-heading text-[#f0d68a] text-[11px]">📈 Baseline</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-gray-600/60 text-gray-300">
          v0
        </Badge>
      </div>
      <div className="text-[10px] text-gray-300 leading-tight space-y-0.5">
        <div>avg turn: {avgTurn}ms</div>
        <div>avg ai: {avgAiTurn}ms</div>
        <div>avg action: {avgAction}ms</div>
        <div className="text-gray-400 pt-0.5">
          m:{metrics.counters.matchesCompleted} t:{metrics.counters.turnsEnded} c:{metrics.counters.cardsPlayed} ai:{metrics.counters.aiTurns}
        </div>
      </div>
    </UICard>
  );
}

/* ═══ PLAYER AREA (inline) ═══ */
function PlayerArea({
  player,
  isCurrentPlayer,
  label,
  heroIcon,
  dataEnemyHero,
}: {
  player: PlayerState;
  isCurrentPlayer: boolean;
  label: string;
  heroIcon: string;
  dataEnemyHero?: boolean;
}) {
  const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
  const getHealthVariant = () => {
    const hpPercent = (player.health / player.maxHealth) * 100;
    if (hpPercent > 60) return 'success';
    if (hpPercent > 30) return 'warning';
    return 'danger';
  };
  const healthVariant = getHealthVariant();

  // Count active defender cards on field (exclude frozen and dead)
  const defenderCount = player.field.filter(
    (c) => c.keywords.includes('defender') && c.frozen <= 0 && c.currentHealth > 0
  ).length;

  return (
    <UICard
      data-slot="card"
      data-enemy-hero={dataEnemyHero ? 'true' : undefined}
      className={cn(
        'flex flex-col gap-0.5 p-1.5 border transition-all shrink-0',
        isCurrentPlayer
          ? 'bg-[#1a1508]/50 border-[#c9a84c]/30 shadow-lg shadow-[#c9a84c]/10'
          : 'bg-[#0f0f18]/50 border-gray-800/30'
      )}
      role="region"
      aria-label={label}
    >
      {/* Row 1: Avatar + Name + Counters */}
      <div className="flex items-center gap-1.5 w-full">
        <div
          className={cn(
            'rounded-full flex items-center justify-center shrink-0 border',
            isCurrentPlayer ? 'bg-[#2a1a08] border-[#c9a84c]/50' : 'bg-[#1a1a2a] border-gray-700/50'
          )}
          style={{
            width: 'clamp(24px, 2.5vw, 36px)',
            height: 'clamp(24px, 2.5vw, 36px)',
            fontSize: 'clamp(11px, 1.3vw, 18px)',
          }}
        >
          {heroIcon}
        </div>
        <span
          className="font-heading text-white font-bold truncate"
          style={{ fontSize: 'clamp(9px, 1vw, 13px)' }}
        >
          {label}
        </span>
        {isCurrentPlayer && (
          <Badge
            variant="secondary"
            className="animate-pulse bg-[#f0d68a]/20 text-[#f0d68a] border-transparent text-[9px] h-4 px-1"
          >
            ⚡
          </Badge>
        )}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <Tooltip>
            <TooltipTrigger>
              <Badge
                variant="outline"
                className="gap-0.5 text-[9px] h-4 px-1 min-w-0"
                aria-label={`Рука: ${player.hand.length}`}
              >
                <span>🤚</span>
                <span className="text-[8px] text-gray-400">Р</span>
                <span>{player.hand.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">Рука: {player.hand.length}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Badge
                variant="outline"
                className="gap-0.5 text-[9px] h-4 px-1 min-w-0"
                aria-label={`Колода: ${player.deck.length}`}
              >
                <span>📚</span>
                <span className="text-[8px] text-gray-400">К</span>
                <span>{player.deck.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">Колода: {player.deck.length}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Badge
                variant="outline"
                className="gap-0.5 text-[9px] h-4 px-1 min-w-0"
                aria-label={`Кладбище: ${player.graveyard.length}`}
              >
                <span>💀</span>
                <span className="text-[8px] text-gray-400">С</span>
                <span>{player.graveyard.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">Кладбище: {player.graveyard.length}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Row 2: HP bar + Mana + Defenders */}
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <Progress
              value={healthPercent}
              className={cn(
                'h-3 transition-all duration-500',
                healthVariant === 'success' && 'progress-success',
                healthVariant === 'warning' && 'progress-warning',
                healthVariant === 'danger' && 'progress-danger'
              )}
            />
            <span
              className="absolute inset-0 flex items-center justify-center font-heading font-bold text-white drop-shadow"
              style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}
            >
              ❤️ {player.health}/{player.maxHealth}
            </span>
          </div>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-0.5 shrink-0">
              <div className="flex gap-px">
                {Array.from({ length: Math.min(player.maxMana, 12) }, (_, i) => (
                  <Badge
                    key={i}
                    variant={i < player.mana ? 'mana-available' : 'mana-spent'}
                    className="w-2 h-2 rounded-full p-0 min-w-0"
                  />
                ))}
              </div>
              <span
                className="text-blue-300 font-heading font-bold"
                style={{ fontSize: 'clamp(8px, 0.8vw, 11px)' }}
              >
                💎{player.mana}/{player.maxMana}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Мана: {player.mana} / {player.maxMana}</p>
          </TooltipContent>
        </Tooltip>
        </div>

        {/* Defender count row */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 font-heading">
          <span>🛡️</span>
          <span>Защитники: {defenderCount}</span>
        </div>
      </div>
    </UICard>
  );
}

/* ═══ CARD CONTAINERS ═══ */
function CardContainer({
  className,
  children,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; ref?: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      {...props}
      ref={ref}
      className={cn(
        'relative w-full h-full transition-transform duration-200 ease-out transform-gpu origin-bottom',
        className
      )}
    >
      {children}
    </div>
  );
}

function CardVisual({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <UICard className={cn('relative w-full h-full overflow-hidden', className)}>{children}</UICard>
  );
}

/* ═══ HAND CARD ═══ */
function HandCardComponent({
  card,
  selected,
  canPlay,
  isLand,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  card: CardInstance;
  selected?: boolean;
  canPlay?: boolean;
  isLand?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const art = getCardCoverSources(card.data);

  return (
    <CardContainer
      onClick={onClick}
      draggable={canPlay}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'card-container card-hand-container cursor-pointer rounded-lg',
        selected &&
          'border-yellow-400 shadow-yellow-400/50 shadow-lg -translate-y-4 scale-110 z-layer-hover',
        canPlay &&
          isLand &&
          'border-[#c9a84c] shadow-[#c9a84c]/30 shadow-lg card-glow hover:scale-105',
        canPlay && !isLand && 'border-green-500/60 shadow-green-500/15 shadow-md hover:scale-105',
        !canPlay && !selected && 'border-gray-700/40 opacity-45',
        canPlay && 'cursor-grab active:cursor-grabbing'
      )}
      style={{ width: 'var(--hand-card-w)', height: 'var(--hand-card-h)' }}
      role="button"
      tabIndex={0}
      aria-label={`${card.data.name} (${card.data.cost} маны)`}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <CardVisual className="card-frame card-in-hand card-visual border-2">
        {(card.data.rarity === 'mythic' || card.data.rarity === 'rare') && (
          <div
            className={`card-foil-overlay pointer-events-none z-layer-card-effects ${card.data.rarity === 'mythic' ? 'opacity-50' : 'opacity-30'}`}
          />
        )}
        <div className={`absolute inset-0 ${COLOR_ART[card.data.color]}`} />
        {art.src && (
          <img
            src={art.src}
            data-fallback={art.fallback}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            loading="lazy"
            draggable={false}
            onError={(e) => handleImageErrorWithFallback(e.currentTarget)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
        <CardContent className="relative z-layer-cards flex flex-col h-full p-[clamp(2px,0.3vw,5px)] text-white">
          <div className="flex justify-between items-start">
            <span style={{ fontSize: 'clamp(14px, 1.8vw, 28px)' }}>{card.data.emoji}</span>
            <Badge
              variant={isLand ? 'default' : canPlay ? 'default' : 'secondary'}
              className={cn(
                'rounded-full flex items-center justify-center font-bold font-heading min-w-[22px] h-[22px] px-1.5',
                isLand && 'bg-[#c9a84c] text-black',
                canPlay && !isLand && 'bg-blue-500 text-white',
                !canPlay && !isLand && 'bg-gray-700 text-gray-400'
              )}
              style={{ fontSize: 'clamp(8px, 0.9vw, 12px)' }}
            >
              {card.data.cost}
            </Badge>
          </div>
          <h3
            className="font-heading text-white font-bold leading-tight mt-auto"
            style={{ fontSize: 'clamp(5px, 0.7vw, 9px)' }}
          >
            {card.data.name}
          </h3>
          {card.data.type === 'creature' && (
            <div className="flex justify-between items-end mt-0.5">
              <Badge
                variant="destructive"
                className="bg-red-700/90 text-red-300 font-bold font-heading rounded px-1 py-0 leading-tight"
                style={{ fontSize: 'clamp(9px, 1vw, 12px)' }}
              >
                {card.data.attack}⚔
              </Badge>
              <Badge
                className="bg-green-700/90 text-green-300 font-bold font-heading rounded px-1 py-0 leading-tight"
                style={{ fontSize: 'clamp(9px, 1vw, 12px)' }}
              >
                {card.data.health}❤
              </Badge>
            </div>
          )}
          {card.data.type === 'land' && (
            <div
              className="text-[#c9a84c] font-bold text-center"
              style={{ fontSize: 'clamp(8px, 1vw, 12px)' }}
            >
              🏔️
            </div>
          )}
          {card.data.type === 'spell' && (
            <div
              className="text-blue-300 text-center"
              style={{ fontSize: 'clamp(8px, 1vw, 12px)' }}
            >
              ✨
            </div>
          )}
          {card.data.type === 'enchantment' && (
            <div
              className="text-purple-300 text-center"
              style={{ fontSize: 'clamp(8px, 1vw, 12px)' }}
            >
              🔮
            </div>
          )}
        </CardContent>
        {canPlay && !selected && (
          <div
            className={`absolute top-1 right-1 rounded-full animate-pulse z-layer-card-effects ${isLand ? 'bg-[#c9a84c]' : 'bg-green-400'}`}
            style={{ width: 'clamp(4px, 0.5vw, 8px)', height: 'clamp(4px, 0.5vw, 8px)' }}
          />
        )}
      </CardVisual>
    </CardContainer>
  );
}

/* ═══ DECK STACK ═══ */
function DeckStack({
  count,
  type,
  cardBackSrc,
  label,
}: {
  count: number;
  type: 'deck' | 'graveyard';
  cardBackSrc?: string;
  label: string;
}) {
  const isDeck = type === 'deck';
  return (
    <Tooltip>
      <TooltipTrigger>
        <div className={isDeck ? 'deck-zone' : 'graveyard-zone'}>
          {isDeck && cardBackSrc ? (
            <img
              src={cardBackSrc}
              alt="Колода"
              className="w-full h-full object-cover rounded-[5px] opacity-80"
              draggable={false}
            />
          ) : (
            <span style={{ fontSize: 'clamp(14px, 1.8vw, 22px)' }}>
              {isDeck ? '🂠' : '💀'}
            </span>
          )}
          <span className={isDeck ? 'deck-count' : 'graveyard-count'}>{count}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}: {count}
      </TooltipContent>
    </Tooltip>
  );
}

/* ═══ MAIN GAME BOARD ═══ */
export function GameBoard({ mode, onBack }: Props) {
  const [gs, setGs] = useState<GameState>(createInitialGameStateForActiveDeck);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [selectedAttackerSlot, setSelectedAttackerSlot] = useState<number | null>(null);
  const [inspected, setInspected] = useState<{
    card: CardInstance;
    owner: 'player1' | 'player2';
  } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const aiActionStatusState = useState<string | null>(null);
  const setAiActionStatus = aiActionStatusState[1];
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const seenStoryEventsRef = useRef<Set<number>>(new Set());
  const [dragCardUid, setDragCardUid] = useState<string | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [attackAnimUid, setAttackAnimUid] = useState<string | null>(null);
  const [damageAnimUid, setDamageAnimUid] = useState<string | null>(null);
  const playAnimState = useState<{ name: string; emoji: string; color: string } | null>(null);
  const setPlayAnim = playAnimState[1];
  const [deathAnim, setDeathAnim] = useState<{ name: string; emoji: string; color: string } | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<
    Array<{ id: number; value: number; x: number; y: number; type: 'damage' | 'heal' | 'buff' }>
  >([]);
  const [statFloats, setStatFloats] = useState<
    Array<{ id: number; value: string; x: number; y: number; className: string }>
  >([]);
  const [screenShake, setScreenShake] = useState(false);
  const [explosionFlash, setExplosionFlash] = useState(false);
  const [dyingCards, setDyingCards] = useState<Set<string>>(new Set());
  const [cardDeathEffects, setCardDeathEffects] = useState<Map<string, 'fire' | 'poison' | 'ice'>>(new Map());
  const targetingLineState = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  // Attack notification state - shows when creatures can attack and player has mana
  const [showAttackNotification, setShowAttackNotification] = useState(false);
  const [hasPlayedNonLandCardThisTurn, setHasPlayedNonLandCardThisTurn] = useState(false);
  const [dailyQuests, setDailyQuests] = useState<DailyQuestState>(() => loadDailyQuestState());
  const [achievements, setAchievements] = useState<AchievementsState>(() => loadAchievementsState());
  const [xpProfile, setXpProfile] = useState<XPProfileState>(() => loadXPProfileState());
  const [telemetry, setTelemetry] = useState<TelemetryBufferState>(() => loadTelemetryBufferState());
  const [baselineMetrics, setBaselineMetrics] = useState<BaselineMetricsState>(() =>
    loadBaselineMetricsState()
  );
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  });
  const prevTurnRef = useRef<{ turnNumber: number; currentTurn: GameState['currentTurn'] }>({
    turnNumber: gs.turnNumber,
    currentTurn: gs.currentTurn,
  });
  const prevGameOverRef = useRef(gs.gameOver);
  const prevQuestProgressRef = useRef(dailyQuests.progress);
  const prevAchievementsUnlockedRef = useRef(achievements.unlocked);
  const prevTutorialHintRef = useRef<string | null>(null);
  const turnStartedAtRef = useRef<number>(Date.now());
  const aiTurnStartedAtRef = useRef<number | null>(null);
  const setTargetingLine = targetingLineState[1];
  const attackAnimTimerRef = useRef<number | null>(null);
  const damageAnimTimerRef = useRef<number | null>(null);
  const aiAnimTimerRef = useRef<number | null>(null);
  const aiTurnTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const prevFieldRef = useRef<{ p1: string[]; p2: string[] }>({ p1: [], p2: [] });
  const prevHandRef = useRef<string[]>([]);
  const [newlyDrawnUids, setNewlyDrawnUids] = useState<Set<string>>(new Set());
  const [newlyPlayedUids, setNewlyPlayedUids] = useState<Set<string>>(new Set());
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const handCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { messages, addMessage, clear: clearMessages, dismiss: dismissMessage } = useMessageFeed();

  const isP1Turn = gs.currentTurn === 'player1';
  const myTurn = mode === 'ai' ? isP1Turn : true;
  const me = gs.player1;
  const enemy = gs.player2;
  const cardBackSrc = getCardBackSource();

  const recordTelemetry = useCallback(
    (name: TelemetryEventName, payload: TelemetryPayload = {}) => {
      setTelemetry((prev) => pushTelemetryEvent(prev, name, payload));
    },
    []
  );

  useEffect(() => {
    saveDailyQuestState(dailyQuests);
  }, [dailyQuests]);

  useEffect(() => {
    saveAchievementsState(achievements);
  }, [achievements]);

  useEffect(() => {
    saveXPProfileState(xpProfile);
  }, [xpProfile]);

  useEffect(() => {
    saveTelemetryBufferState(telemetry);
  }, [telemetry]);

  useEffect(() => {
    saveBaselineMetricsState(baselineMetrics);
  }, [baselineMetrics]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const todayKey = getLocalDateKey();
      setDailyQuests((prev) =>
        prev.dateKey === todayKey ? prev : createInitialDailyQuestState(todayKey)
      );
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!prevGameOverRef.current && gs.gameOver) {
      recordTelemetry('match_completed', {
        turnNumber: gs.turnNumber,
        playerHealth: gs.player1.health,
      });
      if (gs.player1.health > 0) {
        recordTelemetry('match_victory', {
          turnNumber: gs.turnNumber,
          playerHealth: gs.player1.health,
        });
      }
      setDailyQuests((prev) => incrementDailyQuest(prev, 'complete_match'));
      setAchievements((prev) => {
        let next = unlockAchievementState(prev, 'first_match_complete');
        if (gs.player1.health > 0) {
          next = unlockAchievementState(next, 'first_victory');
        }
        return next;
      });
      setBaselineMetrics((prev) => recordBaselineMatchCompleted(prev));
      setXpProfile((prev) => {
        const completionXP = 50;
        const victoryBonusXP = gs.player1.health > 0 ? 25 : 0;
        return awardXP(prev, completionXP + victoryBonusXP);
      });
    }
    prevGameOverRef.current = gs.gameOver;
  }, [gs.gameOver, gs.player1.health, gs.turnNumber, recordTelemetry]);

  useEffect(() => {
    const previous = prevQuestProgressRef.current;
    for (const quest of DAILY_QUEST_META) {
      const before = previous[quest.id] ?? 0;
      const after = dailyQuests.progress[quest.id] ?? 0;
      if (before < DAILY_QUEST_TARGET && after >= DAILY_QUEST_TARGET) {
        recordTelemetry('daily_quest_completed', {
          questId: quest.id,
          dateKey: dailyQuests.dateKey,
        });
      }
    }
    prevQuestProgressRef.current = dailyQuests.progress;
  }, [dailyQuests, recordTelemetry]);

  useEffect(() => {
    const previous = prevAchievementsUnlockedRef.current;
    for (const achievement of ACHIEVEMENTS_META) {
      const wasUnlocked = previous[achievement.id];
      const isUnlocked = achievements.unlocked[achievement.id];
      if (!wasUnlocked && isUnlocked) {
        recordTelemetry('achievement_unlocked', {
          achievementId: achievement.id,
        });
      }
    }
    prevAchievementsUnlockedRef.current = achievements.unlocked;
  }, [achievements, recordTelemetry]);

  useEffect(() => {
    const currentP1 = me.field.map((c) => c.uid);
    const currentP2 = enemy.field.map((c) => c.uid);
    const prev = prevFieldRef.current;
    if (prev.p1.length > 0 || prev.p2.length > 0) {
      const diedP1 = prev.p1.filter((uid) => !currentP1.includes(uid));
      const diedP2 = prev.p2.filter((uid) => !currentP2.includes(uid));
      const allDied = [...diedP1, ...diedP2];
      if (allDied.length > 0) {
        const allGraveCards = [...me.graveyard, ...enemy.graveyard];
        const deadCard = allGraveCards.find((c) => allDied.includes(c.uid));
        if (deadCard && !deathAnim) {
          setDeathAnim({
            name: deadCard.data.name,
            emoji: deadCard.data.emoji,
            color: deadCard.data.color,
          });
        }
        const recent = gs.log.slice(-5).join(' ');
        for (const [cardId, quote] of Object.entries(DEATH_QUOTES)) {
          if (recent.includes(cardId) || recent.toLowerCase().includes(cardId.replace(/_/g, ' '))) {
            addMessage('death', quote, '💀', 5000);
            break;
          }
        }
      }
    }
    prevFieldRef.current = { p1: currentP1, p2: currentP2 };
  // Intentionally omitting addMessage, deathAnim, me.graveyard, enemy.graveyard, gs.log
  // to avoid re-running on every state change; using refs for graveyard lookup is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.field, enemy.field]);

  // Clear death effects after animation completes
  useEffect(() => {
    if (dyingCards.size > 0) {
      const timer = setTimeout(() => {
        setDyingCards(new Set());
        setCardDeathEffects(new Map());
      }, 700); // Match fire/poison animation duration
      return () => clearTimeout(timer);
    }
  }, [dyingCards]);

  /* ── Draw animation: detect new cards in hand ── */
  useEffect(() => {
    const currentUids = me.hand.map((c) => c.uid);
    const prevUids = prevHandRef.current;
    if (prevUids.length > 0) {
      const drawn = currentUids.filter((uid) => !prevUids.includes(uid));
      if (drawn.length > 0) {
        setNewlyDrawnUids(new Set(drawn));
        const t = setTimeout(() => setNewlyDrawnUids(new Set()), 400);
        return () => clearTimeout(t);
      }
    }
    prevHandRef.current = currentUids;
  }, [me.hand]);

  useEffect(() => {
    const currentHandUids = new Set(me.hand.map((c) => c.uid));
    for (const uid of handCardRefs.current.keys()) {
      if (!currentHandUids.has(uid)) {
        handCardRefs.current.delete(uid);
      }
    }
  }, [me.hand]);

  /* ── Play animation: detect new cards on field ── */
  useEffect(() => {
    const currentP1 = me.field.map((c) => c.uid);
    const prev = prevFieldRef.current.p1;
    if (prev.length > 0) {
      const played = currentP1.filter((uid) => !prev.includes(uid));
      if (played.length > 0) {
        setNewlyPlayedUids(new Set(played));
        const t = setTimeout(() => setNewlyPlayedUids(new Set()), 450);
        return () => clearTimeout(t);
      }
    }
  }, [me.field]);

  useEffect(() => {
    const ev = STORY_EVENTS.find(
      (e) => e.turnTrigger === gs.turnNumber && !seenStoryEventsRef.current.has(e.turnTrigger)
    );
    if (ev) {
      addMessage('story', ev.text, ev.emoji);
      seenStoryEventsRef.current.add(ev.turnTrigger);
    }
  }, [gs.turnNumber, addMessage]);

  const hasPlayableLand =
    me.hand.some((c) => c.data.type === 'land') && me.landsPlayed < me.maxLandsPerTurn;
  const hasPlayableCard = me.hand.some((c) => c.data.type !== 'land' && c.data.cost <= me.mana);
  const hasAttackers = me.field.some(
    (c) =>
      !c.summoningSickness && !c.hasAttacked && c.frozen <= 0 && !c.keywords.includes('defender')
  );
  const landPlayed = me.landsPlayed > 0;

  useEffect(() => {
    const prev = prevTurnRef.current;
    if (prev.turnNumber !== gs.turnNumber || prev.currentTurn !== gs.currentTurn) {
      const now = Date.now();
      const previousTurnDuration = now - turnStartedAtRef.current;
      if (prev.currentTurn === 'player1' && previousTurnDuration > 0) {
        setBaselineMetrics((prevMetrics) => recordBaselineTurnEnded(prevMetrics, previousTurnDuration));
      }
      turnStartedAtRef.current = now;
      setHasPlayedNonLandCardThisTurn(false);
      prevTurnRef.current = { turnNumber: gs.turnNumber, currentTurn: gs.currentTurn };
    }
  }, [gs.turnNumber, gs.currentTurn]);

  // Show attack notification when attackers available and player has mana
  const canShowAttackNotification = myTurn && !gs.gameOver && hasAttackers && me.mana > 0;
  // Show notification when conditions are met and we haven't dismissed it yet
  useEffect(() => {
    if (canShowAttackNotification) {
      // Show notification when attackers become available with mana
      setShowAttackNotification(true);
    } else {
      // Hide when conditions no longer met
      setShowAttackNotification(false);
    }
  }, [canShowAttackNotification]);

  // Hide notification when player makes an attack
  useEffect(() => {
    if (selectedAttacker) {
      setShowAttackNotification(false);
    }
  }, [selectedAttacker]);

  const phase = (() => {
    if (!myTurn || gs.gameOver) return 'done' as const;
    if (hasPlayableLand && !landPlayed) return 'land' as const;
    if (hasPlayableCard || hasPlayableLand) return 'play' as const;
    if (hasAttackers) return 'attack' as const;
    return 'done' as const;
  })();

  const tutorialVisible = gs.turnNumber <= 3 && !gs.gameOver && !tutorialCompleted;
  const tutorialHintKey = (() => {
    if (!tutorialVisible) return null;
    if (hasPlayableLand && !landPlayed) return 'play_land';
    if (hasPlayableCard && !hasPlayedNonLandCardThisTurn) return 'play_non_land';
    if (hasAttackers && myTurn && phase === 'attack') return 'attack';
    return 'end_turn';
  })();

  useEffect(() => {
    if (!tutorialVisible || !tutorialHintKey) {
      prevTutorialHintRef.current = null;
      return;
    }
    if (prevTutorialHintRef.current !== tutorialHintKey) {
      recordTelemetry('tutorial_hint_shown', {
        hint: tutorialHintKey,
        turnNumber: gs.turnNumber,
      });
      prevTutorialHintRef.current = tutorialHintKey;
    }
  }, [tutorialVisible, tutorialHintKey, gs.turnNumber, recordTelemetry]);

  const showCardNarrative = useCallback(
    (cardId: string) => {
      const n = CARD_NARRATIVES[cardId];
      if (n) addMessage('narrative', n, '📖', 5000);
    },
    [addMessage]
  );

  const getHint = (): string => {
    if (gs.gameOver) return '🏁 Игра окончена!';
    if (!myTurn) return `⏳ ${AI_CHARACTER.name} размышляет...`;
    if (selectedAttacker) return '🎯 Выберите ЦЕЛЬ: вражеское существо или «В героя»';
    if (dragCardUid) return '🖱️ Перетащите карту на ПОЛЕ чтобы разыграть';
    if (gs.turnNumber <= 2 && !landPlayed && hasPlayableLand)
      return '🏔️ ШАГ 1: Перетащите ЗЕМЛЮ на поле (или двойной клик)';
    if (gs.turnNumber <= 2 && landPlayed && hasPlayableCard)
      return '🃏 ШАГ 2: Перетащите существо на поле';
    if (gs.turnNumber <= 2 && !hasPlayableCard && hasAttackers)
      return '⚔️ ШАГ 3: Кликните существо с зелёной рамкой → атакуйте';
    if (gs.turnNumber <= 2 && !hasPlayableCard && !hasAttackers) return '⏭️ Нажмите «Конец хода»';
    if (hasPlayableLand && !landPlayed)
      return '🏔️ Разыграйте ЗЕМЛЮ (перетащите на поле или двойной клик)';
    if (hasPlayableCard && hasAttackers) return '🃏 Играйте карту или ⚔️ атакуйте';
    if (hasPlayableCard) return '🃏 Перетащите карту на поле или двойной клик';
    if (hasAttackers) return '⚔️ Выберите существо для атаки (зелёная рамка)';
    return '⏭️ Нажмите «Конец хода»';
  };

  const triggerCombatAnims = useCallback((attackerUid?: string, defenderUid?: string) => {
    if (attackAnimTimerRef.current) {
      window.clearTimeout(attackAnimTimerRef.current);
      attackAnimTimerRef.current = null;
    }
    if (damageAnimTimerRef.current) {
      window.clearTimeout(damageAnimTimerRef.current);
      damageAnimTimerRef.current = null;
    }
    if (attackerUid) setAttackAnimUid(attackerUid);
    if (defenderUid) setDamageAnimUid(defenderUid);
    if (attackerUid) {
      attackAnimTimerRef.current = window.setTimeout(() => setAttackAnimUid(null), 650);
    }
    if (defenderUid) {
      damageAnimTimerRef.current = window.setTimeout(() => setDamageAnimUid(null), 250);
    }
  }, []);

  const showDamageNumber = useCallback(
    (value: number, x: number, y: number, type: 'damage' | 'heal' | 'buff' = 'damage') => {
      const id = Date.now() + Math.random();
      setDamageNumbers((prev) => [...prev, { id, value, x, y, type }]);
      setTimeout(() => setDamageNumbers((prev) => prev.filter((dn) => dn.id !== id)), 800);
    },
    []
  );

  const showStatChange = useCallback(
    (value: string, x: number, y: number, className: string) => {
      const id = Date.now() + Math.random();
      setStatFloats((prev) => [...prev, { id, value, x, y, className }]);
      setTimeout(() => setStatFloats((prev) => prev.filter((sf) => sf.id !== id)), 800);
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (attackAnimTimerRef.current) window.clearTimeout(attackAnimTimerRef.current);
      if (damageAnimTimerRef.current) window.clearTimeout(damageAnimTimerRef.current);
      if (aiAnimTimerRef.current) window.clearTimeout(aiAnimTimerRef.current);
      if (aiTurnTimerRef.current) window.clearTimeout(aiTurnTimerRef.current);
      aiTurnStartedAtRef.current = null;
    };
  }, []);

  const runAIAnimations = useCallback(
    (
      actions: {
        type: 'attack-hero' | 'attack-creature';
        attackerUid: string;
        defenderUid?: string;
      }[]
    ) => {
      if (!actions || actions.length === 0) return;
      if (aiAnimTimerRef.current) {
        window.clearTimeout(aiAnimTimerRef.current);
        aiAnimTimerRef.current = null;
      }
      let idx = 0;
      const step = () => {
        const act = actions[idx];
        if (!act) return;
        triggerCombatAnims(
          act.attackerUid,
          act.type === 'attack-creature' ? act.defenderUid : undefined
        );
        idx += 1;
        if (idx < actions.length) {
          aiAnimTimerRef.current = window.setTimeout(step, 750);
        }
      };
      step();
    },
    [triggerCombatAnims]
  );

  const runAI = useCallback(() => {
    if (mode !== 'ai' || gs.currentTurn !== 'player2' || gs.gameOver) return;
    if (aiTurnTimerRef.current) {
      window.clearTimeout(aiTurnTimerRef.current);
      aiTurnTimerRef.current = null;
    }
    aiTurnStartedAtRef.current = Date.now();
    setAiThinking(true);
    setAiActionStatus(null);
    aiTurnTimerRef.current = window.setTimeout(() => {
      aiTurnTimerRef.current = null;
      if (!mountedRef.current) return;
      const result = aiTurn(gs);
      setGs(result.state);
      if (result.actions && result.actions.length > 0) {
        const atkInfo = result.actions.find(
          (a) => a.type === 'attack-hero' || a.type === 'attack-creature'
        );
        if (atkInfo) {
          const attacker = result.state.player2.field.find((c) => c.uid === atkInfo.attackerUid);
          if (attacker)
            setAiActionStatus(
              atkInfo.type === 'attack-hero'
                ? `⚔️ ${attacker.data.emoji} ${attacker.data.name} атакует героя!`
                : `⚔️ ${attacker.data.emoji} ${attacker.data.name} атакует!`
            );
        }
        runAIAnimations(result.actions);
      }
      const lastCard = result.state.player2.field[result.state.player2.field.length - 1];
      if (lastCard && (!result.actions || result.actions.length === 0)) {
        setAiActionStatus(`✨ Сыграно: ${lastCard.data.emoji} ${lastCard.data.name}`);
      }
      if (lastCard) showCardNarrative(lastCard.data.id);
      const lore = getAILoreComment(lastCard?.data.id || '');
      addMessage('ai', lore, AI_CHARACTER.avatarEmoji);
      const aiStartedAt = aiTurnStartedAtRef.current;
      if (aiStartedAt) {
        setBaselineMetrics((prev) => recordBaselineAiTurn(prev, Date.now() - aiStartedAt));
        aiTurnStartedAtRef.current = null;
      }
      setAiThinking(false);
      setTimeout(() => {
        if (mountedRef.current) setAiActionStatus(null);
      }, 2500);
    }, 1200);
  }, [mode, gs, showCardNarrative, addMessage, runAIAnimations, setAiActionStatus]);

  useEffect(() => {
    if (mode === 'ai' && gs.currentTurn === 'player2' && !gs.gameOver) {
      const t = setTimeout(runAI, 500);
      return () => clearTimeout(t);
    }
  }, [gs.currentTurn, mode, gs.gameOver, runAI]);

  const doPlayCard = useCallback(
    (uid: string) => {
      const actionStartedAt = Date.now();
      const card = me.hand.find((c) => c.uid === uid);
      if (!card || !myTurn || gs.gameOver) return false;
      const next = playCard(gs, 'player1', uid);
      if (next !== gs) {
        recordTelemetry(card.data.type === 'land' ? 'card_played_land' : 'card_played_non_land', {
          cardId: card.data.id,
          turnNumber: gs.turnNumber,
          mana: me.mana,
        });
        setXpProfile((prev) => awardXP(prev, 10));
        if (card.data.type !== 'land') {
          setHasPlayedNonLandCardThisTurn(true);
        }
        setDailyQuests((prev) =>
          incrementDailyQuest(prev, card.data.type === 'land' ? 'play_land' : 'play_non_land')
        );
        setAchievements((prev) =>
          unlockAchievementState(
            prev,
            card.data.type === 'land' ? 'first_land' : 'first_spell_or_creature'
          )
        );
        setBaselineMetrics((prev) => recordBaselineCardPlayed(prev, Date.now() - actionStartedAt));
        setPlayAnim({ name: card.data.name, emoji: card.data.emoji, color: card.data.color });
        setGs(next);
        setSelectedHand(null);
        setInspected(null);
        addMessage('action', `Разыграно: ${card.data.emoji} ${card.data.name}`, '🃏', 5000);
        showCardNarrative(card.data.id);
        return true;
      }
      return false;
    },
    [gs, me.hand, myTurn, showCardNarrative, addMessage, setPlayAnim, me.mana, recordTelemetry]
  );

  const handleDragStart = (e: React.DragEvent, uid: string) => {
    setDragCardUid(uid);
    setSelectedHand(null);
    setInspected(null);
    e.dataTransfer.effectAllowed = 'move';
    const el = e.currentTarget as HTMLDivElement;
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
  };
  const handleDragEnd = () => {
    setDragCardUid(null);
    setDropZoneActive(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (!dragCardUid) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropZoneActive(true);
  };
  const handleDragLeave = () => {
    setDropZoneActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneActive(false);
    if (dragCardUid) {
      doPlayCard(dragCardUid);
      setDragCardUid(null);
    }
  };

  const clickHand = (uid: string) => {
    const card = me.hand.find((c) => c.uid === uid);
    if (!card) return;
    setSelectedAttacker(null);
    setSelectedAttackerSlot(null);
    if (!myTurn || gs.gameOver) {
      setInspected({ card, owner: 'player1' });
      return;
    }
    if (selectedHand === uid) {
      doPlayCard(uid);
      return;
    }
    setSelectedHand(uid);
    setInspected({ card, owner: 'player1' });
  };

  const clickMyCreature = (uid: string) => {
    const card = me.field.find((c) => c.uid === uid);
    if (!card) return;
    const slotIndex = me.field.indexOf(card);
    if (!myTurn || gs.gameOver) {
      setInspected({ card, owner: 'player1' });
      return;
    }
    const canAct =
      !card.summoningSickness &&
      !card.hasAttacked &&
      card.frozen <= 0 &&
      !card.keywords.includes('defender');
    if (canAct) {
      if (selectedAttacker === uid) {
        setSelectedAttacker(null);
        setSelectedAttackerSlot(null);
        setInspected(null);
        setTargetingLine(null);
      } else {
        setSelectedAttacker(uid);
        setSelectedAttackerSlot(slotIndex);
        setSelectedHand(null);
        setInspected(null);
        const attackerRef = cardRefsMap.current.get(uid);
        if (attackerRef) {
          const rect = attackerRef.getBoundingClientRect();
          setTargetingLine({
            startX: rect.left + rect.width / 2,
            startY: rect.top + rect.height / 2,
            endX: rect.left + rect.width / 2,
            endY: rect.top + rect.height / 2,
          });
        }
      }
    } else {
      setInspected({ card, owner: 'player1' });
      setSelectedAttacker(null);
      setSelectedAttackerSlot(null);
      setTargetingLine(null);
    }
  };

  const clickEnemyCreature = (uid: string) => {
    const card = enemy.field.find((c) => c.uid === uid);
    if (!card) return;
    if (selectedAttacker && myTurn && !gs.gameOver) {
      const attackerCard = me.field.find((c) => c.uid === selectedAttacker);
      if (!attackerCard) return;
      const next = attackCreature(gs, 'player1', selectedAttacker, uid);
      if (next !== gs) {
        const atk = getEffectiveAttack(attackerCard, me, enemy);
        const defenderRef = cardRefsMap.current.get(uid);
        if (defenderRef) {
          const rect = defenderRef.getBoundingClientRect();
          showDamageNumber(atk, rect.left + rect.width / 2, rect.top + rect.height / 2, 'damage');
          // Show health loss floating to health icon
          showStatChange(
            `-${atk}`,
            rect.left + rect.width / 2 + 20,
            rect.top + rect.height / 2,
            'health-loss'
          );
        }
        // Trigger elemental effects
        const attackerElement = getCardElement(attackerCard);
        if (attackerElement === 'explosion') {
          setScreenShake(true);
          setExplosionFlash(true);
          setTimeout(() => {
            setScreenShake(false);
            setExplosionFlash(false);
          }, 400);
        }
        // Check if defender will die and set death effect
        const defenderHealth = card.currentHealth;
        const attackerAttack = getEffectiveAttack(attackerCard, me, enemy);
        if (attackerAttack >= defenderHealth) {
          setDyingCards((prev) => new Set(prev).add(card.uid));
          if (attackerElement === 'fire' || attackerElement === 'explosion') {
            setCardDeathEffects((prev) => new Map(prev).set(card.uid, 'fire'));
          } else if (attackerElement === 'poison') {
            setCardDeathEffects((prev) => new Map(prev).set(card.uid, 'poison'));
          } else if (attackerElement === 'ice') {
            setCardDeathEffects((prev) => new Map(prev).set(card.uid, 'ice'));
          }
        }
        setGs(next);
        addMessage(
          'action',
          `${attackerCard?.data.emoji || '⚔️'} ${attackerCard?.data.name || '?'} → ${card.data.emoji} ${card.data.name}`,
          '⚔️',
          5000
        );
        triggerCombatAnims(selectedAttacker, uid);
        setSelectedAttacker(null);
        setSelectedAttackerSlot(null);
        setInspected(null);
        setTargetingLine(null);
      }
      return;
    }
    setInspected({ card, owner: 'player2' });
    setSelectedHand(null);
  };

  const clickAttackHero = () => {
    if (!myTurn || !selectedAttacker || gs.gameOver) return;
    const attackerCard = me.field.find((c) => c.uid === selectedAttacker);
    if (!attackerCard) return;
    const next = attackPlayer(gs, 'player1', selectedAttacker);
    if (next !== gs) {
      const atk = getEffectiveAttack(attackerCard, me, enemy);
      const enemyHeroElement = document.querySelector('[data-enemy-hero]');
      if (enemyHeroElement) {
        const rect = enemyHeroElement.getBoundingClientRect();
        showDamageNumber(atk, rect.left + rect.width / 2, rect.top + rect.height / 2, 'damage');
      }
      // Trigger elemental effects
      const attackerElement = getCardElement(attackerCard);
      if (attackerElement === 'explosion') {
        setScreenShake(true);
        setExplosionFlash(true);
        setTimeout(() => {
          setScreenShake(false);
          setExplosionFlash(false);
        }, 400);
      }
      setGs(next);
      addMessage(
        'action',
        `${attackerCard?.data.emoji || '⚔️'} ${attackerCard?.data.name || '?'} наносит удар Хранителю!`,
        '💥',
        5000
      );
      triggerCombatAnims(selectedAttacker, undefined);
      setSelectedAttacker(null);
      setSelectedAttackerSlot(null);
      setInspected(null);
      setTargetingLine(null);
    }
  };

  const clickEndTurn = () => {
    if (!myTurn || gs.gameOver) return;
    setGs((prev) => {
      const nextGs = endTurn(prev);
      if (mode === 'ai' && nextGs.currentTurn === 'player2') {
        setShowTurnTransition(true);
        setTimeout(() => {
          if (mountedRef.current) setShowTurnTransition(false);
        }, 1200);
      }
      return nextGs;
    });
    setSelectedHand(null);
    setSelectedAttacker(null);
    setSelectedAttackerSlot(null);
    setInspected(null);
    setShowAttackNotification(false);
  };

  const restart = () => {
    const initialState = createInitialGameStateForActiveDeck();
    setGs(initialState);
    setHasPlayedNonLandCardThisTurn(false);
    prevTurnRef.current = {
      turnNumber: initialState.turnNumber,
      currentTurn: initialState.currentTurn,
    };
    setSelectedHand(null);
    setSelectedAttacker(null);
    setSelectedAttackerSlot(null);
    setInspected(null);
    setPlayAnim(null);
    setDeathAnim(null);
    setDyingCards(new Set());
    setCardDeathEffects(new Map());
    seenStoryEventsRef.current = new Set();
    prevFieldRef.current = { p1: [], p2: [] };
    cardRefsMap.current.clear();
    handCardRefs.current.clear();
    clearMessages();
    prevTutorialHintRef.current = null;
    turnStartedAtRef.current = Date.now();
    aiTurnStartedAtRef.current = null;
  };

  const exportUnifiedDebugSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        meta: {
          version: 'unified-debug-hub.v0',
          exportedAt: Date.now(),
        },
        telemetry: {
          count: telemetry.events.length,
          events: telemetry.events,
        },
        baseline: {
          counters: baselineMetrics.counters,
          averages: {
            turnMs: averageMetricMs(baselineMetrics.recentTurnDurationsMs),
            aiTurnMs: averageMetricMs(baselineMetrics.recentAiTurnDurationsMs),
            actionMs: averageMetricMs(baselineMetrics.recentCardActionLatencyMs),
          },
          samples: {
            turnDurationsMs: baselineMetrics.recentTurnDurationsMs,
            aiTurnDurationsMs: baselineMetrics.recentAiTurnDurationsMs,
            actionLatencyMs: baselineMetrics.recentCardActionLatencyMs,
          },
        },
        progression: {
          quests: dailyQuests,
          achievements,
          xp: xpProfile,
        },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      anchor.href = url;
      anchor.download = `omsk-unified-debug-snapshot-v0-${timestamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      // no-op: export is debug-only
    }
  }, [achievements, baselineMetrics, dailyQuests, telemetry.events, xpProfile]);

  const clearUnifiedDebugLocalData = useCallback(() => {
    setTelemetry(createInitialTelemetryBufferState());
    setBaselineMetrics(createInitialBaselineMetricsState());
    setDailyQuests(createInitialDailyQuestState());
    setAchievements(createInitialAchievementsState());
    setXpProfile(createInitialXPProfileState());
    setShowLog(false);
  }, []);

  const handleTutorialSkip = useCallback(() => {
    setTutorialCompleted(true);
    recordTelemetry('tutorial_skipped', {
      turnNumber: gs.turnNumber,
    });
  }, [gs.turnNumber, recordTelemetry]);

  const closeCardPreview = useCallback(
    (source: 'backdrop' | 'button', point?: { x: number; y: number }) => {
      if (
        source === 'backdrop' &&
        point &&
        selectedHand &&
        inspected?.owner === 'player1' &&
        inspected.card.uid === selectedHand
      ) {
        const handZoneEl = document.querySelector('.zone-hand') as HTMLDivElement | null;
        const handZoneRect = handZoneEl?.getBoundingClientRect();
        const tappedHandZone =
          !!handZoneRect &&
          point.x >= handZoneRect.left &&
          point.x <= handZoneRect.right &&
          point.y >= handZoneRect.top &&
          point.y <= handZoneRect.bottom;

        const selectedCardEl = handCardRefs.current.get(selectedHand);
        if (selectedCardEl) {
          const rect = selectedCardEl.getBoundingClientRect();
          const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
          const hitSlop = coarsePointer ? 56 : 28;
          const tappedSelectedCard =
            point.x >= rect.left - hitSlop &&
            point.x <= rect.right + hitSlop &&
            point.y >= rect.top - hitSlop &&
            point.y <= rect.bottom + hitSlop;

          if ((tappedSelectedCard || tappedHandZone) && doPlayCard(selectedHand)) {
            return;
          }
        } else if (tappedHandZone && doPlayCard(selectedHand)) {
            return;
        }
      }

      setInspected(null);
      setSelectedHand(null);
    },
    [doPlayCard, inspected, selectedHand]
  );

  const clickBF = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      target.closest(
        [
          '[data-interactive-ui="true"]',
          'button',
          '[role="button"]',
          'a',
          'input',
          'select',
          'textarea',
          '.hand-card-wrapper',
          '.creature-slot',
          '.card-preview-overlay',
          '.tutorial-hint-panel',
          '.modal-overlay',
          '.modal-overlay-content',
        ].join(',')
      )
    ) {
      return;
    }

    if (inspected && !selectedAttacker) {
      setInspected(null);
      setSelectedHand(null);
    }
  };

  const phases = [
    { id: 'land', icon: '🏔️', label: 'Земля', active: phase === 'land', done: landPlayed },
    {
      id: 'play',
      icon: '🃏',
      label: 'Карты',
      active: phase === 'play',
      done: !hasPlayableCard && landPlayed,
    },
    { id: 'attack', icon: '⚔️', label: 'Атака', active: phase === 'attack', done: !hasAttackers },
    { id: 'done', icon: '⏭️', label: 'Конец', active: phase === 'done', done: false },
  ];

  return (
    <div className={`game-grid ${screenShake ? 'effect-screen-shake' : ''}`} onClick={clickBF}>
      {explosionFlash && <div className="explosion-flash" />}
      {/* TOP BAR */}
      <div className="zone-topbar">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition text-sm px-2 py-1"
            data-interactive-ui="true"
          >
            ← Назад
          </button>
          <span
            className="text-[#c9a84c] font-heading font-bold"
            style={{ fontSize: 'clamp(14px, 1.5vw, 18px)' }}
          >
            OMSK: The Gathering
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-start gap-2">
            <BaselineMetricsPanel metrics={baselineMetrics} />
            <XPProfilePanel profile={xpProfile} />
            <DailyQuestsPanel quests={dailyQuests} />
            <AchievementsPanel achievements={achievements} />
          </div>
          <div
            className="flex items-center gap-1.5 rounded border border-[#3a3f5a] bg-[#121628]/80 px-1.5 py-1"
            data-interactive-ui="true"
          >
            <span
              className="text-[10px] text-gray-400"
              title="Unified Debug Hub v0"
              data-interactive-ui="true"
            >
              🧪 hub
            </span>
            <span className="text-[10px] text-gray-400" title="Baseline counters" data-interactive-ui="true">
              counters:{' '}
              <span className="text-[#f0d68a]">
                {baselineMetrics.counters.matchesCompleted}/
                {baselineMetrics.counters.turnsEnded}/
                {baselineMetrics.counters.cardsPlayed}/
                {baselineMetrics.counters.aiTurns}
              </span>
            </span>
            <span className="text-[10px] text-gray-400" title="Telemetry events" data-interactive-ui="true">
              events: <span className="text-[#f0d68a]">{telemetry.events.length}</span>
            </span>
            <span className="text-[10px] text-gray-400" title="Progression level" data-interactive-ui="true">
              level: <span className="text-[#f0d68a]">{xpProfile.level}</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportUnifiedDebugSnapshot();
              }}
              className="text-gray-400 hover:text-[#f0d68a] transition text-xs px-1.5 py-1"
              title="Экспорт unified debug snapshot (JSON)"
              data-interactive-ui="true"
            >
              📤 snapshot
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearUnifiedDebugLocalData();
              }}
              className="text-gray-500 hover:text-red-300 transition text-xs px-1.5 py-1"
              title="Очистить unified debug/progression local data"
              data-interactive-ui="true"
            >
              🧹 all
            </button>
          </div>
          <span className="text-gray-400" style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}>
            Ход {gs.turnNumber}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLog(true);
            }}
            className="text-gray-400 hover:text-[#f0d68a] transition text-sm px-2 py-1"
            title="Журнал действий"
            style={{ pointerEvents: 'auto', zIndex: 999 }}
            data-interactive-ui="true"
          >
            📜 Лог
          </button>
          {aiThinking && (
            <span
              className="text-cyan-400 animate-pulse"
              style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
            >
              🤖 Думает...
            </span>
          )}
        </div>
      </div>

      {/* ENEMY HERO ZONE */}
      <div className="zone-enemy-hero hero-zone-row" data-enemy-hero="true">
        <DeckStack count={enemy.deck.length} type="deck" cardBackSrc={cardBackSrc} label={mode === 'ai' ? 'Колода Хранителя' : 'Колода Игрока 2'} />
        <PlayerArea
          player={enemy}
          isCurrentPlayer={!isP1Turn}
          label={mode === 'ai' ? 'Хранитель Омска' : 'Игрок 2'}
          heroIcon={mode === 'ai' ? '🗿' : '👤'}
          dataEnemyHero={true}
        />
        <DeckStack count={enemy.graveyard.length} type="graveyard" label={mode === 'ai' ? 'Сброс Хранителя' : 'Сброс Игрока 2'} />
      </div>

      {/* ENEMY BOARD ZONE */}
      <div className="zone-enemy-board">
        <div className="board-zone enemy">
          {Array.from({ length: 7 }, (_, i) => {
            const card = enemy.field[i];
            const laneActive = selectedAttacker !== null && !gs.gameOver && selectedAttackerSlot === i;
            return (
              <div
                key={i}
                className={`creature-slot ${card ? 'occupied' : ''} ${laneActive ? 'attack-lane' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {card && (
                  <FieldCard
                    card={card}
                    player={enemy}
                    opponent={me}
                    isTarget={laneActive}
                    canAct={false}
                    attackAnim={attackAnimUid === card.uid}
                    damageAnim={damageAnimUid === card.uid}
                    deathEffect={cardDeathEffects.get(card.uid)}
                    onClick={() => clickEnemyCreature(card.uid)}
                    cardRef={(el) => {
                      if (el) cardRefsMap.current.set(card.uid, el);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER DIVIDER */}
      <div className="zone-divider">
        <div className="center-divider">
          <div className="divider-buttons">
            {selectedAttacker && !gs.gameOver && myTurn && (
              <>
                <button onClick={clickAttackHero} className="attack-hero-btn" data-interactive-ui="true">
                  💥 В героя
                </button>
                <button
                  onClick={() => {
                    setSelectedAttacker(null);
                    setSelectedAttackerSlot(null);
                  }}
                  className="cancel-btn"
                  data-interactive-ui="true"
                >
                  Отмена
                </button>
              </>
            )}
            {!gs.gameOver && myTurn && (
              <button onClick={clickEndTurn} className="end-turn-btn ready" data-interactive-ui="true">
                Конец хода ⏭️
              </button>
            )}
          </div>
          <div className="hidden sm:block">
            <PhaseIndicator gameState={gs} isMyTurn={myTurn} playerKey="player1" />
          </div>
          <div className="divider-hint">{getHint()}</div>
          {/* Attack availability notification */}
          {showAttackNotification && (
            <div className="attack-notification animate-bounce">
              <span className="text-lg">⚔️</span>
              <span>Доступны атаки! Кликните на существо с зелёной рамкой</span>
              <button
                onClick={() => setShowAttackNotification(false)}
                className="ml-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PLAYER BOARD ZONE */}
      <div className="zone-player-board">
        <div className={`board-zone player ${dropZoneActive ? 'drop-target' : ''}`}>
          {Array.from({ length: 7 }, (_, i) => {
            const card = me.field[i];
            const canAct =
              card &&
              !card.summoningSickness &&
              !card.hasAttacked &&
              card.frozen <= 0 &&
              !card.keywords.includes('defender');
            const laneSourceActive = selectedAttacker !== null && !gs.gameOver && selectedAttackerSlot === i;
            return (
              <div
                key={i}
                className={`creature-slot ${card ? 'occupied' : ''} ${dropZoneActive ? 'drop-target' : ''} ${laneSourceActive ? 'attack-lane-source' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {card && (
                  <div className={newlyPlayedUids.has(card.uid) ? 'card-play-animation' : ''}>
                    <FieldCard
                      card={card}
                      player={me}
                      opponent={enemy}
                      selected={selectedAttacker === card.uid}
                      isTarget={false}
                      canAct={canAct && myTurn}
                      attackAnim={attackAnimUid === card.uid}
                      damageAnim={damageAnimUid === card.uid}
                      deathEffect={cardDeathEffects.get(card.uid)}
                      onClick={() => clickMyCreature(card.uid)}
                      cardRef={(el) => {
                        if (el) cardRefsMap.current.set(card.uid, el);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PLAYER HERO ZONE */}
      <div className="zone-player-hero hero-zone-row">
        <DeckStack count={me.deck.length} type="deck" cardBackSrc={cardBackSrc} label="Твоя колода" />
        <PlayerArea
          player={me}
          isCurrentPlayer={isP1Turn}
          label={mode === 'ai' ? 'Игрок' : 'Игрок 1'}
          heroIcon="👤"
        />
        <DeckStack count={me.graveyard.length} type="graveyard" label="Твой сброс" />
      </div>

      {/* ACTION BAR */}
      <div className="zone-actionbar">
        <div className="action-bar">
          {phases.map((p) => (
            <span
              key={p.id}
              className={`phase-pill ${p.active ? 'active' : p.done ? 'done' : 'idle'}`}
            >
              {p.icon} {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* HAND ZONE */}
      <div
        className="zone-hand"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="hand-zone">
          {me.hand.map((card, idx) => {
            const canPlay =
              myTurn &&
              !gs.gameOver &&
              (card.data.type === 'land'
                ? me.landsPlayed < me.maxLandsPerTurn
                : card.data.cost <= me.mana);
            return (
              <div
                key={card.uid}
                ref={(el) => {
                  if (el) {
                    handCardRefs.current.set(card.uid, el);
                  } else {
                    handCardRefs.current.delete(card.uid);
                  }
                }}
                className={`hand-card-wrapper ${selectedHand === card.uid ? 'selected' : ''} ${newlyDrawnUids.has(card.uid) ? 'card-draw-animation' : ''}`}
                style={
                  {
                    '--card-angle': `${(idx - (me.hand.length - 1) / 2) * 3}deg`,
                    '--card-offset': `${Math.abs(idx - (me.hand.length - 1) / 2) * 2}px`,
                    '--card-index': idx,
                  } as React.CSSProperties
                }
              >
                <HandCardComponent
                  card={card}
                  selected={selectedHand === card.uid}
                  canPlay={canPlay}
                  isLand={card.data.type === 'land'}
                  onClick={() => clickHand(card.uid)}
                  onDragStart={(e) => handleDragStart(e, card.uid)}
                  onDragEnd={handleDragEnd}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* CARD PREVIEW */}
      {inspected && !selectedAttacker && (
        <CardPreview
          card={inspected.card}
          owner={inspected.owner}
          gs={gs}
          onClose={closeCardPreview}
        />
      )}

      {/* TUTORIAL */}
      {tutorialVisible && (
        <Tutorial
          gameState={gs}
          playerKey="player1"
          hintContext={{
            hasPlayableLand,
            hasPlayedLandThisTurn: landPlayed,
            hasPlayableNonLandCard: hasPlayableCard,
            hasPlayedNonLandCardThisTurn,
            hasAttackReadyCreature: hasAttackers,
            isAttackOpportunity: myTurn && phase === 'attack',
          }}
          onSkip={handleTutorialSkip}
        />
      )}

      {/* MESSAGE FEED */}
      <div className="z-layer-overlay relative">
        <MessageFeed messages={messages} onDismiss={dismissMessage} />
      </div>

      {/* DAMAGE NUMBERS */}
      {damageNumbers.map((dn) => (
        <div key={dn.id} className={`damage-number ${dn.type}`} style={{ left: dn.x, top: dn.y }}>
          {dn.value}
        </div>
      ))}

      {/* STAT CHANGE FLOATS */}
      {statFloats.map((sf) => (
        <div
          key={sf.id}
          className={`stat-change-float ${sf.className}`}
          style={{ left: sf.x, top: sf.y }}
        >
          {sf.value}
        </div>
      ))}

      {/* TURN TRANSITION */}
      {showTurnTransition && (
        <div className="turn-banner">
          <span className="turn-banner-text">ХОД ХРАНИТЕЛЯ</span>
          <span className="turn-banner-sub">Подготовьтесь к бою</span>
        </div>
      )}

      {/* ACTION LOG */}
      <ModalOverlay
        open={showLog}
        onClose={() => {
          setShowLog(false);
        }}
        title="📜 Журнал действий"
        closeOnBackdrop={true}
      >
        <div
          className="flex flex-col gap-1 overflow-y-auto"
          style={{ maxHeight: 'clamp(200px, 50vh, 400px)', position: 'relative', zIndex: 100 }}
        >
          {gs.log.length === 0 && (
            <p className="text-gray-500 italic text-center py-4">Журнал пуст</p>
          )}
          {gs.log.map((entry, i) => (
            <div
              key={i}
              className="text-gray-300 font-body border-b border-gray-800/30 py-1.5 px-1"
              style={{ fontSize: 'clamp(11px, 1.1vw, 14px)' }}
            >
              <span className="text-gray-500 mr-2" style={{ fontSize: 'clamp(9px, 0.9vw, 11px)' }}>
                {i + 1}.
              </span>
              {entry}
            </div>
          ))}
        </div>
      </ModalOverlay>

      {/* GAME OVER */}
      {gs.gameOver && (
        <div className="modal-overlay">
          <div className="modal-overlay-content text-center">
            <h2 className="font-title text-2xl text-[#c9a84c] mb-4">
              {me.health <= 0 ? '💀 Поражение' : '🏆 Победа!'}
            </h2>
            <p className="text-gray-300 mb-6">{me.health <= 0 ? 'Омск пал...' : 'Омск спасен!'}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={restart}
                className="px-6 py-2 rounded-lg bg-[#c9a84c] text-black font-bold"
              >
                Играть снова
              </button>
              <button onClick={onBack} className="px-6 py-2 rounded-lg border border-gray-600">
                В меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
