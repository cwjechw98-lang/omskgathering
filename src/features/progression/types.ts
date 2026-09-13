// ═══════════════════════════════════════════
// PROGRESSION TYPES
// ═══════════════════════════════════════════

export type DailyQuestId = 'play_land' | 'play_non_land' | 'complete_match';

export type AchievementId =
  | 'first_land'
  | 'first_spell_or_creature'
  | 'first_match_complete'
  | 'first_victory';

export interface DailyQuestState {
  dateKey: string;
  progress: Record<DailyQuestId, number>;
}

export interface AchievementsState {
  version: 0;
  unlocked: Record<AchievementId, boolean>;
  unlockedAt: Record<AchievementId, number | null>;
}

export interface XPProfileState {
  version: 0;
  xpTotal: number;
  level: number;
  xpInLevel: number;
}

export type TelemetryEventName =
  | 'tutorial_hint_shown'
  | 'tutorial_skipped'
  | 'card_played_land'
  | 'card_played_non_land'
  | 'match_completed'
  | 'match_victory'
  | 'daily_quest_completed'
  | 'achievement_unlocked';

export type TelemetryPayload = Record<string, string | number | boolean | null>;

export interface TelemetryEvent {
  name: TelemetryEventName;
  timestamp: number;
  payload: TelemetryPayload;
}

export interface TelemetryBufferState {
  version: 0;
  events: TelemetryEvent[];
}

export interface BaselineMetricsState {
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
}

// Storage keys
export const STORAGE_KEYS = {
  DAILY_QUESTS: 'omsk.daily-quests.v0',
  ACHIEVEMENTS: 'omsk.achievements.v0',
  XP_PROFILE: 'omsk.xp-profile.v0',
  TELEMETRY: 'omsk.telemetry.v0',
  BASELINE: 'omsk.baseline.v0',
  TUTORIAL: 'tutorialCompleted',
} as const;

// Constants
export const PROGRESSION_CONSTS = {
  DAILY_QUEST_TARGET: 1,
  XP_PER_LEVEL: 100,
  TELEMETRY_MAX_EVENTS: 200,
  BASELINE_MAX_SAMPLES: 120,
} as const;

export const DAILY_QUEST_META: Array<{ id: DailyQuestId; label: string }> = [
  { id: 'play_land', label: 'Play 1 land in a match' },
  { id: 'play_non_land', label: 'Play 1 non-land card in a match' },
  { id: 'complete_match', label: 'Complete 1 match (win or lose)' },
];

export const ACHIEVEMENTS_META: Array<{ id: AchievementId; label: string; emoji: string }> = [
  { id: 'first_land', label: 'First land played', emoji: '🏔️' },
  { id: 'first_spell_or_creature', label: 'First non-land played', emoji: '✨' },
  { id: 'first_match_complete', label: 'First match complete', emoji: '🏁' },
  { id: 'first_victory', label: 'First victory', emoji: '🏆' },
];

export const TELEMETRY_EVENT_NAMES: ReadonlySet<TelemetryEventName> = new Set([
  'tutorial_hint_shown',
  'tutorial_skipped',
  'card_played_land',
  'card_played_non_land',
  'match_completed',
  'match_victory',
  'daily_quest_completed',
  'achievement_unlocked',
]);
