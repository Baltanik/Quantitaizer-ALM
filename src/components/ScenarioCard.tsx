import { TrendingUp, TrendingDown, Minus, LineChart, AlertTriangle, Info, Target, DollarSign, Activity, Zap, Eye, Wallet, Sparkles, Brain, TrendingUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FedData, ScenarioState } from "@/services/fedData";
import { deriveScenario, canShowBullish, getContextColor, getRiskColor } from "@/utils/scenarioEngine";
import { ExplanationTooltip } from "@/components/ui/ExplanationTooltip";
import { getExplanation } from "@/utils/explanationEngine";

// ============================================================================
// VIX RISK LEVEL - SINGLE SOURCE OF TRUTH
// ============================================================================
const getVixRiskLevel = (vix: number) => {
  if (vix < 14) return { label: 'Calm', color: 'bg-green-500', risk: 'BASSO' };
  if (vix < 16) return { label: 'Normal', color: 'bg-yellow-500', risk: 'NORMALE' };
  if (vix < 18) return { label: 'Slightly Elevated', color: 'bg-orange-400', risk: 'MEDIO' };  // VIX 17.4 HERE
  if (vix < 22) return { label: 'Elevated', color: 'bg-orange-500', risk: 'MEDIO' };
  if (vix < 25) return { label: 'High Stress', color: 'bg-red-500', risk: 'ELEVATO' };
  return { label: 'Panic Mode', color: 'bg-red-600', risk: 'ELEVATO' };
};

interface ScenarioCardProps {
  scenario: string | null;
  currentData?: FedData | null;
}

