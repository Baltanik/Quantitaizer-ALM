import { supabase } from "@/integrations/supabase/client";

// Nuovi types per sistema qualificazione scenari
export type Context = 'stress_guidato' | 'crescita_guidata' | 'ambiguo';
export type Sustainability = 'bassa' | 'media' | 'alta';
export type RiskLevel = 'normale' | 'elevato' | 'alto';
export type Confidence = 'bassa' | 'media' | 'alta';

export interface FedData {
  id: number;
  date: string;
  sofr: number | null;
  iorb: number | null;
  effr: number | null;                    // HOTFIX 2025-11-04: Effective Federal Funds Rate
  sofr_iorb_spread: number | null;
  sofr_effr_spread: number | null;        // HOTFIX 2025-11-04: Money market stress indicator
  effr_iorb_spread: number | null;        // HOTFIX 2025-11-04: Fed floor effectiveness
  walcl: number | null;
  wresbal: number | null;
  rrpontsyd: number | null;
  rpontsyd: number | null;
  rponttld: number | null;
  dtb3: number | null;
  dtb1yr: number | null;
  us10y: number | null;
  scenario: string | null;
  // Nuovi indicatori di mercato
  vix: number | null;
  hy_oas: number | null;
  t10y3m: number | null;
  dxy_broad: number | null;
  // Delta a 4 settimane
  d_walcl_4w: number | null;
  d_wresbal_4w: number | null;
  d_rrpontsyd_4w: number | null;
  d_t10y3m_4w: number | null;
  d_dxy_4w: number | null;
  // Qualificatori scenario
  context: Context | null;
  sustainability: Sustainability | null;
  risk_level: RiskLevel | null;
  confidence: Confidence | null;
  drivers: string[] | null;
  // === V2 NEW FIELDS ===
  // Treasury General Account e Investment Grade
  tga: number | null;
  ig_spread: number | null;
  // Liquidity Score V2
  liquidity_score: number | null;
  liquidity_grade: string | null;
  liquidity_trend: string | null;
  liquidity_confidence: number | null;
  // Leading Indicators V2
  leading_indicators: LeadingIndicatorsData | null;
  created_at: string;
  updated_at: string;
}

// V2 Leading Indicators interface for database storage
export interface LeadingIndicatorsData {
  tga_trend: 'expanding' | 'contracting' | 'stable';
  tga_impact: 'positive' | 'negative' | 'neutral';
  rrp_velocity: number;
  rrp_acceleration: 'accelerating' | 'decelerating' | 'stable';
  credit_stress_index: number;
  credit_trend: 'improving' | 'deteriorating' | 'stable';
  repo_spike_risk: number;
  qt_pivot_probability: number;
  overall_signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

export interface ScenarioState {
  scenario: string;
  context: Context;
  sustainability: Sustainability;
  risk_level: RiskLevel;
  confidence: Confidence;
  drivers: string[];
  date: string;
}

export interface Signal {
  id: number;
  date: string;
  signal_type: string | null;
  description: string | null;
  confidence: number | null;
  created_at: string;
}

export async function fetchLatestFedData(): Promise<FedData | null> {
  try {
    console.log('🔄 [HOTFIX DEBUG] Fetching latest Fed data...');
    
    const { data, error } = await Promise.race([
      supabase
        .from('fed_data')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      )
    ]) as any;

    if (error) {
      console.error('❌ [HOTFIX DEBUG] Error fetching latest Fed data:', error);
      return null;
    }

    // 🚨 HOTFIX DEBUG LOGGING - MASSIVE CONSOLE OUTPUT
    console.log('✅ [HOTFIX DEBUG] Latest Fed data fetched successfully');
    console.log('🔍 [EFFR DEBUG] Raw data from database:', {
      date: data?.date,
      sofr: data?.sofr,
      iorb: data?.iorb,
      effr: data?.effr,
      sofr_effr_spread: data?.sofr_effr_spread,
      effr_iorb_spread: data?.effr_iorb_spread,
      scenario: data?.scenario,
      liquidity_score: data?.liquidity_score,
      created_at: data?.created_at
    });
    
    // Check for EFFR data presence
    if (data?.effr !== null && data?.effr !== undefined) {
      console.log('✅ [EFFR SUCCESS] EFFR DATA PRESENT:', data.effr + '%');
      if (data?.sofr_effr_spread) {
        console.log('✅ [SPREAD SUCCESS] SOFR-EFFR SPREAD:', (data.sofr_effr_spread * 100).toFixed(2) + 'bps');
      }
    } else {
      console.error('🚨 [EFFR ERROR] EFFR DATA MISSING - This should not happen after hotfix!');
      console.error('🚨 [DEBUG] Full data object:', data);
    }
    
    return data;
  } catch (error) {
    console.error('❌ [HOTFIX DEBUG] Timeout or error fetching latest Fed data:', error);
    return null;
  }
}

