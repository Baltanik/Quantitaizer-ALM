import { MetricCard } from "./MetricCard";
import { FedData } from "@/services/fedData";
import { Button } from "@/components/ui/button";
import { Expand, Minimize2 } from "lucide-react";
import { useState } from "react";

interface MetricsGridProps {
  currentData: FedData | null;
  previousData?: FedData | null;
  historicalData: FedData[];
}

export function MetricsGrid({ currentData, previousData, historicalData }: MetricsGridProps) {
  const [globalExpanded, setGlobalExpanded] = useState(false);

  if (!currentData) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Indicatori Chiave</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <Expand className="h-4 w-4 mr-1" />
              Espandi Tutto
            </Button>
          </div>
        </div>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-20 bg-card animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Create historical arrays for each metric (reverse to show oldest to newest)
  const createHistoricalArray = (key: keyof FedData) => {
    return [...historicalData].reverse().map(d => ({ value: d[key] as number | null }));
  };

  return (
    <div className="space-y-4">
      {/* Header con controlli globali */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Indicatori Chiave</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setGlobalExpanded(!globalExpanded)}
          >
            {globalExpanded ? (
              <>
                <Minimize2 className="h-4 w-4 mr-1" />
                Comprimi Tutto
              </>
            ) : (
              <>
                <Expand className="h-4 w-4 mr-1" />
                Espandi Tutto
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Griglia compatta ottimizzata - MOBILE FIRST: 1 card per riga su mobile, stile CoinMarketCap */}
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 auto-rows-min">
        <MetricCard
          title="SOFR"
          value={currentData.sofr}
          previousValue={previousData?.sofr}
          historicalData={createHistoricalArray('sofr')}
          format="bps"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="IORB"
          value={currentData.iorb}
          previousValue={previousData?.iorb}
          historicalData={createHistoricalArray('iorb')}
          format="bps"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="Spread SOFR-IORB"
          value={currentData.sofr_iorb_spread}
          previousValue={previousData?.sofr_iorb_spread}
          historicalData={createHistoricalArray('sofr_iorb_spread')}
          format="bps"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="EFFR"
          value={currentData.effr}
          previousValue={previousData?.effr}
          historicalData={createHistoricalArray('effr')}
          format="bps"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="SOFR-EFFR Spread"
          value={currentData.sofr_effr_spread}
          previousValue={previousData?.sofr_effr_spread}
          historicalData={createHistoricalArray('sofr_effr_spread')}
          format="bps"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="Bilancio Fed"
          value={currentData.walcl}
          previousValue={previousData?.walcl}
          historicalData={createHistoricalArray('walcl')}
          format="billion"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="Riserve Bancarie"
          value={currentData.wresbal}
          previousValue={previousData?.wresbal}
          historicalData={createHistoricalArray('wresbal')}
          format="billion"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="Reverse Repo"
          value={currentData.rrpontsyd}
          previousValue={previousData?.rrpontsyd}
          historicalData={createHistoricalArray('rrpontsyd')}
          format="billion"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="Repo ON"
          value={currentData.rpontsyd}
          previousValue={previousData?.rpontsyd}
          historicalData={createHistoricalArray('rpontsyd')}
          format="billion"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="Repo Term"
          value={currentData.rponttld}
          previousValue={previousData?.rponttld}
          historicalData={createHistoricalArray('rponttld')}
          format="billion"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="Treasury 3M"
          value={currentData.dtb3}
          previousValue={previousData?.dtb3}
          historicalData={createHistoricalArray('dtb3')}
          unit="%"
          defaultExpanded={globalExpanded}
        />
        <MetricCard
          title="Treasury 1Y"
          value={currentData.dtb1yr}
          previousValue={previousData?.dtb1yr}
          historicalData={createHistoricalArray('dtb1yr')}
          unit="%"
          defaultExpanded={globalExpanded}
        />
        {/* Nuovi indicatori - temporaneamente commentati finché non abbiamo i dati */}
        {currentData.vix !== undefined && (
          <MetricCard
            title="VIX"
            value={currentData.vix}
            previousValue={previousData?.vix}
            historicalData={createHistoricalArray('vix')}
            unit=""
            defaultExpanded={globalExpanded}
          />
        )}
        {currentData.hy_oas !== undefined && (
          <MetricCard
            title="HY OAS"
            value={currentData.hy_oas}
            previousValue={previousData?.hy_oas}
            historicalData={createHistoricalArray('hy_oas')}
            format="bps"
            defaultExpanded={globalExpanded}
          />
        )}
        {currentData.t10y3m !== undefined && (
          <MetricCard
            title="Curva 10Y-3M"
            value={currentData.t10y3m}
            previousValue={previousData?.t10y3m}
            historicalData={createHistoricalArray('t10y3m')}
            format="bps"
            defaultExpanded={globalExpanded}
          />
        )}
        {currentData.dxy_broad !== undefined && (
          <MetricCard
            title="DXY Proxy (FRED)"
            value={currentData.dxy_broad}
            previousValue={previousData?.dxy_broad}
            historicalData={createHistoricalArray('dxy_broad')}
            unit=""
            defaultExpanded={globalExpanded}
          />
        )}
      </div>
    </div>
  );
}