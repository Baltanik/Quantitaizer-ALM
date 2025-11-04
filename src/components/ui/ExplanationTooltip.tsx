// ============================================================================
// EXPLANATION TOOLTIP COMPONENT - MOBILE FIRST
// ============================================================================
// Component riusabile per mostrare spiegazioni metriche con tooltip hover
// e dialog opzionale per spiegazione completa.
// MOBILE: Bottom sheet drawer (80% users)
// DESKTOP: Dialog modal

import { Info, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { getExplanation } from "@/utils/explanationEngine";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ExplanationTooltipProps {
  metricKey: string;
  mode?: "minimal" | "full"; // minimal = solo tooltip, full = tooltip + dialog
  size?: "sm" | "md";
}

export function ExplanationTooltip({ 
  metricKey, 
  mode = "full",
  size = "sm"
}: ExplanationTooltipProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const explanation = getExplanation(metricKey);

  if (!explanation) {
    return null; // Metrica non ha spiegazione disponibile
  }

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const IconComponent = mode === "minimal" ? Info : HelpCircle;

  // Minimal mode: solo tooltip hover
  if (mode === "minimal") {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
              <IconComponent className={`${iconSize} text-slate-400`} />
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="max-w-xs bg-slate-800 border-slate-700 text-slate-200 p-3"
          >
            <p className="text-xs leading-relaxed">{explanation.shortExplanation}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full mode: tooltip + dialog/drawer cliccabile (responsive)
  const isMobile = useIsMobile();

  // Shared content component for both mobile and desktop
  const ExplanationContent = () => (
    <div className="space-y-4">
      {/* Spiegazione completa */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
          Spiegazione Dettagliata
        </h4>
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          {explanation.fullExplanation}
        </div>
      </div>

      {/* Thresholds se disponibili */}
      {explanation.thresholds && explanation.thresholds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
            Range di Riferimento
          </h4>
          <div className="space-y-2">
            {explanation.thresholds.map((threshold, index) => (
              <div 
                key={index}
                className="bg-slate-800/50 border-l-2 border-emerald-500/30 p-3 rounded"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-semibold text-white">
                    {threshold.label}
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    {threshold.range}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{threshold.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contesto storico */}
      {explanation.historicalContext && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
            Contesto Storico
          </h4>
          <div className="text-sm text-slate-300 leading-relaxed bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
            {explanation.historicalContext}
          </div>
        </div>
      )}

      {/* What to watch */}
      {explanation.whatToWatch && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Cosa Monitorare
          </h4>
          <div className="text-sm text-slate-300 leading-relaxed bg-yellow-900/10 p-4 rounded-lg border border-yellow-500/20">
            {explanation.whatToWatch}
          </div>
        </div>
      )}

      {/* Footer disclaimer */}
      <div className="pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 italic">
          ⚠️ Questa è una spiegazione educativa basata su dati storici e contesto macroeconomico. 
          Non costituisce consulenza finanziaria o raccomandazione di investimento.
        </p>
      </div>
    </div>
  );

  // MOBILE: Drawer (bottom sheet)
  if (isMobile) {
    return (
      <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
        <DrawerTrigger asChild>
          <button 
            className="inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity active:scale-95"
            style={{ minWidth: '44px', minHeight: '44px' }} // iOS tap target
          >
            <IconComponent className={`${iconSize} text-slate-400`} />
          </button>
        </DrawerTrigger>
        <DrawerContent className="bg-slate-900 border-slate-700 text-slate-200 max-h-[85vh]">
          <DrawerHeader className="border-b border-slate-700">
            <DrawerTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-emerald-400" />
              {explanation.name}
            </DrawerTitle>
            <DrawerDescription className="text-slate-400 text-sm italic">
              {explanation.shortExplanation}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto p-4">
            <ExplanationContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // DESKTOP: Dialog + Tooltip
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button className="inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity hover:text-emerald-400">
                <IconComponent className={`${iconSize} text-slate-400 hover:text-emerald-400 transition-colors`} />
              </button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="max-w-xs bg-slate-800 border-slate-700 text-slate-200 p-3"
          >
            <p className="text-xs leading-relaxed">{explanation.shortExplanation}</p>
            <p className="text-xs text-slate-400 mt-1 italic">Click per dettagli completi</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-200 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Info className="h-5 w-5 text-emerald-400" />
            {explanation.name}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm italic">
            {explanation.shortExplanation}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ExplanationContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// VARIANT: Inline Explanation (senza dialog, solo expanded text)
// ============================================================================
// Usa questo per spiegazioni brevi direttamente inline nel UI

interface InlineExplanationProps {
  metricKey: string;
}

export function InlineExplanation({ metricKey }: InlineExplanationProps) {
  const explanation = getExplanation(metricKey);

  if (!explanation) return null;

  return (
    <div className="mt-2 p-3 bg-slate-800/30 border border-slate-700 rounded text-xs text-slate-400 leading-relaxed">
      <span className="text-emerald-400 font-semibold">ℹ️ </span>
      {explanation.shortExplanation}
    </div>
  );
}

