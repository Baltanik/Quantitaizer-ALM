import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ScenarioCard } from "@/components/ScenarioCard";
import { MetricsGrid } from "@/components/MetricsGrid";
import { ScenarioAnalysis } from "@/components/ScenarioAnalysis";
import { LiquidityMonitor } from "@/components/LiquidityMonitor";
import { FedPolicyTracker } from "@/components/FedPolicyTracker";
import { MarketImpact } from "@/components/MarketImpact";
import { LiquidityScoreMeter } from "@/components/LiquidityScoreMeter";
import { LeadingIndicatorsPanel } from "@/components/LeadingIndicatorsPanel";
import { MLForecastPanel } from "@/components/MLForecastPanel";
import { 
  fetchLatestFedData, 
  fetchLatestFedDataV2,
  fetchHistoricalFedData, 
  fetchRecentSignals,
  subscribeToFedData,
  triggerFedDataFetch,
  triggerFedDataFetchV2,
  FedData,
  Signal
} from "@/services/fedData";
import { 
  Signal as SignalIcon, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Target, 
  Shield, 
  Zap, 
  Activity, 
  BarChart3, 
  Building2, 
  ArrowUp, 
  ArrowDown 
} from "lucide-react";

const Index = () => {
  const [latestData, setLatestData] = useState<FedData | null>(null);
  const [previousData, setPreviousData] = useState<FedData | null>(null);
  const [historicalData, setHistoricalData] = useState<FedData[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [v2Available, setV2Available] = useState<boolean | null>(null);

  // V2 is always available since we use a separate Edge Function
  const checkV2Status = async () => {
    setV2Available(true);
    console.log('🔍 V2 availability: always true (separate Edge Function)');
  };

  const loadData = async (forceRefresh: boolean = false) => {
    if (isLoadingData) {
      console.log('⏳ Data loading already in progress, skipping...');
      return; 
    }
    
    console.log('📊 Starting data load...', { forceRefresh });
    setIsLoadingData(true);
    setLoading(true);
    setError(null);
    
    try {
      // Timeout per l'intero processo
      const loadPromise = (async () => {
        // Always use V2 since columns exist
        const latest = await fetchLatestFedDataV2();
        
        const [historical, recentSignals] = await Promise.all([
          fetchHistoricalFedData(90),
          fetchRecentSignals(10)
        ]);

        // Se non ci sono dati E non stiamo già facendo refresh, trigghera il fetch UNA SOLA VOLTA
        // OPPURE se forceRefresh è true (per calcolare V2 data)
        if ((!latest || historical.length === 0) && !forceRefresh || forceRefresh) {
          console.log('📥 Triggering Fed data fetch...', { forceRefresh, hasData: !!latest });
          
          const result = await triggerFedDataFetch();
          
          if (!result.success) {
            throw new Error(result.error || 'Errore nel recupero dati dalla Fed');
          }
          
          // Attendi completamento e ricarica - più tempo per V2 calculations
          console.log('⏱️ Waiting for data processing...');
          await new Promise(resolve => setTimeout(resolve, forceRefresh ? 8000 : 3000));
          
          // Prova a caricare V2 data se disponibile
          let newLatest;
          try {
            newLatest = await fetchLatestFedDataV2();
            console.log('✅ V2 data loaded after fetch');
          } catch (error) {
            console.warn('⚠️ V2 data not ready yet, using V1:', error);
            newLatest = await fetchLatestFedData();
          }
          
          const [newHistorical, newSignals] = await Promise.all([
            fetchHistoricalFedData(90),
            fetchRecentSignals(10)
          ]);
          
          return { latest: newLatest, historical: newHistorical, signals: newSignals };
        }
        
        return { latest, historical, signals: recentSignals };
      })();

      // Timeout globale di 90 secondi
      const result = await Promise.race([
        loadPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout caricamento dati (90s)')), 90000)
        )
      ]) as any;

      // Aggiorna stato solo se abbiamo dati validi
      if (result.latest) {
        setLatestData(result.latest);
        console.log('✅ Latest data loaded');
        
        // DEBUG COMPLETO
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 LATEST DATA FROM DATABASE (FRONTEND)');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📅 Date:', result.latest.date);
        console.log('\n💰 RAW VALUES:');
        console.log('   WALCL:', result.latest.walcl, typeof result.latest.walcl);
        console.log('   WRESBAL:', result.latest.wresbal, typeof result.latest.wresbal);
        console.log('   SOFR:', result.latest.sofr, typeof result.latest.sofr);
        console.log('   IORB:', result.latest.iorb, typeof result.latest.iorb);
        console.log('   SPREAD:', result.latest.sofr_iorb_spread, typeof result.latest.sofr_iorb_spread);
        
        console.log('\n📈 HUMAN READABLE:');
        console.log('   Balance Sheet:', result.latest.walcl ? `$${(result.latest.walcl/1000000).toFixed(2)}T` : 'NULL');
        console.log('   Reserves:', result.latest.wresbal ? `$${(result.latest.wresbal/1000).toFixed(2)}T` : 'NULL');
        console.log('   Spread:', result.latest.sofr_iorb_spread ? `${(result.latest.sofr_iorb_spread * 100).toFixed(2)}bps` : 'NULL');
        
        console.log('\n🎯 SCENARIO:', result.latest.scenario?.toUpperCase() || 'NULL');
        
        console.log('\n✅ SHOULD BE STEALTH_QE IF:');
        console.log('   WALCL > 6,500,000:', result.latest.walcl ? (result.latest.walcl > 6500000 ? '✓ YES' : '✗ NO') : '✗ NULL');
        console.log('   WRESBAL > 2,500:', result.latest.wresbal ? (result.latest.wresbal > 2500 ? '✓ YES' : '✗ NO') : '✗ NULL');
        console.log('   SPREAD < 0.20:', result.latest.sofr_iorb_spread !== null ? (result.latest.sofr_iorb_spread < 0.20 ? '✓ YES' : '✗ NO') : '✗ NULL');
        console.log('═══════════════════════════════════════════════════════════\n');
      }
      
      if (result.historical && result.historical.length > 0) {
        setHistoricalData(result.historical);
        
        // DEBUG: Mostra la struttura dei dati storici
        console.log('📊 HISTORICAL DATA STRUCTURE:');
        console.log('   Total records:', result.historical.length);
        console.log('   First 3 dates:', result.historical.slice(0, 3).map(d => d.date));
        console.log('   Latest historical SOFR:', result.historical[0]?.sofr);
        console.log('   Current data SOFR:', result.latest?.sofr);
        console.log('   Are they the same?', result.historical[0]?.sofr === result.latest?.sofr);
        
        if (result.historical.length > 1) {
          // Se il valore del giorno precedente è uguale a quello corrente, cerca un valore diverso
          let previousIndex = 1;
          while (previousIndex < result.historical.length && 
                 result.historical[previousIndex]?.sofr === result.latest?.sofr) {
            previousIndex++;
          }
          
          if (previousIndex < result.historical.length) {
            setPreviousData(result.historical[previousIndex]);
            console.log('   Previous data (index', previousIndex + ') SOFR:', result.historical[previousIndex]?.sofr);
            console.log('   Previous data date:', result.historical[previousIndex]?.date);
          } else {
            // Se tutti i valori sono uguali, usa comunque l'index 1
            setPreviousData(result.historical[1]);
            console.log('   All values are the same, using index 1');
            console.log('   Previous data (index 1) SOFR:', result.historical[1]?.sofr);
            console.log('   Previous data date:', result.historical[1]?.date);
          }
        }
        
        console.log(`✅ Historical data loaded: ${result.historical.length} records`);
      }
      
      if (result.signals) {
        setSignals(result.signals);
        console.log(`✅ Signals loaded: ${result.signals.length} signals`);
      }

      // Se ancora non abbiamo dati dopo il fetch, mostra errore specifico
      if (!result.latest && (!result.historical || result.historical.length === 0)) {
        throw new Error('Nessun dato disponibile. Verifica la configurazione FRED API.');
      }

    } catch (err) {
      console.error('❌ Error loading data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento dati';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsLoadingData(false);
      console.log('📊 Data load completed');
    }
  };

  const calculateV2Data = async () => {
    if (isLoadingData) {
      console.log('⏳ Data loading already in progress, skipping...');
      return; 
    }
    
    console.log('🔄 Starting V2 data calculation...');
    setIsLoadingData(true);
    
    try {
      const result = await triggerFedDataFetchV2();
      
      if (result.success) {
        console.log('✅ V2 data calculation successful');
        // Wait a bit for the data to be saved, then reload
        setTimeout(async () => {
          try {
            const latest = await fetchLatestFedDataV2();
            setLatestData(latest);
            console.log('✅ V2 data reloaded successfully');
          } catch (error) {
            console.error('❌ Error reloading V2 data:', error);
          }
        }, 3000);
      } else {
        console.error('❌ V2 data calculation failed:', result.error);
        setError(result.error || 'V2 calculation failed');
      }
    } catch (error) {
      console.error('❌ Error calculating V2 data:', error);
      setError(error instanceof Error ? error.message : 'V2 calculation error');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    // Check V2 availability first, then load data
    checkV2Status().then(() => {
      loadData();
    });
    // Real-time subscription rimossa - i dati vengono aggiornati solo una volta al giorno
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 relative">
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      <div className="relative z-10">
        <Header 
          lastUpdate={latestData?.updated_at} 
          onRefresh={() => loadData(true)}
        />
        
        {/* 🚨 HOTFIX DEBUG PANEL */}
        <div className="container mx-auto px-4 py-2">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>🚨 DEBUG MODE ACTIVE</strong> - Check browser console for detailed logs
            <button 
              onClick={() => {
                console.log('🔄 [MANUAL REFRESH] Force refreshing data...');
                loadData(true);
              }}
              className="ml-4 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Force Refresh Data
            </button>
            <div className="mt-2 text-sm">
              Latest Data: {latestData?.date} | EFFR: {latestData?.effr || 'NULL'} | Scenario: {latestData?.scenario}
            </div>
          </div>
        </div>
        
        <main className="container mx-auto px-4 py-8 space-y-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <p className="text-destructive text-lg">{error}</p>
            <button 
              onClick={() => loadData(true)} 
              disabled={isLoadingData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoadingData ? 'Caricamento...' : 'Riprova'}
            </button>
          </div>
        ) : (
          <>
            {/* V2 Migration Banner */}
            {v2Available === false && (
              <section className="mb-6">
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🚀</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        Upgrade to Quantitaizer V2 Available!
                      </h3>
                      <p className="text-slate-300 mb-4">
                        Unlock advanced features: Liquidity Score (0-100), Leading Indicators, Early Warning System, and Predictive Analytics.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={calculateV2Data}
                          disabled={isLoadingData}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                          {isLoadingData ? 'Calculating...' : 'Calculate V2 Data'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* V2 Success Banner */}
            {v2Available === true && (
              <section className="mb-6">
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <h3 className="text-lg font-bold text-green-300">
                          Quantitaizer V2 Active!
                        </h3>
                        <p className="text-green-200 text-sm">
                          {latestData?.liquidity_score 
                            ? 'Advanced analytics and predictive features are now enabled.'
                            : 'V2 database ready. Click "Calculate V2 Data" to populate indicators.'
                          }
                        </p>
                      </div>
                    </div>
                    {!latestData?.liquidity_score && (
                      <button
                        onClick={calculateV2Data}
                        disabled={isLoadingData}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                      >
                        {isLoadingData ? 'Calculating...' : 'Calculate V2 Data'}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Scenario Attuale */}
            <section className="space-y-6">
              <ScenarioCard 
                scenario={latestData?.scenario ?? null} 
                currentData={latestData}
              />
            </section>

            {/* Metriche Rapide */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">Indicatori Chiave</h2>
              <MetricsGrid 
                currentData={latestData} 
                previousData={previousData}
                historicalData={historicalData}
              />
            </section>
            
                    {/* V2 Advanced Analytics */}
                    {latestData?.liquidity_score && (
                      <section className="space-y-4">
                        <h2 className="text-2xl font-bold border-l-4 border-emerald-500 pl-4">🚀 Quantitaizer V2 Analytics</h2>
                        <div className="grid gap-6 lg:grid-cols-2">
                          <LiquidityScoreMeter
                            score={latestData.liquidity_score}
                            grade={latestData.liquidity_grade || 'C'}
                            trend={latestData.liquidity_trend || 'neutral'}
                            confidence={latestData.liquidity_confidence || 50}
                            components={{
                              balanceSheet: 50,
                              reserves: 50,
                              stress: 50,
                              momentum: 50
                            }}
                          />
                          {latestData.leading_indicators && (
                            <LeadingIndicatorsPanel data={{
                              tga_trend: typeof latestData.leading_indicators.tga_trend === 'string' ? 
                                parseFloat(latestData.leading_indicators.tga_trend) : 
                                (latestData.leading_indicators.tga_trend || 0),
                              rrp_velocity: typeof latestData.leading_indicators.rrp_velocity === 'string' ? 
                                parseFloat(latestData.leading_indicators.rrp_velocity) : 
                                (latestData.leading_indicators.rrp_velocity || 0),
                              credit_stress_index: latestData.leading_indicators.credit_stress_index || 30,
                              repo_spike_risk: latestData.leading_indicators.repo_spike_risk || 0,
                              qt_pivot_probability: latestData.leading_indicators.qt_pivot_probability || 40,
                              overall_signal: latestData.leading_indicators.overall_signal || 'neutral'
                            }} />
                          )}
                        </div>
                        
                        {/* ML Forecast Panel - Phase 2 */}
                        <div className="mt-6">
                          <MLForecastPanel />
                        </div>
                      </section>
                    )}

                    {/* Analisi Real-Time */}
                    <section className="space-y-4">
                      <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">Analisi Real-Time</h2>
                      <div className="grid gap-6 md:grid-cols-2">
                        <ScenarioAnalysis currentData={latestData} />
                        <LiquidityMonitor currentData={latestData} />
                      </div>
                    </section>

            
            {/* Market Intelligence */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">Market Intelligence</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <FedPolicyTracker currentData={latestData} />
                <MarketImpact currentData={latestData} />
              </div>
            </section>

            {/* Download Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">Download Report</h2>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 hover:border-emerald-500/30 transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-semibold text-white">Report Analisi Liquidità - 02/11/25</h3>
                    <p className="text-sm text-muted-foreground">
                      Analisi completa della situazione di liquidità monetaria e scenari Fed. 
                      Include metodologia delta-based e implicazioni per i mercati.
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>📄 PDF • 6 pagine</span>
                      <span>📅 2 Novembre 2025</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                    <a
                      href="/Report_021125.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-500/90 text-white rounded-md transition-all duration-300 text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Leggi Online
                    </a>
                    <a
                      href="/Report_021125.pdf"
                      download="Report_Liquidita_021125.pdf"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-500/90 text-white rounded-md transition-all duration-300 text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
        </main>
      </div>
      
      {/* Fixed Support Button - Enhanced */}
      <a 
        href="https://t.me/baltanikz" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 text-sm bg-emerald-600/80 hover:bg-emerald-500/90 text-white px-4 py-3 rounded-full transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-emerald-500/25 font-medium animate-pulse hover:animate-none hover:scale-105"
        style={{animationDuration: '3s'}}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.03c.19-.17-.04-.27-.3-.1L9.28 13.47l-2.38-.75c-.52-.16-.53-.52.11-.77l9.28-3.58c.43-.16.81.1.67.73z"/>
        </svg>
        <span className="hidden sm:inline">Supporto</span>
      </a>
    </div>
  );
};

export default Index;