export async function fetchHistoricalFedData(limit: number = 90): Promise<FedData[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('fed_data')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      )
    ]) as any;

    if (error) {
      console.error('Error fetching historical Fed data:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Timeout or error fetching historical Fed data:', error);
    return [];
  }
}

export async function fetchRecentSignals(limit: number = 10): Promise<Signal[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('signals')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000)
      )
    ]) as any;

    if (error) {
      console.error('Error fetching signals:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Timeout or error fetching signals:', error);
    return [];
  }
}

export async function triggerFedDataFetch(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Triggering Fed data fetch...');
    
    const { data, error } = await Promise.race([
      supabase.functions.invoke('fetch-fed-data'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Edge function timeout (60s)')), 60000)
      )
    ]) as any;
    
    if (error) {
      console.error('❌ Error triggering Fed data fetch:', error);
      
      // Gestione errori specifici
      if (error.message?.includes('FRED_API_KEY')) {
        return { success: false, error: 'FRED API Key non configurata in Supabase' };
      }
      if (error.message?.includes('rate limit')) {
        return { success: false, error: 'Rate limit FRED API raggiunto. Riprova tra 1 ora.' };
      }
      
      return { success: false, error: error.message || 'Errore sconosciuto' };
    }

    console.log('✅ Fed data fetch completed successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Timeout or error triggering Fed data fetch:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Timeout o errore di rete' 
    };
  }
}

// V2 Function per i calcoli avanzati
export async function triggerFedDataFetchV2(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Triggering Fed data fetch V2...');
    
    const { data, error } = await Promise.race([
      supabase.functions.invoke('fetch-fed-data-v2', {
        body: { forceRefresh: true }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Edge function V2 timeout (60s)')), 60000)
      )
    ]) as any;
    
    if (error) {
      console.error('❌ Error triggering Fed data fetch V2:', error);
      
      // Gestione errori specifici
      if (error.message?.includes('FRED_API_KEY')) {
        return { success: false, error: 'FRED API Key non configurata in Supabase' };
      }
      if (error.message?.includes('rate limit')) {
        return { success: false, error: 'Rate limit FRED API raggiunto. Riprova tra 1 ora.' };
      }
      
      return { success: false, error: error.message || 'Errore sconosciuto' };
    }

    console.log('✅ Fed data fetch V2 completed successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Timeout or error triggering Fed data fetch V2:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Timeout o errore di rete V2' 
    };
  }
}

export function subscribeToFedData(callback: (payload: any) => void) {
  return supabase
    .channel('fed-data-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'fed_data'
      },
      callback
    )
    .subscribe();
}

// === V2 HELPER FUNCTIONS ===

/**
 * Fetch latest data with V2 fields
 */
export async function fetchLatestFedDataV2(): Promise<FedData | null> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('fed_data')
        .select(`
          *,
          liquidity_score,
          liquidity_grade,
          liquidity_trend,
          liquidity_confidence,
          leading_indicators,
          tga,
          ig_spread
        `)
        .order('date', { ascending: false })
        .limit(1)
        .single(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      )
    ]) as any;

    if (error) {
      console.error('Error fetching latest Fed data V2:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Timeout or error fetching latest Fed data V2:', error);
    return null;
  }
}

/**
 * Get Liquidity Score statistics
 */
