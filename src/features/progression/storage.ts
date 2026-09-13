// ═══════════════════════════════════════════
// PROGRESSION STORAGE HELPERS
// ═══════════════════════════════════════════

import {
  DailyQuestState,
  AchievementsState,
  XPProfileState,
  TelemetryBufferState,
  BaselineMetricsState,
  TelemetryEventName,
  TelemetryPayload,
  TelemetryEvent,
  AchievementId,
  DailyQuestId,
  STORAGE_KEYS,
  PROGRESSION_CONSTS,
  TELEMETRY_EVENT_NAMES,
} from './types';

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════

function getLocalDateKey(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isWindowAvailable(): boolean {
  return typeof window !== 'undefined';
}

// ═══════════════════════════════════════════
// DAILY QUESTS
// ═══════════════════════════════════════════

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

export function loadDailyQuests(): DailyQuestState {
  if (!isWindowAvailable()) return createInitialDailyQuestState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.DAILY_QUESTS);
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

export function saveDailyQuests(state: DailyQuestState): void {
  if (!isWindowAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.DAILY_QUESTS, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

export function incrementDailyQuest(state: DailyQuestState, questId: DailyQuestId): DailyQuestState {
  return {
    ...state,
    progress: {
      ...state.progress,
      [questId]: Math.min(PROGRESSION_CONSTS.DAILY_QUEST_TARGET, state.progress[questId] + 1),
    },
  };
}

// ═══════════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════════

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

export function loadAchievements(): AchievementsState {
  if (!isWindowAvailable()) return createInitialAchievementsState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!raw) return createInitialAchievementsState();
    const parsed = normalizeAchievementsState(JSON.parse(raw));
    return parsed ?? createInitialAchievementsState();
  } catch {
    return createInitialAchievementsState();
  }
}

export function saveAchievements(state: AchievementsState): void {
  if (!isWindowAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

export function unlockAchievement(
  state: AchievementsState,
  achievementId: AchievementId
): AchievementsState {
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

// ═══════════════════════════════════════════
// XP PROFILE
// ═══════════════════════════════════════════

function toXPProfileState(xpTotal: number): XPProfileState {
  const normalizedXpTotal = Math.max(0, Math.floor(xpTotal));
  return {
    version: 0,
    xpTotal: normalizedXpTotal,
    level: Math.floor(normalizedXpTotal / PROGRESSION_CONSTS.XP_PER_LEVEL) + 1,
    xpInLevel: normalizedXpTotal % PROGRESSION_CONSTS.XP_PER_LEVEL,
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
  const inferredTotal = (normalizedLevel - 1) * PROGRESSION_CONSTS.XP_PER_LEVEL + normalizedXpInLevel;
  return toXPProfileState(inferredTotal);
}

export function loadXPProfile(): XPProfileState {
  if (!isWindowAvailable()) return createInitialXPProfileState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.XP_PROFILE);
    if (!raw) return createInitialXPProfileState();
    const parsed = normalizeXPProfileState(JSON.parse(raw));
    return parsed ?? createInitialXPProfileState();
  } catch {
    return createInitialXPProfileState();
  }
}

export function saveXPProfile(state: XPProfileState): void {
  if (!isWindowAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.XP_PROFILE, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

export function awardXP(state: XPProfileState, amount: number): XPProfileState {
  const normalizedAmount = Math.max(0, Math.floor(amount));
  if (normalizedAmount === 0) return state;
  return toXPProfileState(state.xpTotal + normalizedAmount);
}

// ═══════════════════════════════════════════
// TELEMETRY
// ═══════════════════════════════════════════

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
    .slice(-PROGRESSION_CONSTS.TELEMETRY_MAX_EVENTS);

  return {
    version: 0,
    events,
  };
}

export function loadTelemetry(): TelemetryBufferState {
  if (!isWindowAvailable()) return createInitialTelemetryBufferState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.TELEMETRY);
    if (!raw) return createInitialTelemetryBufferState();
    const parsed = normalizeTelemetryBufferState(JSON.parse(raw));
    return parsed ?? createInitialTelemetryBufferState();
  } catch {
    return createInitialTelemetryBufferState();
  }
}

export function saveTelemetry(state: TelemetryBufferState): void {
  if (!isWindowAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.TELEMETRY, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

export function pushTelemetryEvent(
  state: TelemetryBufferState,
  name: TelemetryEventName,
  payload: TelemetryPayload = {}
): TelemetryBufferState {
  const nextEvent: TelemetryEvent = {
    name,
    timestamp: Date.now(),
    payload: normalizeTelemetryPayload(payload),
  };
  const nextEvents = [...state.events, nextEvent].slice(-PROGRESSION_CONSTS.TELEMETRY_MAX_EVENTS);
  return {
    version: 0,
    events: nextEvents,
  };
}

// ═══════════════════════════════════════════
// BASELINE METRICS
// ═══════════════════════════════════════════

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
    .slice(-PROGRESSION_CONSTS.BASELINE_MAX_SAMPLES);
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
  const turnsEnded = Math.max(
    0,
    Math.floor(Number((countersRaw as Record<string, unknown>).turnsEnded) || 0)
  );
  const cardsPlayed = Math.max(
    0,
    Math.floor(Number((countersRaw as Record<string, unknown>).cardsPlayed) || 0)
  );
  const aiTurns = Math.max(
    0,
    Math.floor(Number((countersRaw as Record<string, unknown>).aiTurns) || 0)
  );

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

export function loadBaseline(): BaselineMetricsState {
  if (!isWindowAvailable()) return createInitialBaselineMetricsState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.BASELINE);
    if (!raw) return createInitialBaselineMetricsState();
    const parsed = normalizeBaselineMetricsState(JSON.parse(raw));
    return parsed ?? createInitialBaselineMetricsState();
  } catch {
    return createInitialBaselineMetricsState();
  }
}

export function saveBaseline(state: BaselineMetricsState): void {
  if (!isWindowAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.BASELINE, JSON.stringify(state));
  } catch {
    // no-op: localStorage may be unavailable
  }
}

function withBaselineUpdatedAt(state: BaselineMetricsState): BaselineMetricsState {
  return {
    ...state,
    updatedAt: Date.now(),
  };
}

function appendMetricSample(samples: number[], valueMs: number): number[] {
  const normalized = normalizeMetricSample(valueMs);
  if (normalized === null) return samples;
  return [...samples, normalized].slice(-PROGRESSION_CONSTS.BASELINE_MAX_SAMPLES);
}

export function recordBaselineTurnEnded(state: BaselineMetricsState, durationMs: number): BaselineMetricsState {
  return withBaselineUpdatedAt({
    ...state,
    counters: {
      ...state.counters,
      turnsEnded: state.counters.turnsEnded + 1,
    },
    recentTurnDurationsMs: appendMetricSample(state.recentTurnDurationsMs, durationMs),
  });
}

export function recordBaselineAiTurn(state: BaselineMetricsState, durationMs: number): BaselineMetricsState {
  return withBaselineUpdatedAt({
    ...state,
    counters: {
      ...state.counters,
      aiTurns: state.counters.aiTurns + 1,
    },
    recentAiTurnDurationsMs: appendMetricSample(state.recentAiTurnDurationsMs, durationMs),
  });
}

export function recordBaselineCardPlayed(state: BaselineMetricsState, actionLatencyMs: number): BaselineMetricsState {
  return withBaselineUpdatedAt({
    ...state,
    counters: {
      ...state.counters,
      cardsPlayed: state.counters.cardsPlayed + 1,
    },
    recentCardActionLatencyMs: appendMetricSample(state.recentCardActionLatencyMs, actionLatencyMs),
  });
}

export function recordBaselineMatchCompleted(state: BaselineMetricsState): BaselineMetricsState {
  return withBaselineUpdatedAt({
    ...state,
    counters: {
      ...state.counters,
      matchesCompleted: state.counters.matchesCompleted + 1,
    },
  });
}

export function averageMetricMs(samples: number[]): number {
  if (samples.length === 0) return 0;
  const total = samples.reduce((sum, item) => sum + item, 0);
  return Math.round(total / samples.length);
}
