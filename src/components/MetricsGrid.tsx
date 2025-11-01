import { MetricCard } from "./MetricCard";
import { FedData } from "@/services/fedData";

interface MetricsGridProps {
  currentData: FedData | null;
  previousData?: FedData | null;
}

export function MetricsGrid({ currentData, previousData }: MetricsGridProps) {
  if (!currentData) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-32 bg-card animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <MetricCard
        title="SOFR"
        value={currentData.sofr}
        previousValue={previousData?.sofr}
        format="bps"
      />
      <MetricCard
        title="IORB"
        value={currentData.iorb}
        previousValue={previousData?.iorb}
        format="bps"
      />
      <MetricCard
        title="SOFR-IORB Spread"
        value={currentData.sofr_iorb_spread}
        previousValue={previousData?.sofr_iorb_spread}
        format="bps"
      />
      <MetricCard
        title="Fed Balance Sheet"
        value={currentData.walcl}
        previousValue={previousData?.walcl}
        format="billion"
      />
      <MetricCard
        title="Reserve Balances"
        value={currentData.wresbal}
        previousValue={previousData?.wresbal}
        format="billion"
      />
      <MetricCard
        title="Reverse Repo"
        value={currentData.rrpontsyd}
        previousValue={previousData?.rrpontsyd}
        format="billion"
      />
      <MetricCard
        title="Repo ON"
        value={currentData.rpontsyd}
        previousValue={previousData?.rpontsyd}
        format="billion"
      />
      <MetricCard
        title="Repo Term"
        value={currentData.rponttld}
        previousValue={previousData?.rponttld}
        format="billion"
      />
      <MetricCard
        title="3M Treasury"
        value={currentData.dtb3}
        previousValue={previousData?.dtb3}
        unit="%"
      />
      <MetricCard
        title="1Y Treasury"
        value={currentData.dtb1yr}
        previousValue={previousData?.dtb1yr}
        unit="%"
      />
    </div>
  );
}