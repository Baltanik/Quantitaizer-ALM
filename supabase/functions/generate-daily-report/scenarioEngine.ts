// ============================================================================
// SCENARIO ENGINE - Copia adattata per Deno Edge Runtime
// ============================================================================

export type Context = 'stress_guidato' | 'crescita_guidata' | 'ambiguo';
export type Sustainability = 'alta' | 'media' | 'bassa';
export type RiskLevel = 'normale' | 'elevato' | 'alto';
export type Confidence = 'alta' | 'media' | 'bassa';

export interface ScenarioState {
  scenario: string;
  context: Context;
  sustainability: Sustainability;
  risk_level: RiskLevel;
  confidence: Confidence;
  drivers: string[];
  date: string;
}

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
  // 1) Scenario base
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
    inputs.vix > 22,
    inputs.hyOAS > 5.5,
    inputs.dDxy_4w > 0.5,
    inputs.t10y3m < 0 && inputs.dT10y3m_4w < 0,
    (inputs.sofr - inputs.iorb) > 0.15
  ].filter(Boolean).length;

  const growthSignals = [
    inputs.vix < 16,
    inputs.hyOAS < 4.0,
    inputs.dDxy_4w < -0.5,
    inputs.t10y3m > 0 || inputs.dT10y3m_4w > 0,
    inputs.dWresbal_4w > 0 && inputs.dRrpon_4w < 0
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




