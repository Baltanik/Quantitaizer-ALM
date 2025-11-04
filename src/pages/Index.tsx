import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ScenarioCard } from "@/components/ScenarioCard";
import { MetricsGrid } from "@/components/MetricsGrid";
import { ScenarioAnalysis } from "@/components/ScenarioAnalysis";
import { LiquidityMonitor } from "@/components/LiquidityMonitor";
import { FedPolicyTracker } from "@/components/FedPolicyTracker";
import { MarketImpact } from "@/components/MarketImpact";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { 
  fetchLatestFedData, 
  fetchHistoricalFedData, 
  fetchRecentSignals,
  subscribeToFedData,
  triggerFedDataFetch,
  FedData,
  Signal
} from "@/services/fedData";

const Index = () => {
  const [latestData, setLatestData] = useState<FedData | null>(null);
  const [previousData, setPreviousData] = useState<FedData | null>(null);
  const [historicalData, setHistoricalData] = useState<FedData[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

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
        const [latest, historical, recentSignals] = await Promise.all([
          fetchLatestFedData(),
          fetchHistoricalFedData(90),
          fetchRecentSignals(10)
        ]);

        // Se non ci sono dati E non stiamo già facendo refresh, trigghera il fetch UNA SOLA VOLTA
        if ((!latest || historical.length === 0) && !forceRefresh) {
          console.log('📥 No data found, triggering ONE-TIME automatic fetch...');
          
          const result = await triggerFedDataFetch();
          
          if (!result.success) {
            throw new Error(result.error || 'Errore nel recupero dati dalla Fed');
          }
          
          // Attendi completamento e ricarica UNA SOLA VOLTA
          console.log('⏱️ Waiting for data processing...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const [newLatest, newHistorical, newSignals] = await Promise.all([
            fetchLatestFedData(),
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

  useEffect(() => {
    loadData();
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
            {/* Scenario Attuale */}
            <section className="space-y-6">
              <ScenarioCard 
                scenario={latestData?.scenario ?? null} 
                currentData={latestData}
              />
            </section>

            {/* RRP Alert - Spike Detection */}
            {latestData && latestData.d_rrpontsyd_4w !== null && 
             Math.abs(latestData.d_rrpontsyd_4w) > 20 && (
              <Alert 
                variant={latestData.d_rrpontsyd_4w > 0 ? "default" : "destructive"}
                className="bg-slate-900/80 border-slate-700 hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  {latestData.d_rrpontsyd_4w > 0 ? (
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400" />
                  )}
                  <AlertCircle className="h-4 w-4" />
                </div>
                <AlertTitle className="text-white font-semibold">
                  🚨 RRP Spike Rilevato - Movimento Significativo
                </AlertTitle>
                <AlertDescription className="text-slate-200">
                  <div className="space-y-2">
                    <p>
                      <strong>Reverse Repo {latestData.d_rrpontsyd_4w > 0 ? "aumentato" : "diminuito"}</strong> di{" "}
                      <span className={`font-mono font-bold ${latestData.d_rrpontsyd_4w > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        ${Math.abs(latestData.d_rrpontsyd_4w).toFixed(1)}B
                      </span>{" "}
                      nelle ultime 4 settimane.
                    </p>
                    <p className="text-sm text-slate-300">
                      {latestData.d_rrpontsyd_4w > 20 && 
                        "⚠️ Liquidità in eccesso torna alla Fed. Possibile stress bancario o mancanza investimenti alternativi."
                      }
                      {latestData.d_rrpontsyd_4w < -20 && 
                        "📈 Drenaggio liquidità in corso. Fed sta riducendo RRP - liquidità fluisce verso mercati."
                      }
                    </p>
                    <div className="text-xs text-slate-400 mt-2">
                      <strong>Soglia Alert:</strong> Movimenti &gt;$20B in 4 settimane indicano cambiamenti significativi nella liquidità Fed.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Metriche Rapide */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">Indicatori Chiave</h2>
              <MetricsGrid 
                currentData={latestData} 
                previousData={previousData}
                historicalData={historicalData}
              />
            </section>
            
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