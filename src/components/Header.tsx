import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { triggerFedDataFetch } from "@/services/fedData";
import { useState } from "react";

interface HeaderProps {
  lastUpdate?: string;
  onRefresh?: () => void;
}

export function Header({ lastUpdate, onRefresh }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    toast.info("🔄 Recupero ultimi dati Fed...", { duration: 2000 });
    
    try {
      const result = await triggerFedDataFetch();
      
      if (result.success) {
        toast.success("✅ Dati Fed aggiornati con successo");
        // Trigger refresh nel componente padre
        if (onRefresh) {
          setTimeout(() => onRefresh(), 2000);
        }
      } else {
        toast.error(`❌ ${result.error}`, { duration: 5000 });
      }
    } catch (error) {
      toast.error("❌ Errore di rete durante l'aggiornamento");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="relative border-b border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 sticky top-0 z-50 overflow-hidden">
      {/* Floating Financial Orbs - Neural Network Style */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Central Hub */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-400/40 rounded-full animate-pulse"></div>
        
        {/* Orbiting Elements */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-32 h-32 animate-spin" style={{animationDuration: '20s'}}>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-green-400/60 rounded-full"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500/50 rounded-full"></div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-green-300/40 rounded-full"></div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-emerald-600/50 rounded-full"></div>
          </div>
        </div>
        
        {/* Outer Ring */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-48 h-48 animate-spin" style={{animationDuration: '30s', animationDirection: 'reverse'}}>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-slate-400/30 rounded-full"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-slate-500/30 rounded-full"></div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-slate-400/30 rounded-full"></div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-slate-500/30 rounded-full"></div>
          </div>
        </div>
        
        {/* Connection Lines */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-32 bg-gradient-to-b from-transparent via-emerald-400/20 to-transparent animate-pulse delay-500"></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-center">
          <div className="text-center">
            {/* Main Title - Clean and Professional */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-2 tracking-tight">
              QUANTITAIZER
            </h1>
            
            {/* ALM Subtitle */}
            <h2 className="text-xl md:text-3xl font-bold text-emerald-400 tracking-[0.2em] mb-4">
              ALM
            </h2>
            
            {/* Description */}
            <p className="text-lg md:text-xl text-slate-400 font-light tracking-wide">
              Analisi Liquidità Monetaria
            </p>
            
            {/* Subtle Underline */}
            <div className="mt-6 w-24 h-0.5 bg-emerald-400/50 mx-auto"></div>
          </div>
        </div>
        
        {/* Last Update & Contact - Bottom Right */}
        <div className="absolute bottom-4 right-4 text-right space-y-2">
          {lastUpdate && (
            <div>
              <p className="text-xs text-slate-500">Ultimo Aggiornamento</p>
              <p className="text-xs font-mono text-slate-400">
                {new Date(lastUpdate).toLocaleString('it-IT', {
                  day: '2-digit',
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
          
          {/* Contact CTA */}
          <a 
            href="https://t.me/baltanikz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-full transition-colors font-medium"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.03c.19-.17-.04-.27-.3-.1L9.28 13.47l-2.38-.75c-.52-.16-.53-.52.11-.77l9.28-3.58c.43-.16.81.1.67.73z"/>
            </svg>
            Supporto
          </a>
        </div>
      </div>
    </header>
  );
}