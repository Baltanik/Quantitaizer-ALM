// ============================================================================
// ESEMPIO INTEGRAZIONE - Come apparirebbe nel codice reale
// ============================================================================
// Questo file mostra PRIMA e DOPO l'integrazione del sistema tooltip
// NON è codice da committare, solo preview per supervisore

import { ExplanationTooltip } from './ExplanationTooltip';

// ============================================================================
// ESEMPIO 1: Hero Metrics in ScenarioCard.tsx
// ============================================================================

// ❌ PRIMA (senza spiegazioni):
function HeroMetrics_BEFORE() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Balance Sheet */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
          Balance Sheet
        </div>
        <div className="text-2xl font-bold text-white">$6.59T</div>
        <div className="text-sm text-red-400">↘ 0.1B (4w)</div>
      </div>

      {/* SOFR-EFFR Spread */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
          SOFR-EFFR Spread
        </div>
        <div className="text-2xl font-bold text-white">0.4 bps</div>
      </div>

      {/* VIX */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
          VIX (Fear Index)
        </div>
        <div className="text-2xl font-bold text-white">17.44</div>
      </div>
    </div>
  );
}

// ✅ DOPO (con spiegazioni):
function HeroMetrics_AFTER() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Balance Sheet */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
          Balance Sheet
          <ExplanationTooltip metricKey="balance_sheet" mode="full" size="sm" />
        </div>
        <div className="text-2xl font-bold text-white">$6.59T</div>
        <div className="text-sm text-red-400">↘ 0.1B (4w)</div>
      </div>

      {/* SOFR-EFFR Spread */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
          SOFR-EFFR Spread
          <ExplanationTooltip metricKey="sofr_effr_spread" mode="full" size="sm" />
        </div>
        <div className="text-2xl font-bold text-white">0.4 bps</div>
        <div className="text-xs text-green-400 mt-1">Normal</div>
      </div>

      {/* VIX */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
          VIX (Fear Index)
          <ExplanationTooltip metricKey="vix" mode="full" size="sm" />
        </div>
        <div className="text-2xl font-bold text-white">17.44</div>
        <div className="text-xs text-orange-400 mt-1">Slightly Elevated</div>
      </div>
    </div>
  );
}

// ============================================================================
// ESEMPIO 2: Indicatori Tecnici (lista)
// ============================================================================

// ❌ PRIMA:
function TechnicalIndicators_BEFORE() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          Balance Sheet
        </p>
        <div className="text-sm font-medium text-green-300">
          +15.2B (4w) Espansione
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          RRP Drain
        </p>
        <div className="text-sm font-medium text-red-300">
          -32.1B Fed inietta
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          SOFR-EFFR
        </p>
        <div className="text-sm font-medium text-blue-300">
          0.4bps Basso stress
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          HY OAS
        </p>
        <div className="text-sm font-medium text-blue-300">
          4.2% Normal
        </div>
      </div>
    </div>
  );
}

// ✅ DOPO:
function TechnicalIndicators_AFTER() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3 hover:border-emerald-500/40 transition-all">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
          Balance Sheet
          <ExplanationTooltip metricKey="balance_sheet" mode="minimal" size="sm" />
        </p>
        <div className="text-sm font-medium text-green-300">
          +15.2B (4w) Espansione
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3 hover:border-emerald-500/40 transition-all">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
          RRP Drain
          <ExplanationTooltip metricKey="rrp" mode="minimal" size="sm" />
        </p>
        <div className="text-sm font-medium text-red-300">
          -32.1B Fed inietta
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3 hover:border-emerald-500/40 transition-all">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
          SOFR-EFFR
          <ExplanationTooltip metricKey="sofr_effr_spread" mode="minimal" size="sm" />
        </p>
        <div className="text-sm font-medium text-blue-300">
          0.4bps Basso stress
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3 hover:border-emerald-500/40 transition-all">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
          HY OAS
          <ExplanationTooltip metricKey="hy_oas" mode="minimal" size="sm" />
        </p>
        <div className="text-sm font-medium text-blue-300">
          4.2% Normal
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ESEMPIO 3: Badge (Rischio, Sostenibilità, Confidenza)
// ============================================================================

// ❌ PRIMA:
function RiskBadges_BEFORE() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 border">
        Rischio: MEDIO
      </Badge>
      
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 border">
        Sostenibilità: BASSA
      </Badge>
      
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 border">
        Confidenza: MEDIA
      </Badge>
    </div>
  );
}

// ✅ DOPO:
function RiskBadges_AFTER() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 border flex items-center gap-1.5">
        Rischio: MEDIO
        <ExplanationTooltip metricKey="risk_level" mode="minimal" size="sm" />
      </Badge>
      
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 border flex items-center gap-1.5">
        Sostenibilità: BASSA
        <ExplanationTooltip metricKey="sustainability" mode="minimal" size="sm" />
      </Badge>
      
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 border flex items-center gap-1.5">
        Confidenza: MEDIA
        <ExplanationTooltip metricKey="confidence" mode="minimal" size="sm" />
      </Badge>
    </div>
  );
}

// ============================================================================
// ESEMPIO 4: Scenario Label
// ============================================================================

// ❌ PRIMA:
function ScenarioHeader_BEFORE() {
  return (
    <div className="flex items-start gap-4">
      <div className="p-4 rounded-xl bg-success/5 ring-2 ring-success/20">
        <TrendingUp className="h-10 w-10 text-success" />
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="text-3xl font-bold text-white">Stealth QE</h3>
        <p className="text-base text-slate-200">
          Espansione bilancio Fed con spread contratti
        </p>
      </div>
    </div>
  );
}

// ✅ DOPO:
function ScenarioHeader_AFTER() {
  return (
    <div className="flex items-start gap-4">
      <div className="p-4 rounded-xl bg-success/5 ring-2 ring-success/20">
        <TrendingUp className="h-10 w-10 text-success" />
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="text-3xl font-bold text-white flex items-center gap-2">
          Stealth QE
          <ExplanationTooltip metricKey="stealth_qe" mode="full" size="md" />
        </h3>
        <p className="text-base text-slate-200">
          Espansione bilancio Fed con spread contratti
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// RECAP MODIFICHE NECESSARIE
// ============================================================================

/*
FILE DA MODIFICARE:

1. src/components/ScenarioCard.tsx
   - Hero metrics (3 cards top): aggiungi ExplanationTooltip mode="full"
   - Technical indicators (6 cards bottom): aggiungi ExplanationTooltip mode="minimal"
   - Badge (Rischio/Sostenibilità/Confidenza): aggiungi ExplanationTooltip mode="minimal"
   - Scenario header: aggiungi ExplanationTooltip mode="full" al titolo

2. src/components/MetricsGrid.tsx (se esiste)
   - Ogni metrica mostrata: aggiungi tooltip appropriato

3. src/components/LiquidityMonitor.tsx (se esiste)
   - RRP, Reserves: aggiungi tooltip

MODALITÀ:
- mode="full": Tooltip hover + Dialog cliccabile (per metriche principali)
- mode="minimal": Solo tooltip hover (per metriche secondarie)

IMPORT DA AGGIUNGERE:
import { ExplanationTooltip } from "@/components/ui/ExplanationTooltip";

CAMBIO MINIMO:
Da: <div className="...">Balance Sheet</div>
A:  <div className="... flex items-center gap-2">
      Balance Sheet
      <ExplanationTooltip metricKey="balance_sheet" mode="full" size="sm" />
    </div>
*/