const scenarioConfig = {
  stealth_qe: {
    label: "Stealth QE",
    color: "success",
    icon: TrendingUp,
    description: "Espansione bilancio Fed con spread contratti",
    getAnalysis: (data: FedData | null) => {
      if (!data) return "La Fed sta espandendo il proprio bilancio in modo silenzioso, iniettando liquidità nel sistema finanziario.";
      
      const balanceSheet = data.walcl ? (data.walcl / 1000000).toFixed(2) : 'N/A';
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const rrp_delta = data.d_rrpontsyd_4w ? (data.d_rrpontsyd_4w/1000).toFixed(1) : 'N/A';
      const sofr_effr = data.sofr_effr_spread ? (data.sofr_effr_spread * 100).toFixed(1) : 'N/A';
      const vix = data.vix ?? 'N/A';
      
      return `STEALTH QE ATTIVA: Balance Sheet $${balanceSheet}T (+${bs_delta}B in 4w).

RRP drena ${Math.abs(parseFloat(rrp_delta))}B = Fed inietta liquidità nascosta.

SOFR-EFFR: ${sofr_effr}bps - Spread bassi = nessuna tensione.

VIX: ${vix} ${parseFloat(vix.toString()) < 16 ? 'BULLISH - Mercato calmo' : 'Cauto'}.

FOCUS: Monitorare liquidità sistema e spread, ambiente supporta asset rischiosi ma attento segnali cambio.`;
    },
    getIndicators: (data: FedData | null) => {
      if (!data) return [
        { icon: TrendingUp, label: "Bilancio Fed", status: "In crescita" },
        { icon: LineChart, label: "Spread SOFR-IORB", status: "< 10 bps" },
        { icon: TrendingUp, label: "Riserve bancarie", status: "In aumento" },
        { icon: Info, label: "HY OAS", status: "N/A" },
        { icon: LineChart, label: "VIX", status: "N/A" }
      ];
      
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const rrp_delta = data.d_rrpontsyd_4w ? (data.d_rrpontsyd_4w/1000).toFixed(1) : 'N/A';
      const sofr_effr = data.sofr_effr_spread ? (data.sofr_effr_spread * 100).toFixed(1) : 'N/A';
      const hy_oas = data.hy_oas?.toFixed(1) ?? 'N/A';
      const vix = data.vix ?? 'N/A';
      const vixRisk = getVixRiskLevel(data.vix || 20);
      
      return [
        { icon: TrendingUp, label: "Balance Sheet", status: `+${bs_delta}B (4w) Espansione` },
        { icon: TrendingDown, label: "RRP Drain", status: `${rrp_delta}B Fed inietta` },
        { icon: LineChart, label: "SOFR-EFFR", status: `${sofr_effr}bps Basso stress` },
        { icon: TrendingDown, label: "HY OAS", status: `${hy_oas}% ${(data.hy_oas || 0) > 5.5 ? 'Credit Stress' : (data.hy_oas || 0) > 4 ? 'Normal' : 'Tight'}` },
        { icon: AlertTriangle, label: "VIX", status: `${vix} ${vixRisk.label}` }
      ];
    },
    bgClass: "bg-success/5 border-success/30",
    textClass: "text-success",
    badgeVariant: "default" as const,
  },
  qe: {
    label: "Quantitative Easing",
    color: "success",
    icon: TrendingUp,
    description: "Espansione monetaria attiva da parte della Fed",
    getAnalysis: (data: FedData | null) => {
      if (!data) return "La Federal Reserve sta attivamente espandendo il proprio bilancio attraverso acquisti di titoli, iniettando massiccia liquidità nel sistema bancario.";
      
      const balanceSheet = data.walcl ? (data.walcl / 1000000).toFixed(2) : 'N/A';
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const reserves_delta = data.d_wresbal_4w ? (data.d_wresbal_4w/1000).toFixed(1) : 'N/A';
      const vix = data.vix ?? 'N/A';
      
      return `QE COMPLETO - STAMPA MONETA: Balance Sheet $${balanceSheet}T (+${bs_delta}B AGGRESSIVA espansione).

Riserve flood: +${reserves_delta}B in 4w = liquidità massiccia.

VIX: ${vix} ${parseFloat(vix.toString()) < 20 ? 'EUPHORIA MODE' : 'Cauto nonostante QE'}.

FOCUS: Osservare sostenibilità espansione, liquidità massiccia storicamente precede euforia ma attento reversal.`;
    },
    getIndicators: (data: FedData | null) => {
      if (!data) return [
        { icon: TrendingUp, label: "Bilancio Fed", status: "Forte crescita" },
        { icon: TrendingUp, label: "Acquisti attivi", status: "Treasury/MBS" },
        { icon: TrendingUp, label: "Riserve bancarie", status: "Rapida espansione" },
        { icon: Info, label: "HY OAS", status: "N/A" },
        { icon: LineChart, label: "VIX", status: "N/A" }
      ];
      
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const res_delta = data.d_wresbal_4w ? (data.d_wresbal_4w/1000).toFixed(1) : 'N/A';
      const rrp_value = data.rrpontsyd ? (data.rrpontsyd/1000).toFixed(1) : 'N/A';
      const hy_oas = data.hy_oas?.toFixed(1) ?? 'N/A';
      const vix = data.vix ?? 'N/A';
      const vixRisk = getVixRiskLevel(data.vix || 20);
      
      return [
        { icon: TrendingUp, label: "Balance Sheet", status: `+${bs_delta}B AGGRESSIVA` },
        { icon: TrendingUp, label: "Riserve Flood", status: `+${res_delta}B Massiccia` },
        { icon: TrendingUp, label: "RRP Overflow", status: `${rrp_value}B Liquidità` },
        { icon: TrendingDown, label: "HY OAS", status: `${hy_oas}% ${(data.hy_oas || 0) > 5.5 ? 'Credit Stress' : (data.hy_oas || 0) > 4 ? 'Normal' : 'Tight'}` },
        { icon: AlertTriangle, label: "VIX", status: `${vix} ${vixRisk.label}` }
      ];
    },
    bgClass: "bg-success/5 border-success/30",
    textClass: "text-success",
    badgeVariant: "default" as const,
  },
  qt: {
    label: "Quantitative Tightening",
    color: "destructive",
    icon: TrendingDown,
    description: "Contrazione del bilancio Fed",
    getAnalysis: (data: FedData | null) => {
      if (!data) return "La Fed sta riducendo il proprio bilancio lasciando scadere i titoli senza reinvestirli, drenando liquidità dal sistema finanziario.";
      
      const balanceSheet = data.walcl ? (data.walcl / 1000000).toFixed(2) : 'N/A';
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const sofr_effr = data.sofr_effr_spread ? (data.sofr_effr_spread * 100).toFixed(1) : 'N/A';
      const vix = data.vix ?? 'N/A';
      
      return `CONTRAZIONE ATTIVA: Balance Sheet $${balanceSheet}T (${parseFloat(bs_delta) > 0 ? '+' : ''}${bs_delta}B in 4w).

SOFR-EFFR spread: ${sofr_effr}bps ${parseFloat(sofr_effr) > 10 ? 'STRESS RILEVATO' : 'Controllato'}.

VIX: ${vix} ${parseFloat(vix.toString()) > 22 ? 'Mercato nervoso' : 'Situazione gestibile'}.

FOCUS: Monitorare velocità drenaggio liquidità, soglie Riserve critiche per banche, attento spike spread.`;
    },
    getIndicators: (data: FedData | null) => {
      if (!data) return [
        { icon: TrendingDown, label: "Bilancio Fed", status: "In contrazione" },
        { icon: TrendingDown, label: "Riserve bancarie", status: "In calo" },
        { icon: TrendingUp, label: "Spread SOFR-IORB", status: "> 15 bps" },
        { icon: AlertTriangle, label: "Liquidità", status: "Tensioni possibili" },
        { icon: Info, label: "HY OAS", status: "N/A" },
        { icon: LineChart, label: "VIX", status: "N/A" }
      ];
      
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const res_delta = data.d_wresbal_4w ? (data.d_wresbal_4w/1000).toFixed(1) : 'N/A';
      const sofr_effr = data.sofr_effr_spread ? (data.sofr_effr_spread * 100).toFixed(1) : 'N/A';
      const rrp_delta = data.d_rrpontsyd_4w ? (data.d_rrpontsyd_4w/1000).toFixed(1) : 'N/A';
      const hy_oas = data.hy_oas?.toFixed(1) ?? 'N/A';
      const vix = data.vix ?? 'N/A';
      const vixRisk = getVixRiskLevel(data.vix || 20);
      
      const bsDeltaNum = parseFloat(bs_delta);
      const resDeltaNum = parseFloat(res_delta);
      const sofrNum = parseFloat(sofr_effr);
      const rrpDeltaNum = parseFloat(rrp_delta);
      
      // Balance Sheet status - FIXED LOGIC
      let bsStatus = '';
      let bsIcon = Minus;
      if (Math.abs(bsDeltaNum) < 5) {
        bsStatus = `${bs_delta}B Stabile`;
        bsIcon = Minus;
      } else if (bsDeltaNum < -50) {
        bsStatus = `${bs_delta}B QT Aggressivo`;
        bsIcon = TrendingDown;
      } else if (bsDeltaNum < -10) {
        bsStatus = `${bs_delta}B Contrazione`;
        bsIcon = TrendingDown;
      } else if (bsDeltaNum > 50) {
        bsStatus = `+${bs_delta}B QE Attivo`;
        bsIcon = TrendingUp;
      } else if (bsDeltaNum > 10) {
        bsStatus = `+${bs_delta}B Espansione`;
        bsIcon = TrendingUp;
      } else {
        bsStatus = `${bsDeltaNum > 0 ? '+' : ''}${bs_delta}B Quasi stabile`;
        bsIcon = Minus;
      }
      
      // Reserves status - FIXED LOGIC
      let resStatus = '';
      if (Math.abs(resDeltaNum) < 5) {
        resStatus = `${res_delta}B Stabili`;
      } else if (resDeltaNum < -30) {
        resStatus = `${res_delta}B Drenaggio forte`;
      } else if (resDeltaNum < -10) {
        resStatus = `${res_delta}B Calo moderato`;
      } else if (resDeltaNum > 30) {
        resStatus = `+${res_delta}B Flood massivo`;
      } else if (resDeltaNum > 10) {
        resStatus = `+${res_delta}B Accumulo`;
      } else {
        resStatus = `${resDeltaNum > 0 ? '+' : ''}${res_delta}B Quasi stabili`;
      }
      
      // SOFR-EFFR status - FIXED LOGIC
      let sofrStatus = '';
      let sofrIcon = LineChart;
      if (sofrNum < 3) {
        sofrStatus = `${sofr_effr}bps Ottimo`;
        sofrIcon = TrendingDown;
      } else if (sofrNum < 5) {
        sofrStatus = `${sofr_effr}bps Normale`;
        sofrIcon = LineChart;
      } else if (sofrNum < 10) {
        sofrStatus = `${sofr_effr}bps Tensione iniziale`;
        sofrIcon = TrendingUp;
      } else if (sofrNum < 20) {
        sofrStatus = `${sofr_effr}bps Stress rilevato`;
        sofrIcon = AlertTriangle;
      } else {
        sofrStatus = `${sofr_effr}bps CRISI liquidità`;
        sofrIcon = AlertTriangle;
      }
      
      return [
        { icon: bsIcon, label: "Balance Sheet", status: bsStatus },
        { icon: resDeltaNum > 5 ? TrendingUp : resDeltaNum < -5 ? TrendingDown : Minus, label: "Riserve", status: resStatus },
        { icon: sofrIcon, label: "SOFR-EFFR", status: sofrStatus },
        { icon: Math.abs(rrpDeltaNum) > 30 ? AlertTriangle : LineChart, label: "RRP", status: `${rrp_delta}B ${Math.abs(rrpDeltaNum) > 30 ? 'Movimento forte' : Math.abs(rrpDeltaNum) > 10 ? 'Movimento' : 'Stabile'}` },
        { icon: (data.hy_oas || 0) > 5.5 ? TrendingUp : (data.hy_oas || 0) < 3.5 ? TrendingDown : LineChart, label: "HY OAS", status: `${hy_oas}% ${(data.hy_oas || 0) > 5.5 ? 'Credit Stress' : (data.hy_oas || 0) > 4 ? 'Normal' : 'Tight'}` },
        { icon: AlertTriangle, label: "VIX", status: `${vix} ${vixRisk.label}` }
      ];
    },
    bgClass: "bg-destructive/5 border-destructive/30",
    textClass: "text-destructive",
    badgeVariant: "destructive" as const,
  },
  neutral: {
    label: "Neutrale",
    color: "warning",
    icon: Minus,
    description: "Condizioni monetarie stabili",
    getAnalysis: (data: FedData | null) => {
      if (!data) return "La Fed mantiene una politica neutrale senza espandere né contrarre significativamente il bilancio.";
      
      const balanceSheet = data.walcl ? (data.walcl / 1000000).toFixed(2) : 'N/A';
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const sofr_effr = data.sofr_effr_spread ? (data.sofr_effr_spread * 100).toFixed(1) : 'N/A';
      const vix = data.vix ?? 'N/A';
      
      return `NEUTRALE - EQUILIBRIO: Balance Sheet $${balanceSheet}T (${parseFloat(bs_delta) > 0 ? '+' : ''}${bs_delta}B stabile).

SOFR-EFFR: ${sofr_effr}bps - Range normale (5-15bps).

VIX: ${vix} ${parseFloat(vix.toString()) < 18 ? 'CALM - Mercato stabile' : 'Cautela'}.

FOCUS: Seguire comunicazioni Fed per segnali cambio policy, monitorare dati macro per direzionalità futura.`;
    },
    getIndicators: (data: FedData | null) => {
      if (!data) return [
        { icon: Minus, label: "Bilancio Fed", status: "Stabile" },
        { icon: LineChart, label: "Spread SOFR-IORB", status: "5-15 bps (normale)" },
        { icon: Minus, label: "Riserve bancarie", status: "Stabili" },
        { icon: Info, label: "HY OAS", status: "N/A" },
        { icon: LineChart, label: "VIX", status: "N/A" }
      ];
      
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const sofr_effr = data.sofr_effr_spread ? (data.sofr_effr_spread * 100).toFixed(1) : 'N/A';
      const rrp_value = data.rrpontsyd ? (data.rrpontsyd/1000).toFixed(1) : 'N/A';
      const hy_oas = data.hy_oas?.toFixed(1) ?? 'N/A';
      const vix = data.vix ?? 'N/A';
      const vixRisk = getVixRiskLevel(data.vix || 20);
      
      const bsDeltaNum = parseFloat(bs_delta);
      const sofrNum = parseFloat(sofr_effr);
      
      // Balance Sheet status - ACCURATE
      let bsStatus = '';
      let bsIcon = Minus;
      if (Math.abs(bsDeltaNum) < 5) {
        bsStatus = `${parseFloat(bs_delta) > 0 ? '+' : ''}${bs_delta}B Stabile`;
        bsIcon = Minus;
      } else if (bsDeltaNum > 10) {
        bsStatus = `+${bs_delta}B Espansione`;
        bsIcon = TrendingUp;
      } else if (bsDeltaNum < -10) {
        bsStatus = `${bs_delta}B Contrazione`;
        bsIcon = TrendingDown;
      } else {
        bsStatus = `${bsDeltaNum > 0 ? '+' : ''}${bs_delta}B Quasi stabile`;
        bsIcon = Minus;
      }
      
      // SOFR status - ACCURATE
      let sofrStatus = '';
      let sofrIcon = LineChart;
      if (sofrNum < 3) {
        sofrStatus = `${sofr_effr}bps Ottimo`;
        sofrIcon = TrendingDown;
      } else if (sofrNum < 8) {
        sofrStatus = `${sofr_effr}bps Normale`;
        sofrIcon = LineChart;
      } else if (sofrNum < 15) {
        sofrStatus = `${sofr_effr}bps Tensione`;
        sofrIcon = TrendingUp;
      } else {
        sofrStatus = `${sofr_effr}bps Stress`;
        sofrIcon = AlertTriangle;
      }
      
      return [
        { icon: bsIcon, label: "Balance Sheet", status: bsStatus },
        { icon: sofrIcon, label: "SOFR-EFFR", status: sofrStatus },
        { icon: Info, label: "RRP", status: `${rrp_value}B Equilibrato` },
        { icon: (data.hy_oas || 0) > 5.5 ? TrendingUp : (data.hy_oas || 0) < 3.5 ? TrendingDown : LineChart, label: "HY OAS", status: `${hy_oas}% ${(data.hy_oas || 0) > 5.5 ? 'Credit Stress' : (data.hy_oas || 0) > 4 ? 'Normal' : 'Tight'}` },
        { icon: AlertTriangle, label: "VIX", status: `${vix} ${vixRisk.label}` }
      ];
    },
    bgClass: "bg-warning/5 border-warning/30",
    textClass: "text-warning",
    badgeVariant: "secondary" as const,
  },
  contraction: {
    label: "Contrazione",
    color: "destructive",
    icon: TrendingDown,
    description: "Contrazione aggressiva della liquidità",
    getAnalysis: (data: FedData | null) => {
      if (!data) return "La Fed sta attuando una politica di contrazione aggressiva, drenando liquidità dal sistema.";
      
      const balanceSheet = data.walcl ? (data.walcl / 1000000).toFixed(2) : 'N/A';
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const sofr_effr = data.sofr_effr_spread ? (data.sofr_effr_spread * 100).toFixed(1) : 'N/A';
      const vix = data.vix ?? 'N/A';
      
      return `CONTRAZIONE AGGRESSIVA: Balance Sheet $${balanceSheet}T (${bs_delta}B forte calo).

SOFR-EFFR: ${sofr_effr}bps ${parseFloat(sofr_effr) > 20 ? 'STRESS ELEVATO' : 'Tensione'}.

VIX: ${vix} ${parseFloat(vix.toString()) > 25 ? 'PANIC MODE' : 'Nervosismo'}.

FOCUS: Priorità assoluta monitoraggio spread e HY OAS, rischio contagio sistemico, attento interventi Fed emergenza.`;
    },
    getIndicators: (data: FedData | null) => {
      if (!data) return [
        { icon: TrendingDown, label: "Bilancio Fed", status: "Contrazione forte" },
        { icon: TrendingDown, label: "Riserve bancarie", status: "In forte calo" },
        { icon: TrendingUp, label: "Spread SOFR-IORB", status: "> 20 bps" },
        { icon: Info, label: "HY OAS", status: "N/A" },
        { icon: LineChart, label: "VIX", status: "N/A" }
      ];
      
      const bs_delta = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
      const res_delta = data.d_wresbal_4w ? (data.d_wresbal_4w/1000).toFixed(1) : 'N/A';
      const sofr_effr = data.sofr_effr_spread ? (data.sofr_effr_spread * 100).toFixed(1) : 'N/A';
      const hy_oas = data.hy_oas?.toFixed(1) ?? 'N/A';
      const vix = data.vix ?? 'N/A';
      const vixRisk = getVixRiskLevel(data.vix || 20);
      
      return [
        { icon: TrendingDown, label: "Balance Sheet", status: `${bs_delta}B FORTE calo` },
        { icon: TrendingDown, label: "Riserve", status: `${res_delta}B Drenaggio` },
        { icon: AlertTriangle, label: "SOFR-EFFR", status: `${sofr_effr}bps STRESS` },
        { icon: TrendingUp, label: "HY OAS", status: `${hy_oas}% ${(data.hy_oas || 0) > 5.5 ? 'Credit Stress' : (data.hy_oas || 0) > 4 ? 'Normal' : 'Tight'}` },
        { icon: AlertTriangle, label: "VIX", status: `${vix} ${vixRisk.label}` }
      ];
    },
    bgClass: "bg-destructive/5 border-destructive/30",
    textClass: "text-destructive",
    badgeVariant: "destructive" as const,
  },
};

