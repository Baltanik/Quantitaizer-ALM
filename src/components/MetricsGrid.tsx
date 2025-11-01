import { MetricCard } from "./MetricCard";
import { FedData } from "@/services/fedData";

interface MetricsGridProps {
  currentData: FedData | null;
  previousData?: FedData | null;
  historicalData: FedData[];
}

export function MetricsGrid({ currentData, previousData, historicalData }: MetricsGridProps) {
  if (!currentData) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-40 bg-card animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  // Create historical arrays for each metric (reverse to show oldest to newest)
  const createHistoricalArray = (key: keyof FedData) => {
    return [...historicalData].reverse().map(d => ({ value: d[key] as number | null }));
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <MetricCard
        title="SOFR"
        value={currentData.sofr}
        previousValue={previousData?.sofr}
        historicalData={createHistoricalArray('sofr')}
        format="bps"
      />
      <MetricCard
        title="IORB"
        value={currentData.iorb}
        previousValue={previousData?.iorb}
        historicalData={createHistoricalArray('iorb')}
        format="bps"
      />
      <MetricCard
        title="SOFR-IORB Spread"
        value={currentData.sofr_iorb_spread}
        previousValue={previousData?.sofr_iorb_spread}
        historicalData={createHistoricalArray('sofr_iorb_spread')}
        format="bps"
      />
      <MetricCard
        title="Fed Balance Sheet"
        value={currentData.walcl}
        previousValue={previousData?.walcl}
        historicalData={createHistoricalArray('walcl')}
        format="billion"
      />
      <MetricCard
        title="Reserve Balances"
        value={currentData.wresbal}
        previousValue={previousData?.wresbal}
        historicalData={createHistoricalArray('wresbal')}
        format="billion"
      />
      <MetricCard
        title="Reverse Repo"
        value={currentData.rrpontsyd}
        previousValue={previousData?.rrpontsyd}
        historicalData={createHistoricalArray('rrpontsyd')}
        format="billion"
      />
      <MetricCard
        title="Repo ON"
        value={currentData.rpontsyd}
        previousValue={previousData?.rpontsyd}
        historicalData={createHistoricalArray('rpontsyd')}
        format="billion"
      />
      <MetricCard
        title="Repo Term"
        value={currentData.rponttld}
        previousValue={previousData?.rponttld}
        historicalData={createHistoricalArray('rponttld')}
        format="billion"
      />
      <MetricCard
        title="3M Treasury"
        value={currentData.dtb3}
        previousValue={previousData?.dtb3}
        historicalData={createHistoricalArray('dtb3')}
        unit="%"
      />
      <MetricCard
        title="1Y Treasury"
        value={currentData.dtb1yr}
        previousValue={previousData?.dtb1yr}
        historicalData={createHistoricalArray('dtb1yr')}
        unit="%"
      />
    </div>
  );
}