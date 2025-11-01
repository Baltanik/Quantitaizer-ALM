import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ScenarioCard } from "@/components/ScenarioCard";
import { MetricsGrid } from "@/components/MetricsGrid";
import { Charts } from "@/components/Charts";
import { CombinedChart } from "@/components/CombinedChart";
import { AlertPanel } from "@/components/AlertPanel";
import { DataTable } from "@/components/DataTable";
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

  const loadData = async () => {
    setLoading(true);
    
    const [latest, historical, recentSignals] = await Promise.all([
      fetchLatestFedData(),
      fetchHistoricalFedData(90),
      fetchRecentSignals(10)
    ]);

    // Se non ci sono dati, trigghera il fetch automaticamente
    if (!latest || historical.length === 0) {
      console.log('No data found, triggering automatic fetch...');
      await triggerFedDataFetch();
      // Ricarica dopo il fetch
      const [newLatest, newHistorical, newSignals] = await Promise.all([
        fetchLatestFedData(),
        fetchHistoricalFedData(90),
        fetchRecentSignals(10)
      ]);
      if (newLatest) setLatestData(newLatest);
      if (newHistorical.length > 0) {
        setHistoricalData(newHistorical);
        if (newHistorical.length > 1) setPreviousData(newHistorical[1]);
      }
      if (newSignals) setSignals(newSignals);
    } else {
      if (latest) setLatestData(latest);
      if (historical.length > 0) {
        setHistoricalData(historical);
        if (historical.length > 1) setPreviousData(historical[1]);
      }
      if (recentSignals) setSignals(recentSignals);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const channel = subscribeToFedData((payload) => {
      console.log('Real-time update:', payload);
      loadData();
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header lastUpdate={latestData?.updated_at} />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <ScenarioCard scenario={latestData?.scenario ?? null} />
            
            <MetricsGrid 
              currentData={latestData} 
              previousData={previousData}
              historicalData={historicalData}
            />

            <CombinedChart data={historicalData} />
            
            <Charts data={historicalData} />
            
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <DataTable data={historicalData} />
              </div>
              <div>
                <AlertPanel signals={signals} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;