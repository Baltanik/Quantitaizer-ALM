import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ScenarioCard } from "@/components/ScenarioCard";
import { MetricsGrid } from "@/components/MetricsGrid";
import { ScenarioAnalysis } from "@/components/ScenarioAnalysis";
import { LiquidityMonitor } from "@/components/LiquidityMonitor";
import { FedPolicyTracker } from "@/components/FedPolicyTracker";
import { MarketImpact } from "@/components/MarketImpact";
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
        if (result.historical.length > 1) {
          setPreviousData(result.historical[1]);
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
              <ScenarioCard scenario={latestData?.scenario ?? null} />
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