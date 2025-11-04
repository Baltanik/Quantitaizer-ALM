import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

interface HeaderProps {
  lastUpdate?: string;
  onRefresh?: () => void;
}

export function Header({ lastUpdate, onRefresh }: HeaderProps) {
  const isMobile = useIsMobile();
  const scrollDirection = useScrollDirection();
  
  // Su mobile: nasconde l'header quando si scrolla verso il basso
  const isHidden = isMobile && scrollDirection === 'down';
  
  return (
    <header 
      className={`
        relative border-b border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 
        sticky top-0 z-50 overflow-hidden transition-transform duration-300 ease-in-out
        ${isHidden ? '-translate-y-full' : 'translate-y-0'}
      `}
    >
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
      
      <div className="container mx-auto px-4 py-8 relative z-20">
        <div className="flex items-center justify-center">
          <div className="text-center relative z-30">
            {/* Main Title - Clean and Professional */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-2 tracking-tight drop-shadow-lg">
              QUANTITAIZER
            </h1>
            
            {/* ALM Subtitle */}
            <h2 className="text-xl md:text-3xl font-bold text-emerald-400 tracking-[0.2em] mb-4 drop-shadow-lg">
              ALM
            </h2>
            
            {/* Description */}
            <p className="text-lg md:text-xl text-slate-300 font-light tracking-wide drop-shadow-md">
              Analisi Liquidità Monetaria
            </p>
            
            {/* Subtle Underline */}
            <div className="mt-6 w-24 h-0.5 bg-emerald-400/50 mx-auto"></div>
          </div>
        </div>
        
        {/* Last Update - Clean and Simple */}
        {lastUpdate && (
          <div className="absolute bottom-4 left-4 text-left">
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
      </div>
    </header>
  );
}