import { Context, Sustainability, RiskLevel, Confidence, ScenarioState } from '@/services/fedData';

interface ScenarioInputs {
  walcl: number;
  dWalcl_4w: number;
  wresbal: number;
  dWresbal_4w: number;
  rrpon: number;
  dRrpon_4w: number;
  sofr: number;
  iorb: number;
  vix: number;
  hyOAS: number;
  t10y3m: number;
  dT10y3m_4w: number;
  dxyBroad: number;
  dDxy_4w: number;
}

export function deriveScenario(inputs: ScenarioInputs): ScenarioState {
  // 1) Scenario base (mantieni logica esistente ma migliorata)
  let scenario = 'neutral';
  
  const isExpanding = inputs.dWalcl_4w > 0 || inputs.dWresbal_4w > 0;
  const isContracting = inputs.dWalcl_4w < 0 && inputs.dWresbal_4w < 0;
  const rrpDraining = inputs.dRrpon_4w < 0;
  
  if (isExpanding && rrpDraining) {
    scenario = 'stealth_qe';
  } else if (inputs.dWalcl_4w > 50000 && inputs.dWresbal_4w > 100) {
    scenario = 'qe';
  } else if (isContracting) {
    scenario = 'qt';
  }

  // 2) Conta segnali stress vs growth
  const stressSignals = [
    inputs.vix > 22,                              // Volatilità alta
    inputs.hyOAS > 5.5,                          // Credit spreads ampi
    inputs.dDxy_4w > 0.5,                        // Dollar rafforzamento
    inputs.t10y3m < 0 && inputs.dT10y3m_4w < 0, // Curva invertita e peggiorante
    (inputs.sofr - inputs.iorb) > 0.15           // Spread SOFR-IORB elevato
  ].filter(Boolean).length;

  const growthSignals = [
    inputs.vix < 16,                             // Volatilità bassa
    inputs.hyOAS < 4.0,                         // Credit spreads stretti
    inputs.dDxy_4w < -0.5,                      // Dollar indebolimento
    inputs.t10y3m > 0 || inputs.dT10y3m_4w > 0, // Curva normale o migliorante
    inputs.dWresbal_4w > 0 && inputs.dRrpon_4w < 0 // Rotazione liquidità sana
  ].filter(Boolean).length;

  // 3) Determina context
  let context: Context = 'ambiguo';
  if (stressSignals >= 2 && stressSignals > growthSignals) {
    context = 'stress_guidato';
  } else if (growthSignals >= 2 && growthSignals > stressSignals) {
    context = 'crescita_guidata';
  }

  // 4) Sustainability
  const rotationOk = inputs.dWresbal_4w > 0 && inputs.dRrpon_4w < 0;
  let sustainability: Sustainability = 'media';
  
  if (rotationOk && growthSignals >= 2) {
    sustainability = 'alta';
  } else if (context === 'stress_guidato' || (!rotationOk && inputs.dWalcl_4w > 0)) {
    sustainability = 'bassa';
  }

  // 5) Risk level
  let risk_level: RiskLevel = 'elevato';
  
  if (context === 'crescita_guidata' && sustainability !== 'bassa') {
    risk_level = 'normale';
  } else if (context === 'stress_guidato' && (inputs.vix > 24 || inputs.hyOAS > 6.0)) {
    risk_level = 'alto';
  }

  // 6) Confidence
  const votes = Math.max(stressSignals, growthSignals);
  const confidence: Confidence = votes >= 3 ? 'alta' : votes === 2 ? 'media' : 'bassa';

  // 7) Drivers
  const drivers: string[] = [];
  
  if (inputs.dWresbal_4w > 0) drivers.push('Riserve in aumento');
  if (inputs.dRrpon_4w < 0) drivers.push('RRP in drenaggio');
  if (inputs.vix > 22) drivers.push('VIX elevato');
  if (inputs.hyOAS > 5.5) drivers.push('HY OAS in widening');
  if (inputs.dDxy_4w > 0.5) drivers.push('USD in rafforzamento');
  if (inputs.t10y3m < 0) drivers.push('Curva invertita');
  if ((inputs.sofr - inputs.iorb) > 0.15) drivers.push('SOFR > IORB (tensione)');
  if (inputs.dWalcl_4w > 50000) drivers.push('Bilancio Fed in espansione');
  if (inputs.dWalcl_4w < -50000) drivers.push('Bilancio Fed in contrazione');

  return {
    scenario,
    context,
    sustainability,
    risk_level,
    confidence,
    drivers,
    date: new Date().toISOString().split('T')[0]
  };
}

export function canShowBullish(s: ScenarioState): boolean {
  return s.scenario === 'stealth_qe' && 
         s.context === 'crescita_guidata' && 
         s.risk_level === 'normale' && 
         s.sustainability !== 'bassa' && 
         s.confidence !== 'bassa';
}

export function getContextColor(context: Context): string {
  switch (context) {
    case 'stress_guidato': return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'crescita_guidata': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'ambiguo': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}

export function getRiskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'normale': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'elevato': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'alto': return 'bg-red-500/10 text-red-600 border-red-500/20';
    default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}
