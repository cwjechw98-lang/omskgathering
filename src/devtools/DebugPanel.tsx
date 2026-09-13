// ═══════════════════════════════════════════
// DEBUG PANEL COMPONENT
// ═══════════════════════════════════════════

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  TelemetryBufferState,
  BaselineMetricsState,
  DailyQuestState,
  AchievementsState,
  XPProfileState,
} from '@/features/progression/types';

interface DebugPanelProps {
  telemetry?: TelemetryBufferState;
  baseline?: BaselineMetricsState;
  quests?: DailyQuestState;
  achievements?: AchievementsState;
  xp?: XPProfileState;
  onExportSnapshot?: () => void;
  onClearAll?: () => void;
  showLog?: boolean;
  onToggleLog?: () => void;
}

export function DebugPanel({
  telemetry,
  baseline,
  quests,
  achievements,
  xp,
  onExportSnapshot,
  onClearAll,
  showLog,
  onToggleLog,
}: DebugPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const handleExport = useCallback(() => {
    if (onExportSnapshot) {
      onExportSnapshot();
    }
  }, [onExportSnapshot]);

  const handleClear = useCallback(() => {
    if (onClearAll) {
      onClearAll();
    }
  }, [onClearAll]);

  const handleToggleLog = useCallback(() => {
    if (onToggleLog) {
      onToggleLog();
    }
  }, [onToggleLog]);

  return (
    <Card className="bg-black/60 border-gray-700/50 min-w-[200px]">
      <CardContent className="p-2 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-gray-300">🛠️ Debug</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                aria-label={expanded ? 'Свернуть' : 'Развернуть'}
              >
                {expanded ? '▲' : '▼'}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{expanded ? 'Свернуть' : 'Развернуть'}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Quick actions */}
        <div className="flex gap-1 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-7 px-2 text-[10px] border-gray-600 hover:bg-gray-700/50"
              >
                📤 Snapshot
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Экспорт JSON snapshot</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="h-7 px-2 text-[10px] border-gray-600 hover:bg-gray-700/50"
              >
                🧹 All
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Очистить все debug данные</p>
            </TooltipContent>
          </Tooltip>

          {onToggleLog && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showLog ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleLog}
                  className={cn(
                    'h-7 px-2 text-[10px]',
                    showLog
                      ? 'bg-[#c9a84c]/20 text-[#f0d68a] border-[#c9a84c]/30'
                      : 'border-gray-600 hover:bg-gray-700/50'
                  )}
                >
                  📜 Log
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showLog ? 'Скрыть лог' : 'Показать лог'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Expanded stats */}
        {expanded && (
          <div className="space-y-1.5 pt-1.5 border-t border-gray-700/50">
            {/* Counters */}
            <div className="grid grid-cols-2 gap-1 text-[9px] text-gray-400">
              <div>Turns: {baseline?.counters.turnsEnded ?? 0}</div>
              <div>AI: {baseline?.counters.aiTurns ?? 0}</div>
              <div>Cards: {baseline?.counters.cardsPlayed ?? 0}</div>
              <div>Matches: {baseline?.counters.matchesCompleted ?? 0}</div>
            </div>

            {/* Telemetry count */}
            {telemetry && (
              <div className="text-[9px] text-gray-400">
                Events: {telemetry.events.length}
              </div>
            )}

            {/* Quests progress */}
            {quests && (
              <div className="text-[9px] text-gray-400">
                Quests:{' '}
                {Object.values(quests.progress).filter((p) => p >= 1).length}/3
              </div>
            )}

            {/* Achievements */}
            {achievements && (
              <div className="text-[9px] text-gray-400">
                Achievements:{' '}
                {Object.values(achievements.unlocked).filter(Boolean).length}/4
              </div>
            )}

            {/* XP Level */}
            {xp && (
              <div className="text-[9px] text-gray-400">
                Level: {xp.level} ({xp.xpTotal} XP)
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(' ');
}
