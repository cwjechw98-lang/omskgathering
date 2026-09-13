// ═══════════════════════════════════════════
// PERFORMANCE MONITOR COMPONENT
// ═══════════════════════════════════════════

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BaselineMetricsState } from '@/features/progression/types';

interface PerformanceMonitorProps {
  metrics: BaselineMetricsState;
  averages: {
    turnDuration: number;
    aiTurnDuration: number;
    cardActionLatency: number;
  };
}

export function PerformanceMonitor({ metrics, averages }: PerformanceMonitorProps) {
  const formatMs = (ms: number) => {
    if (ms === 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (ms: number) => {
    if (ms < 500) return 'text-green-400';
    if (ms < 1500) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-black/40 border-gray-700/50 min-w-[180px]">
      <CardContent className="p-2 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sm font-bold text-gray-300">⚡ Performance</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 border-gray-600 text-gray-400"
          >
            {metrics.counters.turnsEnded} turns
          </Badge>
        </div>

        {/* Avg Turn Duration */}
        <Tooltip>
          <TooltipTrigger className="w-full">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-400">Turn</span>
              <span className={getStatusColor(averages.turnDuration)}>
                {formatMs(averages.turnDuration)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Среднее время хода: {formatMs(averages.turnDuration)}</p>
            <p className="text-xs text-gray-400">
              Измерено ходов: {metrics.recentTurnDurationsMs.length}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Avg AI Turn Duration */}
        <Tooltip>
          <TooltipTrigger className="w-full">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-400">AI</span>
              <span className={getStatusColor(averages.aiTurnDuration)}>
                {formatMs(averages.aiTurnDuration)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Среднее время хода AI: {formatMs(averages.aiTurnDuration)}</p>
            <p className="text-xs text-gray-400">
              Ходов AI: {metrics.counters.aiTurns}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Card Action Latency */}
        <Tooltip>
          <TooltipTrigger className="w-full">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-400">Card</span>
              <span className={getStatusColor(averages.cardActionLatency)}>
                {formatMs(averages.cardActionLatency)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Задержка действия карты: {formatMs(averages.cardActionLatency)}</p>
            <p className="text-xs text-gray-400">
              Сыграно карт: {metrics.counters.cardsPlayed}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Matches completed */}
        <div className="pt-1.5 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400">Matches</span>
            <span className="text-gray-300">{metrics.counters.matchesCompleted}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
