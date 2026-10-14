import { Shield, Star, Swords, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const CYRILLE_BONUS = 30_000;

interface CapacitySummaryProps {
  deployCapNoHeroes: number;    // base + bonuses, no heroes, no Cyrille (e.g. 128,700)
  totalDeploymentCap: number;   // base + bonuses + hero×3, no Cyrille (e.g. 169,110)
  totalRallyCap: number;        // full rally capacity (e.g. 1,141,700)
}

export function CapacitySummary({
  deployCapNoHeroes,
  totalDeploymentCap,
  totalRallyCap,
}: CapacitySummaryProps) {
  const btDeployNoHeroes = deployCapNoHeroes + CYRILLE_BONUS;
  const btDeployWithHeroes = totalDeploymentCap + CYRILLE_BONUS;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1: Deploy cap w/o heroes, excl. Cyrille */}
      <Card className="bg-card/40 border-border/50 border-t-2 border-t-primary/30">
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 uppercase tracking-wider leading-tight">
            <Shield className="w-3 h-3 text-primary flex-shrink-0" />
            Deploy Cap (w/o heroes, excl. Cyrille)
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {deployCapNoHeroes.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* 2: Deploy cap w/ 3 heroes, excl. Cyrille */}
      <Card className="bg-card/40 border-border/50 border-t-2 border-t-primary/50">
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 uppercase tracking-wider leading-tight">
            <Users className="w-3 h-3 text-primary flex-shrink-0" />
            Deploy Cap (3 heroes, excl. Cyrille)
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {totalDeploymentCap.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* 3: Cyrille Bonus */}
      <Card className="bg-card/40 border-border/50 border-t-2 border-t-yellow-500/40">
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 uppercase tracking-wider leading-tight">
            <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            Cyrille Bonus
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold font-mono text-yellow-400">
              {CYRILLE_BONUS.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground/50 border border-border/40 rounded px-1 py-0.5">
              fixed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4: BT totals — two lines in one card */}
      <Card className="bg-primary/5 border-primary/30 border-t-2 border-t-primary">
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold text-primary/70 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider leading-tight">
            <Shield className="w-3 h-3 flex-shrink-0" />
            BT Deploy Cap (incl. Cyrille)
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-mono text-foreground/70">
                {btDeployNoHeroes.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground/50">w/o heroes</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono text-primary">
                {btDeployWithHeroes.toLocaleString()}
              </span>
              <span className="text-[10px] text-primary/50 font-semibold">3 heroes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5: Total Rally Capacity */}
      <Card className="bg-red-500/5 border-border/50 border-t-2 border-t-red-500/50">
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 uppercase tracking-wider leading-tight">
            <Swords className="w-3 h-3 text-red-400 flex-shrink-0" />
            Total Rally Capacity
          </div>
          <div className="text-lg font-bold font-mono text-red-400">
            {totalRallyCap.toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
