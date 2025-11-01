import { AlertTriangle, Info, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Signal } from "@/services/fedData";

interface AlertPanelProps {
  signals: Signal[];
}

const signalConfig = {
  high_stress: {
    icon: AlertTriangle,
    color: "destructive",
    label: "High Stress",
  },
  qe_starting: {
    icon: TrendingUp,
    color: "success",
    label: "QE Signal",
  },
  normal: {
    icon: Info,
    color: "default",
    label: "Info",
  },
};

export function AlertPanel({ signals }: AlertPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Recent Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No signals detected
          </p>
        ) : (
          <div className="space-y-3">
            {signals.map((signal) => {
              const config = signalConfig[signal.signal_type as keyof typeof signalConfig] || signalConfig.normal;
              const Icon = config.icon;
              
              return (
                <div
                  key={signal.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg bg-${config.color}/10`}>
                    <Icon className={`h-4 w-4 text-${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={config.color as any} className="text-xs">
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(signal.date).toLocaleDateString()}
                      </span>
                      {signal.confidence && (
                        <span className="text-xs text-muted-foreground">
                          {signal.confidence}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{signal.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}