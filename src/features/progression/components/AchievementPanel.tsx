// ═══════════════════════════════════════════
// ACHIEVEMENT PANEL COMPONENT
// ═══════════════════════════════════════════

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AchievementId } from '../types';

interface AchievementPanelProps {
  achievements: {
    version: 0;
    unlocked: Record<AchievementId, boolean>;
    unlockedAt: Record<AchievementId, number | null>;
  };
  meta: Array<{ id: AchievementId; label: string; emoji: string }>;
}

export function AchievementPanel({ achievements, meta }: AchievementPanelProps) {
  const unlockedCount = Object.values(achievements.unlocked).filter(Boolean).length;

  return (
    <Card className="bg-black/40 border-[#c9a84c]/20 min-w-[140px]">
      <CardContent className="p-2 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sm font-bold text-[#f0d68a]">🏆 Достижения</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 border-[#c9a84c]/30 text-[#c9a84c]"
          >
            {unlockedCount}/{meta.length}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1">
          {meta.map((achievement) => {
            const unlocked = achievements.unlocked[achievement.id];
            const unlockedAt = achievements.unlockedAt[achievement.id];
            const unlockedLabel = unlockedAt ? new Date(unlockedAt).toLocaleDateString() : '';

            return (
              <Tooltip key={achievement.id}>
                <TooltipTrigger>
                  <Badge
                    variant={unlocked ? 'default' : 'outline'}
                    className={cn(
                      'w-7 h-7 p-0 flex items-center justify-center text-sm',
                      !unlocked && 'opacity-40 grayscale'
                    )}
                    title={achievement.label}
                  >
                    <span aria-hidden="true">{achievement.emoji}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold">{achievement.label}</p>
                  <p className="text-xs text-gray-400">
                    {unlocked ? `✅ Открыто ${unlockedLabel}` : '🔒 Заблокировано'}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