export function ScenarioCard({ scenario, currentData }: ScenarioCardProps) {
  const config = scenarioConfig[scenario as keyof typeof scenarioConfig] || scenarioConfig.neutral;
  const Icon = config.icon;

  // Calcola qualificatori scenario se abbiamo i dati
  let scenarioState: ScenarioState | null = null;
  if (currentData) {
    try {
      scenarioState = deriveScenario({
        walcl: currentData.walcl || 0,
        dWalcl_4w: currentData.d_walcl_4w || 0,
        wresbal: currentData.wresbal || 0,
        dWresbal_4w: currentData.d_wresbal_4w || 0,
        rrpon: currentData.rrpontsyd || 0,
        dRrpon_4w: currentData.d_rrpontsyd_4w || 0,
        sofr: currentData.sofr || 0,
        iorb: currentData.iorb || 0,
        vix: currentData.vix || 20, // Default neutrale
        hyOAS: currentData.hy_oas || 4.5, // Default neutrale
        t10y3m: currentData.t10y3m || 1, // Default neutrale
        dT10y3m_4w: currentData.d_t10y3m_4w || 0,
        dxyBroad: currentData.dxy_broad || 100, // Default neutrale
        dDxy_4w: currentData.d_dxy_4w || 0
      });
    } catch (error) {
      console.warn('Error calculating scenario qualifiers:', error);
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-600 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 relative overflow-hidden">
      {/* Data Processing Animation - Light Beam Perimeter */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent animate-pulse shadow-lg shadow-emerald-400/50" style={{animationDuration: '2s'}}></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent animate-pulse shadow-lg shadow-emerald-400/50" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}></div>
      <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-emerald-300 to-transparent animate-pulse shadow-lg shadow-emerald-400/50" style={{animationDuration: '3s', animationDelay: '1s'}}></div>
      <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-emerald-300 to-transparent animate-pulse shadow-lg shadow-emerald-400/50" style={{animationDuration: '2.8s', animationDelay: '1.5s'}}></div>
      
      {/* Flowing Data Stream */}
      <div className="absolute top-2 right-4 flex items-center gap-1 opacity-80">
        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping delay-100"></div>
        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping delay-300"></div>
        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping delay-500"></div>
        <span className="text-xs text-emerald-400 font-mono ml-2 animate-pulse">LIVE</span>
      </div>
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Scenario di Mercato Attuale
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Hero Section */}
        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-xl ${config.bgClass} ring-2 ring-${config.color}/20`}>
            <Icon className={`h-10 w-10 ${config.textClass}`} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-3xl font-bold text-white flex items-center gap-2">
              {config.label}
              {(() => {
                // Map scenario to metricKey - USA PREVIEW MODE per massimo appeal
                const scenarioLower = (scenario || '').toLowerCase();
                let metricKey = null;
                if (scenarioLower === 'stealth_qe') metricKey = 'stealth_qe';
                else if (scenarioLower === 'qe') metricKey = 'qe';
                else if (scenarioLower === 'qt') metricKey = 'qt';
                else if (scenarioLower === 'neutral') metricKey = 'neutral';
                
                return metricKey ? <ExplanationTooltip metricKey={metricKey} mode="preview" size="md" /> : null;
              })()}
            </h3>
            <p className="text-base text-slate-200">
              {config.description}
            </p>
          </div>
        </div>

        {/* Hero Metrics - RESPONSIVE: Desktop originale + Mobile compatto */}
        {currentData && (
          <>
            {/* DESKTOP: Layout originale perfetto */}
            <div className="hidden sm:grid grid-cols-3 gap-4">
              {/* Balance Sheet */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                  Balance Sheet
                </div>
                <div className="text-2xl font-bold text-white">
                  ${currentData.walcl ? (currentData.walcl / 1000000).toFixed(2) : 'N/A'}T
                </div>
                <div className={`text-sm mt-1 font-semibold ${
                  (currentData.d_walcl_4w || 0) > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(currentData.d_walcl_4w || 0) > 0 ? '↗' : '↘'} {currentData.d_walcl_4w ? Math.abs(currentData.d_walcl_4w/1000).toFixed(1) : '0'}B (4w)
                </div>
                <div className="flex justify-center mt-3">
                  <ExplanationTooltip metricKey="balance_sheet" mode="preview" size="sm" />
                </div>
              </div>

              {/* SOFR-EFFR Spread */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                  SOFR-EFFR Spread
                </div>
                <div className="text-2xl font-bold text-white">
                  {currentData.sofr_effr_spread ? (currentData.sofr_effr_spread * 100).toFixed(1) : 'N/A'} bps
                </div>
                <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      ((currentData.sofr_effr_spread || 0) * 100) > 15 ? 'bg-red-500' :
                      ((currentData.sofr_effr_spread || 0) * 100) > 10 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min((((currentData.sofr_effr_spread || 0) * 100) / 20) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {((currentData.sofr_effr_spread || 0) * 100) > 15 ? 'Stress' :
                   ((currentData.sofr_effr_spread || 0) * 100) > 10 ? 'Elevated' :
                   'Normal'}
                </div>
                <div className="flex justify-center mt-3">
                  <ExplanationTooltip metricKey="sofr_effr_spread" mode="preview" size="sm" />
                </div>
              </div>

              {/* VIX */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                  VIX (Fear Index)
                </div>
                <div className="text-2xl font-bold text-white">
                  {currentData.vix ?? 'N/A'}
                </div>
                <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${getVixRiskLevel(currentData.vix || 0).color}`}
                    style={{
                      width: `${Math.min(((currentData.vix || 0) / 40) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {getVixRiskLevel(currentData.vix || 0).label}
                </div>
                <div className="flex justify-center mt-3">
                  <ExplanationTooltip metricKey="vix" mode="preview" size="sm" />
                </div>
              </div>
            </div>

            {/* MOBILE: Layout compatto stile lista */}
            <div className="sm:hidden space-y-2">
              {/* Balance Sheet */}
              <div className="flex bg-slate-900/50 border border-slate-700 rounded-lg hover:border-emerald-500/30 transition-all">
                <div className="flex-1 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Wallet className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-white">Balance Sheet</div>
                        <div className="text-xs text-slate-400">Fed Bilancio</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-white">
                        ${currentData.walcl ? (currentData.walcl / 1000000).toFixed(2) : 'N/A'}T
                      </div>
                      <div className={`text-xs font-semibold flex items-center justify-end gap-1 ${
                        (currentData.d_walcl_4w || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <TrendingUp className={`h-3 w-3 ${(currentData.d_walcl_4w || 0) < 0 ? 'rotate-180' : ''}`} />
                        {currentData.d_walcl_4w ? Math.abs(currentData.d_walcl_4w/1000).toFixed(1) : '0'}B
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-l border-slate-700 p-2.5 flex items-center justify-center">
                  <ExplanationTooltip metricKey="balance_sheet" mode="full" size="sm" />
                </div>
              </div>

              {/* SOFR-EFFR Spread */}
              <div className="flex bg-slate-900/50 border border-slate-700 rounded-lg hover:border-emerald-500/30 transition-all">
                <div className="flex-1 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-full ${
                        ((currentData.sofr_effr_spread || 0) * 100) > 15 ? 'bg-red-500/20' :
                        ((currentData.sofr_effr_spread || 0) * 100) > 10 ? 'bg-yellow-500/20' :
                        'bg-green-500/20'
                      }`}>
                        <Activity className={`h-3.5 w-3.5 ${
                          ((currentData.sofr_effr_spread || 0) * 100) > 15 ? 'text-red-400' :
                          ((currentData.sofr_effr_spread || 0) * 100) > 10 ? 'text-yellow-400' :
                          'text-green-400'
                        }`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">SOFR-EFFR Spread</div>
                        <div className="text-xs text-slate-400">Stress Liquidità</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-white">
                        {currentData.sofr_effr_spread ? (currentData.sofr_effr_spread * 100).toFixed(1) : 'N/A'} bps
                      </div>
                      <div className={`text-xs font-semibold flex items-center justify-end gap-1 ${
                        ((currentData.sofr_effr_spread || 0) * 100) > 15 ? 'text-red-400' :
                        ((currentData.sofr_effr_spread || 0) * 100) > 10 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {((currentData.sofr_effr_spread || 0) * 100) > 15 ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : ((currentData.sofr_effr_spread || 0) * 100) > 10 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {((currentData.sofr_effr_spread || 0) * 100) > 15 ? 'Stress' :
                         ((currentData.sofr_effr_spread || 0) * 100) > 10 ? 'Elevated' : 
                         'Normal'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-l border-slate-700 p-2.5 flex items-center justify-center">
                  <ExplanationTooltip metricKey="sofr_effr_spread" mode="full" size="sm" />
                </div>
              </div>

              {/* VIX */}
              <div className="flex bg-slate-900/50 border border-slate-700 rounded-lg hover:border-emerald-500/30 transition-all">
                <div className="flex-1 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-full ${
                        (currentData.vix || 0) < 14 ? 'bg-green-500/20' :
                        (currentData.vix || 0) < 16 ? 'bg-yellow-500/20' :
                        (currentData.vix || 0) < 18 ? 'bg-orange-400/20' :
                        (currentData.vix || 0) < 22 ? 'bg-orange-500/20' :
                        (currentData.vix || 0) < 25 ? 'bg-red-500/20' :
                        'bg-red-600/20'
                      }`}>
                        <AlertTriangle className={`h-3.5 w-3.5 ${
                          (currentData.vix || 0) < 14 ? 'text-green-400' :
                          (currentData.vix || 0) < 16 ? 'text-yellow-400' :
                          (currentData.vix || 0) < 18 ? 'text-orange-400' :
                          (currentData.vix || 0) < 22 ? 'text-orange-500' :
                          (currentData.vix || 0) < 25 ? 'text-red-400' :
                          'text-red-500'
                        }`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">VIX Fear Index</div>
                        <div className="text-xs text-slate-400">Volatilità Mercato</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-white">
                        {currentData.vix ?? 'N/A'}
                      </div>
                      <div className={`text-xs font-semibold flex items-center justify-end gap-1 whitespace-nowrap ${
                        (currentData.vix || 0) < 14 ? 'text-green-400' :
                        (currentData.vix || 0) < 16 ? 'text-yellow-400' :
                        (currentData.vix || 0) < 18 ? 'text-orange-400' :
                        (currentData.vix || 0) < 22 ? 'text-orange-500' :
                        (currentData.vix || 0) < 25 ? 'text-red-400' :
                        'text-red-500'
                      }`}>
                        {(currentData.vix || 0) > 22 ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (currentData.vix || 0) > 16 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {getVixRiskLevel(currentData.vix || 0).label}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-l border-slate-700 p-2.5 flex items-center justify-center">
                  <ExplanationTooltip metricKey="vix" mode="full" size="sm" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Data-Driven Badges */}
        {currentData && (
          <>
            <div className="flex flex-wrap gap-2">
              {(() => {
                // Calculate ACTUAL risk from metrics
                const vix = currentData.vix || 20;
                const sofrEffr = currentData.sofr_effr_spread || 0;
                const bsDelta = currentData.d_walcl_4w || 0;
                
                // Risk Level Logic - USA STESSA LOGICA DI getVixRiskLevel
                const vixRisk = getVixRiskLevel(vix);
                let riskLevel = vixRisk.risk;
                let riskColor = 'bg-green-500/10 text-green-600 border-green-500/20';
                
                // Override con SOFR-EFFR se più grave
                if (vix > 22 || sofrEffr > 10) {
                  riskLevel = 'ELEVATO';
                  riskColor = 'bg-red-500/10 text-red-600 border-red-500/20';
                } else if (vixRisk.risk === 'MEDIO' || sofrEffr > 5) {
                  riskLevel = 'MEDIO';
                  riskColor = 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
                } else if (vixRisk.risk === 'NORMALE' && sofrEffr <= 5) {
                  riskLevel = 'NORMALE';
                  riskColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
                } else if (vixRisk.risk === 'BASSO') {
                  riskLevel = 'BASSO';
                  riskColor = 'bg-green-500/10 text-green-600 border-green-500/20';
                }
                
                // Sustainability Logic - se BS cala è BASSA non ALTA!
                let sustainability = 'MEDIA';
                let sustainColor = 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
                
                if (Math.abs(bsDelta) < 5000 && sofrEffr < 3 && vix < 16) {
                  sustainability = 'ALTA';
                  sustainColor = 'bg-green-500/10 text-green-600 border-green-500/20';
                } else if (bsDelta < 0 || sofrEffr > 5 || vix > 20) {  // BS che cala = BASSA
                  sustainability = 'BASSA';
                  sustainColor = 'bg-red-500/10 text-red-600 border-red-500/20';
                }
                
                // Confidence Logic - più rigorosa
                const calmSignals = [
                  vix < 15,  // Più rigoroso
                  sofrEffr < 3,  // Più rigoroso
                  Math.abs(bsDelta) < 10000  // Più rigoroso
                ].filter(Boolean).length;
                
                let confidence = 'BASSA';
                let confColor = 'bg-red-500/10 text-red-600 border-red-500/20';
                
                if (calmSignals >= 3) {  // Tutti e 3 devono essere OK
                  confidence = 'ALTA';
                  confColor = 'bg-green-500/10 text-green-600 border-green-500/20';
                } else if (calmSignals >= 2) {
                  confidence = 'MEDIA';
                  confColor = 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
                }
                
                return (
                  <>
                    <Badge className={`${riskColor} border flex items-center gap-1.5`}>
                      Rischio: {riskLevel}
                      <ExplanationTooltip metricKey="risk_level" mode="minimal" size="sm" />
                    </Badge>
                    
                    <Badge className={`${sustainColor} border flex items-center gap-1.5`}>
                      Sostenibilità: {sustainability}
                      <ExplanationTooltip metricKey="sustainability" mode="minimal" size="sm" />
                    </Badge>
                    
                    <Badge className={`${confColor} border flex items-center gap-1.5`}>
                      Confidenza: {confidence}
                      <ExplanationTooltip metricKey="confidence" mode="minimal" size="sm" />
                    </Badge>
                  </>
                );
              })()}
            </div>

            {/* Data-Driven Market Alert */}
            {(() => {
              const vix = currentData.vix || 20;
              const sofrEffr = currentData.sofr_effr_spread || 0;
              
              // Determine alert level and message based on ACTUAL data
              if (vix < 16 && sofrEffr < 5) {
                return (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-semibold text-green-400 text-sm">Mercato Monetario Calmo</h5>
                      <p className="text-sm text-green-300">
                        Liquidità abbondante, spread ristretti. Ambiente a basso stress supporta asset rischiosi. 
                        VIX {vix.toFixed(1)} (calmo), SOFR-EFFR {sofrEffr.toFixed(1)}bps (normale).
                      </p>
                    </div>
                  </div>
                );
              } else if ((vix >= 16 && vix <= 22) || (sofrEffr >= 5 && sofrEffr <= 10)) {
                return (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="font-semibold text-yellow-400 text-sm">Cautela Moderata</h5>
                      <p className="text-sm text-yellow-300">
                        Spread in allargamento, monitora segnali di stress. VIX {vix.toFixed(1)} (elevato), 
                        SOFR-EFFR {sofrEffr.toFixed(1)}bps. Mantieni posizionamento bilanciato.
                      </p>
                    </div>
                  </div>
                );
              } else if (vix > 22 || sofrEffr > 10) {
                return (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="font-semibold text-red-400 text-sm">STRESS RILEVATO</h5>
                      <p className="text-sm text-red-300">
                        Inasprimento mercato monetario rilevato. VIX {vix.toFixed(1)} (stress), 
                        SOFR-EFFR {sofrEffr.toFixed(1)}bps (elevato). Risk management critico.
                      </p>
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}

            {/* Data-Driven Drivers */}
            {(() => {
              const vix = currentData.vix || 20;
              const sofrEffr = currentData.sofr_effr_spread || 0;
              const bsDelta = currentData.d_walcl_4w || 0;
              const rrpDelta = currentData.d_rrpontsyd_4w || 0;
              
              const drivers: string[] = [];
              
              if (Math.abs(bsDelta) > 10000) {
                drivers.push(`Balance Sheet ${bsDelta > 0 ? 'espansione' : 'contrazione'}: ${(bsDelta/1000).toFixed(1)}B`);
              }
              if (Math.abs(rrpDelta) > 5000) {
                drivers.push(`RRP ${rrpDelta > 0 ? 'accumulo' : 'drenaggio'}: ${(rrpDelta/1000).toFixed(1)}B`);
              }
              if (vix > 18) {
                drivers.push(`VIX elevato: ${vix.toFixed(1)} (stress market)`);
              }
              if (sofrEffr > 5) {
                drivers.push(`SOFR-EFFR spread: ${sofrEffr.toFixed(1)}bps (tensione)`);
              }
              if (vix < 16 && sofrEffr < 5) {
                drivers.push(`Condizioni calme: VIX ${vix.toFixed(1)}, spread ${sofrEffr.toFixed(1)}bps`);
              }
              
              return drivers.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="font-semibold text-sm text-slate-300">Drivers Attuali:</h5>
                  <div className="grid gap-1">
                    {drivers.map((driver, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-400">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                        {driver}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </>
        )}

        <Separator />

        {/* Analysis Section - Compact Visual Cards */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <LineChart className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm">Analisi Situazione</h4>
          </div>
          
          {currentData && (() => {
            // Calculate key metrics for visual cards - SAFE DEFAULTS
            const vix = currentData.vix ?? null; // No default - use null to detect missing data
            const sofrEffr = currentData.sofr_effr_spread ?? null;
            const bsDelta = currentData.d_walcl_4w ?? null;
            const balanceSheet = currentData.walcl ? (currentData.walcl / 1000000).toFixed(2) : 'N/A';
            const rrpDelta = currentData.d_rrpontsyd_4w ? (currentData.d_rrpontsyd_4w/1000).toFixed(1) : 'N/A';
            const hyOAS = currentData.hy_oas ?? null;
            
            // Determine scenario color and status
            const scenarioLower = (scenario || '').toLowerCase();
            let scenarioStatus = 'Neutrale';
            let scenarioColor = 'text-blue-400';
            let scenarioIcon = Activity;
            
            if (scenarioLower === 'stealth_qe') {
              scenarioStatus = 'Stealth QE';
              scenarioColor = 'text-yellow-400';
              scenarioIcon = Zap;
            } else if (scenarioLower === 'qe') {
              scenarioStatus = 'QE Attivo';
              scenarioColor = 'text-green-400';
              scenarioIcon = TrendingUp;
            } else if (scenarioLower === 'qt') {
              scenarioStatus = 'QT Attivo';
              scenarioColor = 'text-red-400';
              scenarioIcon = TrendingDown;
            }
            
            // Risk assessment - FIXED LOGIC WITH PROPER COVERAGE
            let riskStatus = 'Dati Mancanti';
            let riskColor = 'text-slate-400';
            let riskIcon = Activity;
            
            // Only calculate if we have valid data
            if (vix !== null && sofrEffr !== null) {
              if (vix > 22 || sofrEffr > 10) {
                riskStatus = 'Elevato';
                riskColor = 'text-red-400';
                riskIcon = AlertTriangle;
              } else if (vix > 16 || sofrEffr > 5) {
                riskStatus = 'Moderato';
                riskColor = 'text-yellow-400';
                riskIcon = Eye;
              } else if (vix >= 14 || sofrEffr >= 3) { // FIXED: Cover 14-16 range
                riskStatus = 'Normale';
                riskColor = 'text-blue-400';
                riskIcon = Activity;
              } else {
                riskStatus = 'Basso';
                riskColor = 'text-green-400';
                riskIcon = TrendingUp;
              }
            }
            
            // Liquidity assessment - SAFE NULL HANDLING + CONTEXT
            let liquidityStatus = 'Dati Mancanti';
            let liquidityColor = 'text-slate-400';
            let liquidityIcon = Activity;
            
            if (bsDelta !== null) {
              const rrpDeltaNum = rrpDelta !== 'N/A' ? parseFloat(rrpDelta) : 0;
              const sofrNum = sofrEffr !== null ? sofrEffr : 10; // Default pessimistico se manca
              
              // FIXED: Valutazione più sofisticata
              if (bsDelta > 20 && sofrNum < 5) {
                liquidityStatus = 'Espansiva Forte';
                liquidityColor = 'text-green-400';
                liquidityIcon = TrendingUp;
              } else if (bsDelta > 5 || (rrpDeltaNum < -30 && sofrNum < 3)) {
                liquidityStatus = 'Espansiva';
                liquidityColor = 'text-green-400';
                liquidityIcon = TrendingUp;
              } else if (bsDelta < -20 || sofrNum > 10) {
                liquidityStatus = 'Contrattiva';
                liquidityColor = 'text-red-400';
                liquidityIcon = TrendingDown;
              } else if (Math.abs(bsDelta) < 5 && sofrNum < 5) {
                liquidityStatus = 'Stabile (ottima)';
                liquidityColor = 'text-blue-400';
                liquidityIcon = Activity;
              } else {
                liquidityStatus = 'Equilibrata';
                liquidityColor = 'text-blue-400';
                liquidityIcon = Activity;
              }
            }
            
            // Outlook assessment - CONSISTENT THRESHOLDS + CONTRARIAN SIGNALS
            let outlookStatus = 'Dati Insufficienti';
            let outlookColor = 'text-slate-400';
            let outlookDesc = 'Impossibile valutare senza dati completi';
            
            if (vix !== null && sofrEffr !== null && bsDelta !== null) {
              const hyOasNum = hyOAS !== null ? hyOAS : 4.5;
              
              // Check for contrarian signals (VIX elevated BUT liquidity/credit perfect)
              const contrarianSignal = vix > 16 && vix < 19 && sofrEffr < 3 && hyOasNum < 3.5;
              
              if (vix > 25 || sofrEffr > 15) {
                outlookStatus = 'Difensivo';
                outlookColor = 'text-red-400';
                outlookDesc = 'Priorità preservazione capitale';
              } else if (vix > 20 || sofrEffr > 8) {
                outlookStatus = 'Cautela';
                outlookColor = 'text-yellow-400';
                outlookDesc = 'Monitorare sviluppi stress';
              } else if (contrarianSignal) {
                outlookStatus = 'Segnali Misti';
                outlookColor = 'text-yellow-400'; // FIXED: Yellow for mixed signals = caution
                outlookDesc = 'Segnali contrastanti richiedono attenzione';
              } else if (vix < 16 && sofrEffr < 5 && bsDelta >= 0) {
                outlookStatus = 'Supportivo';
                outlookColor = 'text-green-400';
                outlookDesc = 'Ambiente favorevole risk assets';
              } else {
                outlookStatus = 'Stabile';
                outlookColor = 'text-blue-400';
                outlookDesc = 'Condizioni equilibrate';
              }
            }
            
            const ScenarioIcon = scenarioIcon;
            const RiskIcon = riskIcon;
            const LiquidityIcon = liquidityIcon;
            
            // Get explanations from existing engine
            const balanceExplanation = getExplanation('balance_sheet');
            const vixExplanation = getExplanation('vix');
            const scenarioExplanation = getExplanation(scenarioLower || 'neutral');
            
            // Create beginner-friendly descriptions - NULL SAFE + ACCURATE
            let liquiditySimpleDesc = 'Dati liquidità non disponibili';
            let liquidityDetailDesc = 'Impossibile valutare la situazione senza dati Fed completi';
            
            if (bsDelta !== null) {
              const rrpDeltaNum = rrpDelta !== 'N/A' ? parseFloat(rrpDelta) : 0;
              const sofrNum = sofrEffr !== null ? sofrEffr : 10;
              
              // FIXED: Descrizioni più accurate basate su dati reali
              if (bsDelta > 20 && sofrNum < 5) {
                liquiditySimpleDesc = 'La Fed sta pompando soldi nel sistema';
                liquidityDetailDesc = `La Fed ha iniettato ${(bsDelta/1000).toFixed(1)}B nelle banche - più liquidità disponibile per prestiti e investimenti. Mercato monetario fluido (spread ${sofrNum.toFixed(1)}bps).`;
              } else if (bsDelta > 5) {
                liquiditySimpleDesc = 'La Fed sta espandendo liquidità gradualmente';
                liquidityDetailDesc = `Espansione moderata del bilancio (+${(bsDelta/1000).toFixed(1)}B) - supporto alla liquidità senza eccessi.`;
              } else if (bsDelta < -20) {
                liquiditySimpleDesc = 'La Fed sta drenando liquidità';
                liquidityDetailDesc = `Contrazione del bilancio (${(bsDelta/1000).toFixed(1)}B) - Fed riduce la quantità di soldi in circolazione. ${sofrNum > 10 ? 'ATTENZIONE: Spread in allargamento, stress inizia.' : 'Finora senza tensioni.'}`;
              } else if (Math.abs(bsDelta) < 5 && sofrNum < 3) {
                liquiditySimpleDesc = 'Liquidità stabile e abbondante';
                liquidityDetailDesc = `Balance Sheet quasi invariato (${(bsDelta/1000).toFixed(1)}B), ma spread SOFR-EFFR ${sofrNum.toFixed(1)}bps indica sistema monetario perfettamente fluido. Nessun problema di liquidità.`;
              } else if (Math.abs(bsDelta) < 5 && sofrNum < 5) {
                liquiditySimpleDesc = 'La Fed mantiene liquidità stabile';
                liquidityDetailDesc = `Nessun cambiamento significativo nel bilancio (${(bsDelta/1000).toFixed(1)}B). Mercato monetario normale (spread ${sofrNum.toFixed(1)}bps).`;
              } else {
                liquiditySimpleDesc = 'Situazione liquidità in transizione';
                liquidityDetailDesc = `Bilancio ${bsDelta > 0 ? '+' : ''}${(bsDelta/1000).toFixed(1)}B, spread ${sofrNum.toFixed(1)}bps. Monitorare sviluppi.`;
              }
            }
            
            // Scenario simple descriptions
            let scenarioSimpleDesc = 'La Fed non sta aiutando né ostacolando';
            let scenarioDetailDesc = 'Policy neutrale - mercati guidati da fondamentali economici';
            
            if (scenarioLower === 'stealth_qe') {
              scenarioSimpleDesc = 'La Fed aiuta i mercati di nascosto';
              scenarioDetailDesc = 'Supporto silenzioso - inietta liquidità senza annunciarlo ufficialmente';
            } else if (scenarioLower === 'qe') {
              scenarioSimpleDesc = 'La Fed aiuta attivamente i mercati';
              scenarioDetailDesc = 'Quantitative Easing - compra titoli e pompa liquidità massiccia nel sistema';
            } else if (scenarioLower === 'qt') {
              scenarioSimpleDesc = 'La Fed ostacola i mercati';
              scenarioDetailDesc = 'Quantitative Tightening - drena liquidità e mette pressione sui prezzi';
            }
            
            // Risk simple descriptions - NULL SAFE + NUANCED
            let riskSimpleDesc = 'Dati rischio non disponibili';
            let riskDetailDesc = 'Impossibile valutare il nervosismo del mercato senza dati VIX';
            
            if (vix !== null && sofrEffr !== null) {
              const hyOasNum = hyOAS !== null ? hyOAS : 4.5; // Default neutrale
              
              // FIXED: Analisi più sofisticata che considera HY OAS
              if (vix > 22 || sofrEffr > 10) {
                riskSimpleDesc = 'I mercati sono molto nervosi';
                riskDetailDesc = `Alta volatilità (VIX ${vix.toFixed(1)}) ${sofrEffr > 10 ? 'e tensioni liquidità' : ''} - investitori spaventati, possibili forti movimenti di prezzo`;
              } else if (vix > 18 || sofrEffr > 8) {
                riskSimpleDesc = 'Nervosismo crescente nei mercati';
                riskDetailDesc = `VIX ${vix.toFixed(1)} indica cautela. ${hyOasNum < 3.5 ? 'Però credito ancora tight (investitori cercano yield) - segnale misto.' : 'Credit spread confermano cautela.'}`;
              } else if (vix > 16 && sofrEffr < 3) {
                riskSimpleDesc = 'Cautela moderata nonostante liquidità ottima';
                riskDetailDesc = `VIX ${vix.toFixed(1)} leggermente elevato MA spread ${sofrEffr.toFixed(1)}bps ottimo. ${hyOasNum < 3.5 ? 'HY OAS ' + hyOasNum.toFixed(1) + '% tight = investitori cercano rischio. Segnali contrastanti.' : 'Cautela giustificata.'}`;
              } else if (vix >= 14 || sofrEffr >= 3) {
                riskSimpleDesc = 'I mercati sono tranquilli';
                riskDetailDesc = `Volatilità normale (VIX ${vix.toFixed(1)}), spread ${sofrEffr.toFixed(1)}bps - investitori non sono particolarmente spaventati`;
              } else {
                riskSimpleDesc = 'I mercati sono molto calmi';
                riskDetailDesc = `Volatilità bassa (VIX ${vix.toFixed(1)}) - investitori fiduciosi. ${hyOasNum < 3 ? 'ATTENZIONE: HY OAS ' + hyOasNum.toFixed(1) + '% troppo tight, possibile complacency.' : 'Calma giustificata.'}`;
              }
            }
            
            // Outlook simple descriptions - NULL SAFE + CONTEXT AWARE
            let outlookSimpleDesc = 'Impossibile valutare momento';
            let outlookDetailDesc = 'Servono dati completi per dare indicazioni sul timing investimenti';
            
            if (vix !== null && sofrEffr !== null && bsDelta !== null) {
              const hyOasNum = hyOAS !== null ? hyOAS : 4.5;
              
              if (vix > 25 || sofrEffr > 15) {
                outlookSimpleDesc = 'Momento difficile - proteggere capitale';
                outlookDetailDesc = `Alta tensione (VIX ${vix.toFixed(1)}, spread ${sofrEffr.toFixed(1)}bps) - priorità alla sicurezza, evitare investimenti rischiosi`;
              } else if (vix > 20 || sofrEffr > 8) {
                outlookSimpleDesc = 'Momento di cautela negli investimenti';
                outlookDetailDesc = `Segnali di stress (VIX ${vix.toFixed(1)}) - meglio essere prudenti e monitorare sviluppi`;
              } else if (vix < 16 && sofrEffr < 5 && bsDelta >= 0) {
                outlookSimpleDesc = 'Ambiente generalmente supportivo';
                outlookDetailDesc = `Liquidità ${Math.abs(bsDelta) < 5 ? 'stabile' : 'in espansione'} (${(bsDelta/1000).toFixed(1)}B), spread ${sofrEffr.toFixed(1)}bps ottimo. ${hyOasNum < 3 ? 'ATTENZIONE: HY OAS ' + hyOasNum.toFixed(1) + '% troppo tight (possibile complacency)' : 'Condizioni favorevoli per risk assets'}`;
              } else if (vix > 16 && vix < 19 && sofrEffr < 3 && hyOasNum < 3.5) {
                outlookSimpleDesc = 'Segnali contrastanti - prudenza';
                outlookDetailDesc = `VIX ${vix.toFixed(1)} (cautela) MA liquidità ottima (spread ${sofrEffr.toFixed(1)}bps) e credit tight (HY ${hyOasNum.toFixed(1)}%). Investitori cercano yield nonostante nervosismo. Seguire attentamente.`;
              } else {
                outlookSimpleDesc = 'Momento equilibrato per investire';
                outlookDetailDesc = `Condizioni miste - VIX ${vix.toFixed(1)}, spread ${sofrEffr.toFixed(1)}bps, bilancio ${(bsDelta/1000).toFixed(1)}B. Approccio bilanciato consigliato.`;
              }
            }
            
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Card 1: Liquidità Fed - BEGINNER FRIENDLY */}
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-md bg-slate-800 group-hover:bg-emerald-900/30 transition-colors`}>
                      <LiquidityIcon className={`h-4 w-4 ${liquidityColor} transition-colors`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Liquidità Fed</div>
                      <div className={`text-sm font-semibold ${liquidityColor}`}>{liquiditySimpleDesc}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {liquidityDetailDesc}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
                    <Wallet className="h-3.5 w-3.5 text-slate-400" />
                    <span>Balance Sheet: ${balanceSheet}T {bsDelta !== null ? (bsDelta > 0 ? '(+' + (bsDelta/1000).toFixed(1) + 'B)' : bsDelta < 0 ? '(' + (bsDelta/1000).toFixed(1) + 'B)' : '(stabile)') : '(dati mancanti)'}</span>
                  </div>
                </div>

                {/* Card 2: Scenario Fed - BEGINNER FRIENDLY */}
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-md bg-slate-800 group-hover:bg-emerald-900/30 transition-colors`}>
                      <ScenarioIcon className={`h-4 w-4 ${scenarioColor} transition-colors`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Scenario Fed</div>
                      <div className={`text-sm font-semibold ${scenarioColor}`}>{scenarioSimpleDesc}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {scenarioDetailDesc}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
                    <Zap className="h-3.5 w-3.5 text-slate-400" />
                    <span>Policy: {scenarioStatus} {scenarioLower === 'qe' ? '(Temporanea)' : '(Medio termine)'}</span>
                  </div>
                </div>

                {/* Card 3: Risk Level - BEGINNER FRIENDLY */}
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-md bg-slate-800 group-hover:bg-emerald-900/30 transition-colors`}>
                      <RiskIcon className={`h-4 w-4 ${riskColor} transition-colors`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Livello Paura</div>
                      <div className={`text-sm font-semibold ${riskColor}`}>{riskSimpleDesc}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {riskDetailDesc}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
                    <Brain className="h-3.5 w-3.5 text-slate-400" />
                    <span>Fear Index (VIX): {vix !== null ? vix.toFixed(1) + ' - ' + (vix > 22 ? 'Alto' : vix > 16 ? 'Medio' : 'Basso') : 'N/A (dati mancanti)'}</span>
                  </div>
                </div>

                {/* Card 4: Market Outlook - BEGINNER FRIENDLY */}
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-md bg-slate-800 group-hover:bg-emerald-900/30 transition-colors`}>
                      <Target className={`h-4 w-4 ${outlookColor} transition-colors`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Momento Investimenti</div>
                      <div className={`text-sm font-semibold ${outlookColor}`}>{outlookSimpleDesc}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {outlookDetailDesc}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
                    {vix !== null && sofrEffr !== null ? (
                      vix < 16 && sofrEffr < 5 ? (
                        <>
                          <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                          <span>Ambiente Risk-On (favorevole)</span>
                        </>
                      ) : vix > 22 || sofrEffr > 10 ? (
                        <>
                          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                          <span>Ambiente Risk-Off (difensivo)</span>
                        </>
                      ) : (
                        <>
                          <TrendingUpDown className="h-3.5 w-3.5 text-yellow-400" />
                          <span>Segnali misti (prudenza)</span>
                        </>
                      )
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                        <span>Dati insufficienti per valutazione</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <Separator />

        {/* Indicators Grid - Enhanced Visual */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm">Indicatori Tecnici</h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 pl-2">
            {(config.getIndicators ? config.getIndicators(currentData) : []).map((indicator, index) => {
              const IndicatorIcon = indicator.icon;
              const status = indicator.status.toLowerCase();
              
              // Determine badge color based on content
              let badgeColor = 'bg-slate-700 text-slate-300';
              if (status.includes('espansione') || status.includes('flood') || status.includes('crescita')) {
                badgeColor = 'bg-green-900/40 text-green-300 border border-green-500/30';
              } else if (status.includes('stress') || status.includes('calo') || status.includes('drenaggio')) {
                badgeColor = 'bg-red-900/40 text-red-300 border border-red-500/30';
              } else if (status.includes('spike') || status.includes('elevat')) {
                badgeColor = 'bg-yellow-900/40 text-yellow-300 border border-yellow-500/30';
              } else if (status.includes('normal') || status.includes('stabil')) {
                badgeColor = 'bg-blue-900/40 text-blue-300 border border-blue-500/30';
              }
              
              return (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg bg-slate-900/60 border border-slate-700 hover:border-emerald-500/40 transition-all duration-300"
                >
                  {/* Animated gradient background on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative p-3 flex items-start gap-3">
                    {/* Icon with background */}
                    <div className="p-2 rounded-md bg-slate-800 group-hover:bg-emerald-900/30 transition-colors">
                      <IndicatorIcon className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        {indicator.label}
                        {(() => {
                          // Map indicator label to metricKey
                          const labelLower = indicator.label.toLowerCase();
                          let metricKey = null;
                          if (labelLower.includes('balance sheet') || labelLower.includes('bilancio')) metricKey = 'balance_sheet';
                          else if (labelLower.includes('rrp')) metricKey = 'rrp';
                          else if (labelLower.includes('sofr') && labelLower.includes('effr')) metricKey = 'sofr_effr_spread';
                          else if (labelLower.includes('reserves') || labelLower.includes('riserve')) metricKey = 'reserves';
                          else if (labelLower.includes('hy oas') || labelLower.includes('high yield')) metricKey = 'hy_oas';
                          else if (labelLower.includes('vix')) metricKey = 'vix';
                          
                          return metricKey ? <ExplanationTooltip metricKey={metricKey} mode="minimal" size="sm" /> : null;
                        })()}
                      </p>
                      <div className={`text-sm font-medium px-2 py-1 rounded ${badgeColor} inline-block`}>
                        {indicator.status}
                      </div>
                    </div>
                    
                    {/* Live data indicator */}
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: `${index * 200}ms`}}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