export async function fetchLiquidityStats(daysBack: number = 30): Promise<{
  avgScore: number;
  trend: string;
  gradeDistribution: Record<string, number>;
  recentScores: number[];
} | null> {
  try {
    const { data, error } = await supabase
      .from('fed_data')
      .select('liquidity_score, liquidity_grade, date')
      .not('liquidity_score', 'is', null)
      .gte('date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching liquidity stats:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const scores = data.map(d => d.liquidity_score).filter(s => s !== null) as number[];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate trend (recent 7 days vs previous 7 days)
    const recent7 = scores.slice(0, 7);
    const previous7 = scores.slice(7, 14);
    const recentAvg = recent7.length > 0 ? recent7.reduce((a, b) => a + b, 0) / recent7.length : avgScore;
    const previousAvg = previous7.length > 0 ? previous7.reduce((a, b) => a + b, 0) / previous7.length : avgScore;
    
    let trend = 'stable';
    if (recentAvg > previousAvg + 3) trend = 'improving';
    else if (recentAvg < previousAvg - 3) trend = 'deteriorating';

    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    data.forEach(d => {
      if (d.liquidity_grade) {
        gradeDistribution[d.liquidity_grade] = (gradeDistribution[d.liquidity_grade] || 0) + 1;
      }
    });

    return {
      avgScore: Number(avgScore.toFixed(1)),
      trend,
      gradeDistribution,
      recentScores: scores.slice(0, 30) // Last 30 scores
    };
  } catch (error) {
    console.error('Error calculating liquidity stats:', error);
    return null;
  }
}

/**
 * Get Leading Indicators summary
 */
export async function fetchLeadingIndicatorsSummary(): Promise<{
  overallSignal: 'bullish' | 'bearish' | 'neutral';
  signalStrength: number;
  keyAlerts: string[];
  confidence: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('fed_data')
      .select('leading_indicators, date')
      .not('leading_indicators', 'is', null)
      .order('date', { ascending: false })
      .limit(7); // Last 7 days

    if (error || !data || data.length === 0) {
      console.error('Error fetching leading indicators:', error);
      return null;
    }

    const latest = data[0].leading_indicators as LeadingIndicatorsData;
    const keyAlerts: string[] = [];

    // Generate alerts based on latest indicators
    if (latest.credit_stress_index > 70) {
      keyAlerts.push('🚨 Credit stress elevato');
    }
    if (latest.repo_spike_risk > 60) {
      keyAlerts.push('⚠️ Alto rischio tensioni repo');
    }
    if (latest.qt_pivot_probability > 60) {
      keyAlerts.push('🔄 Alta probabilità pivot Fed');
    }
    if (latest.rrp_velocity < -20) {
      keyAlerts.push('💧 RRP drenaggio accelerato');
    }

    // Calculate signal strength based on consistency over last 7 days
    const signals = data.map(d => d.leading_indicators?.overall_signal).filter(Boolean);
    const bullishCount = signals.filter(s => s === 'bullish').length;
    const bearishCount = signals.filter(s => s === 'bearish').length;
    const neutralCount = signals.filter(s => s === 'neutral').length;

    let signalStrength = 0;
    if (bullishCount > bearishCount && bullishCount > neutralCount) {
      signalStrength = (bullishCount / signals.length) * 100;
    } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
      signalStrength = (bearishCount / signals.length) * 100;
    } else {
      signalStrength = (neutralCount / signals.length) * 100;
    }

    return {
      overallSignal: latest.overall_signal,
      signalStrength: Number(signalStrength.toFixed(0)),
      keyAlerts,
      confidence: latest.confidence
    };
  } catch (error) {
    console.error('Error fetching leading indicators summary:', error);
    return null;
  }
}

/**
 * Helper to get score color based on value
 */
export function getLiquidityScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  
  if (score >= 80) return 'text-green-600';
  if (score >= 65) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  if (score >= 35) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Helper to get grade emoji
 */
export function getGradeEmoji(grade: string | null): string {
  if (!grade) return '❓';
  
  switch (grade) {
    case 'A+': return '🏆';
    case 'A': return '🥇';
    case 'B+': return '🥈';
    case 'B': return '🥉';
    case 'C+': return '📈';
    case 'C': return '📊';
    case 'D': return '⚠️';
    default: return '❓';
  }
}

/**
 * Helper to get trend arrow
 */
export function getTrendArrow(trend: string | null): string {
  if (!trend) return '➡️';
  
  switch (trend) {
    case 'improving': return '↗️';
    case 'deteriorating': return '↘️';
    case 'stable': return '➡️';
    default: return '➡️';
  }
}