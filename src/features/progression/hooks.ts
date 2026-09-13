// ═══════════════════════════════════════════
// PROGRESSION HOOKS
// ═══════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DailyQuestState,
  DailyQuestId,
  AchievementsState,
  AchievementId,
  XPProfileState,
  TelemetryBufferState,
  TelemetryEventName,
  TelemetryPayload,
  BaselineMetricsState,
} from './types';
import {
  loadDailyQuests,
  saveDailyQuests,
  incrementDailyQuest,
  loadAchievements,
  saveAchievements,
  unlockAchievement,
  loadXPProfile,
  saveXPProfile,
  awardXP,
  loadTelemetry,
  saveTelemetry,
  pushTelemetryEvent,
  loadBaseline,
  saveBaseline,
  recordBaselineTurnEnded,
  recordBaselineAiTurn,
  recordBaselineCardPlayed,
  recordBaselineMatchCompleted,
  averageMetricMs,
} from './storage';
import { PROGRESSION_CONSTS, DAILY_QUEST_META, ACHIEVEMENTS_META } from './types';

// ═══════════════════════════════════════════
// DAILY QUESTS HOOK
// ═══════════════════════════════════════════

export function useDailyQuests() {
  const [state, setState] = useState<DailyQuestState>(() => loadDailyQuests());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check for daily reset on mount and every minute
  useEffect(() => {
    const checkDate = () => {
      const todayKey = new Date().toISOString().split('T')[0];
      if (state.dateKey !== todayKey && mountedRef.current) {
        setState({
          dateKey: todayKey,
          progress: {
            play_land: 0,
            play_non_land: 0,
            complete_match: 0,
          },
        });
      }
    };

    checkDate();
    const interval = setInterval(checkDate, 60000);
    return () => clearInterval(interval);
  }, [state.dateKey]);

  const incrementQuest = useCallback((questId: DailyQuestId) => {
    setState((prev) => {
      const currentProgress = prev.progress[questId];
      if (currentProgress >= PROGRESSION_CONSTS.DAILY_QUEST_TARGET) {
        return prev; // Already completed
      }
      const next = incrementDailyQuest(prev, questId);
      saveDailyQuests(next);
      return next;
    });
  }, []);

  const resetQuests = useCallback(() => {
    const todayKey = getLocalDateKey();
    const fresh = {
      dateKey: todayKey,
      progress: {
        play_land: 0,
        play_non_land: 0,
        complete_match: 0,
      },
    };
    saveDailyQuests(fresh);
    setState(fresh);
  }, []);

  return {
    quests: state,
    incrementQuest,
    resetQuests,
    meta: DAILY_QUEST_META,
    target: PROGRESSION_CONSTS.DAILY_QUEST_TARGET,
  };
}

// ═══════════════════════════════════════════
// ACHIEVEMENTS HOOK
// ═══════════════════════════════════════════

export function useAchievements() {
  const [state, setState] = useState<AchievementsState>(() => loadAchievements());

  const unlock = useCallback((achievementId: AchievementId) => {
    setState((prev) => {
      if (prev.unlocked[achievementId]) return prev; // Already unlocked
      const next = unlockAchievement(prev, achievementId);
      saveAchievements(next);
      return next;
    });
  }, []);

  const resetAchievements = useCallback(() => {
    const fresh = {
      version: 0 as const,
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
    saveAchievements(fresh);
    setState(fresh);
  }, []);

  return {
    achievements: state,
    unlock,
    resetAchievements,
    meta: ACHIEVEMENTS_META,
  };
}

// ═══════════════════════════════════════════
// XP PROFILE HOOK
// ═══════════════════════════════════════════

export function useXPProfile() {
  const [state, setState] = useState<XPProfileState>(() => loadXPProfile());

  const addXP = useCallback((amount: number) => {
    setState((prev) => {
      const next = awardXP(prev, amount);
      saveXPProfile(next);
      return next;
    });
  }, []);

  const resetXP = useCallback(() => {
    const fresh = {
      version: 0 as const,
      xpTotal: 0,
      level: 1,
      xpInLevel: 0,
    };
    saveXPProfile(fresh);
    setState(fresh);
  }, []);

  return {
    profile: state,
    addXP,
    resetXP,
    xpPerLevel: PROGRESSION_CONSTS.XP_PER_LEVEL,
  };
}

// ═══════════════════════════════════════════
// TELEMETRY HOOK
// ═══════════════════════════════════════════

export function useTelemetry() {
  const [state, setState] = useState<TelemetryBufferState>(() => loadTelemetry());

  const pushEvent = useCallback((name: TelemetryEventName, payload: TelemetryPayload = {}) => {
    setState((prev) => {
      const next = pushTelemetryEvent(prev, name, payload);
      saveTelemetry(next);
      return next;
    });
  }, []);

  const resetTelemetry = useCallback(() => {
    const fresh = { version: 0 as const, events: [] };
    saveTelemetry(fresh);
    setState(fresh);
  }, []);

  const exportTelemetry = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  return {
    telemetry: state,
    pushEvent,
    resetTelemetry,
    exportTelemetry,
  };
}

// ═══════════════════════════════════════════
// BASELINE METRICS HOOK
// ═══════════════════════════════════════════

export function useBaselineMetrics() {
  const [state, setState] = useState<BaselineMetricsState>(() => loadBaseline());

  const recordTurnEnded = useCallback((durationMs: number) => {
    setState((prev) => {
      const next = recordBaselineTurnEnded(prev, durationMs);
      saveBaseline(next);
      return next;
    });
  }, []);

  const recordAiTurn = useCallback((durationMs: number) => {
    setState((prev) => {
      const next = recordBaselineAiTurn(prev, durationMs);
      saveBaseline(next);
      return next;
    });
  }, []);

  const recordCardPlayed = useCallback((actionLatencyMs: number) => {
    setState((prev) => {
      const next = recordBaselineCardPlayed(prev, actionLatencyMs);
      saveBaseline(next);
      return next;
    });
  }, []);

  const recordMatchCompleted = useCallback(() => {
    setState((prev) => {
      const next = recordBaselineMatchCompleted(prev);
      saveBaseline(next);
      return next;
    });
  }, []);

  const resetBaseline = useCallback(() => {
    const fresh = {
      version: 0 as const,
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
    saveBaseline(fresh);
    setState(fresh);
  }, []);

  const averages = {
    turnDuration: averageMetricMs(state.recentTurnDurationsMs),
    aiTurnDuration: averageMetricMs(state.recentAiTurnDurationsMs),
    cardActionLatency: averageMetricMs(state.recentCardActionLatencyMs),
  };

  return {
    metrics: state,
    averages,
    recordTurnEnded,
    recordAiTurn,
    recordCardPlayed,
    recordMatchCompleted,
    resetBaseline,
  };
}

// ═══════════════════════════════════════════
// COMBINED PROGRESSION HOOK
// ═══════════════════════════════════════════

export function useProgression() {
  const quests = useDailyQuests();
  const achievements = useAchievements();
  const xp = useXPProfile();
  const telemetry = useTelemetry();
  const baseline = useBaselineMetrics();

  const resetAll = useCallback(() => {
    quests.resetQuests();
    achievements.resetAchievements();
    xp.resetXP();
    telemetry.resetTelemetry();
    baseline.resetBaseline();
  }, [quests, achievements, xp, telemetry, baseline]);

  return {
    quests,
    achievements,
    xp,
    telemetry,
    baseline,
    resetAll,
  };
}

function getLocalDateKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
