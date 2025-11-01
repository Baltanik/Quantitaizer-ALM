import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { triggerFedDataFetch } from "@/services/fedData";
import { useState } from "react";

interface HeaderProps {
  lastUpdate?: string;
}

export function Header({ lastUpdate }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info("Fetching latest Fed data...");
    
    const result = await triggerFedDataFetch();
    
    if (result.success) {
      toast.success("Fed data updated successfully");
    } else {
      toast.error(`Failed to fetch data: ${result.error}`);
    }
    
    setIsRefreshing(false);
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              QUANTITAIZER
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monetary Liquidity Engine
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <div className="hidden md:block text-right">
                <p className="text-xs text-muted-foreground">Last Update</p>
                <p className="text-sm font-mono font-medium">
                  {new Date(lastUpdate).toLocaleString()}
                </p>
              </div>
            )}
            
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}