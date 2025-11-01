import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScenarioCardProps {
  scenario: string | null;
}

const scenarioConfig = {
  stealth_qe: {
    label: "Stealth QE",
    color: "success",
    icon: TrendingUp,
    description: "Balance sheet expansion with tight spreads",
    bgClass: "bg-success/10 border-success/20",
    textClass: "text-success",
  },
  qe: {
    label: "Quantitative Easing",
    color: "success",
    icon: TrendingUp,
    description: "Active monetary expansion",
    bgClass: "bg-success/10 border-success/20",
    textClass: "text-success",
  },
  qt: {
    label: "Quantitative Tightening",
    color: "destructive",
    icon: TrendingDown,
    description: "Balance sheet contraction",
    bgClass: "bg-destructive/10 border-destructive/20",
    textClass: "text-destructive",
  },
  neutral: {
    label: "Neutral",
    color: "warning",
    icon: Minus,
    description: "Stable monetary conditions",
    bgClass: "bg-warning/10 border-warning/20",
    textClass: "text-warning",
  },
};

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const config = scenarioConfig[scenario as keyof typeof scenarioConfig] || scenarioConfig.neutral;
  const Icon = config.icon;

  return (
    <Card className={`${config.bgClass} border-2 shadow-lg`}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Current Market Scenario
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${config.bgClass}`}>
            <Icon className={`h-8 w-8 ${config.textClass}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-2xl font-bold ${config.textClass}`}>
              {config.label}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>
          <Badge variant={config.color as any} className="text-xs">
            ACTIVE
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}