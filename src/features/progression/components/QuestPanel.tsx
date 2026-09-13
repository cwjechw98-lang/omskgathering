// ═══════════════════════════════════════════
// QUEST PANEL COMPONENT
// ═══════════════════════════════════════════

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DailyQuestId } from '../types';

interface QuestPanelProps {
  quests: {
    dateKey: string;
    progress: Record<DailyQuestId, number>;
  };
  meta: Array<{ id: DailyQuestId; label: string }>;
  target: number;
  onIncrement?: (questId: DailyQuestId) => void;
}

export function QuestPanel({ quests, meta, target }: QuestPanelProps) {
  return (
    <Card className="bg-black/40 border-[#c9a84c]/20 min-w-[180px]">
      <CardContent className="p-2 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sm font-bold text-[#f0d68a]">📋 Квесты</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 border-[#c9a84c]/30 text-[#c9a84c]"
          >
            {Object.values(quests.progress).filter((p) => p >= target).length}/{meta.length}
          </Badge>
        </div>

        {meta.map((quest) => {
          const progress = quests.progress[quest.id];
          const completed = progress >= target;
          const percent = (progress / target) * 100;

          return (
            <Tooltip key={quest.id}>
              <TooltipTrigger className="w-full">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={cn(
                        'truncate max-w-[120px]',
                        completed ? 'text-green-400 line-through' : 'text-gray-300'
                      )}
                    >
                      {quest.label}
                    </span>
                    <Badge
                      variant={completed ? 'default' : 'secondary'}
                      className={cn(
                        'h-4 text-[9px] px-1 min-w-[28px]',
                        completed && 'bg-green-700/80'
                      )}
                    >
                      {progress}/{target}
                    </Badge>
                  </div>
                  <Progress
                    value={percent}
                    className={cn(
                      'h-1',
                      completed ? 'progress-success' : 'bg-gray-700/50'
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {completed ? '✅ Выполнен' : `Прогресс: ${progress} из ${target}`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </CardContent>
    </Card>
  );
}
