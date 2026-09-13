// ═══════════════════════════════════════════
// PROFILE PANEL COMPONENT
// ═══════════════════════════════════════════

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { XPProfileState } from '../types';

interface ProfilePanelProps {
  profile: XPProfileState;
  xpPerLevel: number;
}

export function ProfilePanel({ profile, xpPerLevel }: ProfilePanelProps) {
  const percent = (profile.xpInLevel / xpPerLevel) * 100;

  return (
    <Card className="bg-black/40 border-[#c9a84c]/20 min-w-[120px]">
      <CardContent className="p-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-[#f0d68a]">⭐ Уровень</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 border-[#c9a84c]/30 text-[#c9a84c]"
          >
            {profile.level}
          </Badge>
        </div>

        <Tooltip>
          <TooltipTrigger className="w-full">
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-gray-300">
                <span>XP</span>
                <span>
                  {profile.xpInLevel}/{xpPerLevel}
                </span>
              </div>
              <Progress value={percent} className="h-1.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Всего XP: {profile.xpTotal}</p>
            <p className="text-xs text-gray-400">
              До следующего уровня: {xpPerLevel - profile.xpInLevel} XP
            </p>
          </TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
