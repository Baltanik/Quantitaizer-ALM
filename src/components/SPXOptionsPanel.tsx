/**
 * SPX OPTIONS PANEL - VERSIONE EDUCATIVA
 * 
 * Struttura:
 * 1. HEADER: Prezzo SPX
 * 2. LIVELLI CHIAVE: Walls, Max Pain, Breakeven (tabs 0DTE/Mensile)
 * 3. STRADDLE & RANGE: Implied move dal mercato
 * 4. DATI AVANZATI: VIX, VVIX, P/C Ratio, GEX, Volume/OI
 * 
 * Ogni voce ha spiegazione espandibile.
 * ZERO consigli finanziari. Solo dati educativi.
 */

import { useState, useEffect } from 'react';
import { 
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Activity,
  Calendar,
  Clock,
  Magnet,
  ArrowUpCircle,
  MapPin,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { analyzeSPXOptions, SPXAnalysis } from '@/services/polygonService';

// ============================================================
// TYPES
// ============================================================

interface SPXOptionsPanelProps {
  fedScenario?: string;
}

interface PriceLevel {
  id: string;
  price: number;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  type: 'resistance' | 'support' | 'pivot' | 'current' | 'breakeven';
  color: string;
  bgColor: string;
  explanation: string;
  detailedExplanation: string;
  extraInfo?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function SPXOptionsPanel({ fedScenario }: SPXOptionsPanelProps) {
  const [analysis, setAnalysis] = useState<SPXAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // ============================================================
  // DATA FETCHING
  // ============================================================

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await analyzeSPXOptions();
      if (data) {
        setAnalysis(data);
        setLastUpdate(new Date());
      } else {
        setError('Impossibile caricare dati options');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
    const interval = setInterval(loadAnalysis, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Real-time price refresh
  useEffect(() => {
    const priceInterval = setInterval(async () => {
      try {
        const response = await fetch('https://tolaojeqjcoskegelule.supabase.co/functions/v1/spx-price', {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTI1MzksImV4cCI6MjA3NzU4ODUzOX0.8iJ8SHDG5Ffdu5X8ZF6-QSiyIz9iTXKm8uaLXQt_2OI'
          }
        });
        const data = await response.json();
        if (data.price && analysis) {
          setAnalysis(prev => prev ? {
            ...prev,
            realtime_price: data.price,
            realtime_change_pct: data.change_pct || 0,
            spx_price: data.price,
            vix: data.vix || prev.vix,
            vvix: data.vvix || prev.vvix
          } : null);
        }
      } catch (e) {
        console.warn('Price refresh failed:', e);
      }
    }, 60 * 1000);
    
    return () => clearInterval(priceInterval);
  }, [analysis]);

  // ============================================================
  // HELPERS
  // ============================================================

  const formatNumber = (n: number | null | undefined, decimals = 0) => {
    if (n === null || n === undefined) return 'N/A';
    return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
  };

  const formatCompact = (n: number | null | undefined) => {
    if (n === null || n === undefined) return 'N/A';
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toFixed(0);
  };

  const formatPercent = (n: number | null | undefined, decimals = 2) => {
    if (n === null || n === undefined) return 'N/A';
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(decimals)}%`;
  };

  // ============================================================
  // BUILD LEVELS
  // ============================================================

  const buildDailyLevels = (): PriceLevel[] => {
    if (!analysis) return [];
    
    const spotPrice = analysis.realtime_price || analysis.spx_price;
    const levels: PriceLevel[] = [];
    
    // TETTO (Call Wall)
    if (analysis.daily_call_wall) {
      levels.push({
        id: 'd_ceiling',
        price: analysis.daily_call_wall,
        label: 'TETTO',
        sublabel: 'Call Wall',
        icon: <ArrowUpCircle className="h-5 w-5" />,
        type: 'resistance',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/30',
        explanation: 'Strike con massimo Open Interest sulle Call 0DTE. Agisce come resistenza intraday.',
        detailedExplanation: 'Quando il prezzo si avvicina al Call Wall, i market maker che hanno venduto queste Call devono vendere il sottostante per coprirsi (delta hedging). Questa vendita crea pressione al ribasso, rendendo difficile superare questo livello.',
        extraInfo: analysis.daily_call_wall_oi ? `OI: ${formatCompact(analysis.daily_call_wall_oi)}` : undefined
      });
    }
    
    // BREAKEVEN SUPERIORE
    if (analysis.straddle_0dte_strike && analysis.straddle_0dte_price) {
      const beUp = analysis.straddle_0dte_strike + analysis.straddle_0dte_price;
      levels.push({
        id: 'd_be_up',
        price: beUp,
        label: 'BREAKEVEN ↑',
        sublabel: 'Straddle BE Up',
        icon: <TrendingUp className="h-5 w-5" />,
        type: 'breakeven',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 border-orange-500/30',
        explanation: 'Sopra questo livello, chi ha comprato volatilità (straddle) guadagna.',
        detailedExplanation: `Il Breakeven superiore è calcolato come: Strike ATM (${formatNumber(analysis.straddle_0dte_strike)}) + Prezzo Straddle ($${analysis.straddle_0dte_price?.toFixed(0)}). Se il prezzo supera questo livello, significa che il mercato si è mosso PIÙ di quanto era "prezzato" dalla volatilità.`
      });
    }
    
    // PREZZO ATTUALE
    levels.push({
      id: 'd_current',
      price: spotPrice,
      label: 'ADESSO',
      sublabel: 'SPX Spot',
      icon: <MapPin className="h-5 w-5" />,
      type: 'current',
      color: 'text-white',
      bgColor: 'bg-white/10 border-white/40',
      explanation: `Prezzo attuale S&P 500. Variazione: ${formatPercent(analysis.realtime_change_pct)}`,
      detailedExplanation: 'L\'indice S&P 500 rappresenta le 500 maggiori aziende USA per capitalizzazione. È IL benchmark del mercato azionario globale.'
    });
    
    // MAX PAIN (MAGNETE)
    if (analysis.daily_max_pain && Math.abs(analysis.daily_max_pain - spotPrice) > 5) {
      levels.push({
        id: 'd_magnet',
        price: analysis.daily_max_pain,
        label: 'MAGNETE',
        sublabel: 'Max Pain',
        icon: <Magnet className="h-5 w-5" />,
        type: 'pivot',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10 border-purple-500/30',
        explanation: 'Livello dove le opzioni 0DTE perdono più valore. Il prezzo tende a gravitare qui verso la chiusura.',
        detailedExplanation: 'Il Max Pain è lo strike dove il valore totale delle opzioni (call + put) è minimo. I venditori di opzioni (spesso market maker) hanno interesse economico a far chiudere il prezzo vicino a questo livello, perché massimizza le opzioni che scadono senza valore.'
      });
    }
    
    // BREAKEVEN INFERIORE
    if (analysis.straddle_0dte_strike && analysis.straddle_0dte_price) {
      const beDown = analysis.straddle_0dte_strike - analysis.straddle_0dte_price;
      levels.push({
        id: 'd_be_down',
        price: beDown,
        label: 'BREAKEVEN ↓',
        sublabel: 'Straddle BE Down',
        icon: <TrendingDown className="h-5 w-5" />,
        type: 'breakeven',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 border-orange-500/30',
        explanation: 'Sotto questo livello, chi ha comprato volatilità (straddle) guadagna.',
        detailedExplanation: `Il Breakeven inferiore è calcolato come: Strike ATM (${formatNumber(analysis.straddle_0dte_strike)}) - Prezzo Straddle ($${analysis.straddle_0dte_price?.toFixed(0)}). Se il prezzo scende sotto questo livello, significa che il mercato si è mosso PIÙ di quanto era "prezzato".`
      });
    }
    
    // PAVIMENTO (Put Wall)
    if (analysis.daily_put_wall) {
      levels.push({
        id: 'd_floor',
        price: analysis.daily_put_wall,
        label: 'PAVIMENTO',
        sublabel: 'Put Wall',
        icon: <Shield className="h-5 w-5" />,
        type: 'support',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10 border-green-500/30',
        explanation: 'Strike con massimo Open Interest sulle Put 0DTE. Agisce come supporto intraday.',
        detailedExplanation: 'Quando il prezzo scende verso il Put Wall, i market maker che hanno venduto queste Put devono comprare il sottostante per coprirsi. Questo acquisto crea pressione al rialzo, rendendo difficile rompere questo livello al ribasso.',
        extraInfo: analysis.daily_put_wall_oi ? `OI: ${formatCompact(analysis.daily_put_wall_oi)}` : undefined
      });
    }
    
    return levels.sort((a, b) => b.price - a.price);
  };

  const buildMonthlyLevels = (): PriceLevel[] => {
    if (!analysis) return [];
    
    const spotPrice = analysis.realtime_price || analysis.spx_price;
    const levels: PriceLevel[] = [];
    
    // TETTO (Call Wall)
    if (analysis.call_wall) {
      levels.push({
        id: 'm_ceiling',
        price: analysis.call_wall,
        label: 'TETTO',
        sublabel: 'Call Wall',
        icon: <ArrowUpCircle className="h-5 w-5" />,
        type: 'resistance',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/30',
        explanation: `Resistenza fino a scadenza ${analysis.expiration_date}. Strike con massimo OI sulle Call mensili.`,
        detailedExplanation: 'Il Call Wall mensile è più "pesante" del giornaliero perché accumula posizioni di settimane. È un livello chiave per swing trader. I market maker difendono questo livello vendendo quando il prezzo si avvicina.',
        extraInfo: analysis.call_wall_oi ? `OI: ${formatCompact(analysis.call_wall_oi)}` : undefined
      });
    }
    
    // BREAKEVEN SUPERIORE
    if (analysis.atm_strike && analysis.straddle_price) {
      const beUp = analysis.atm_strike + analysis.straddle_price;
      levels.push({
        id: 'm_be_up',
        price: beUp,
        label: 'BREAKEVEN ↑',
        sublabel: 'Straddle BE Up',
        icon: <TrendingUp className="h-5 w-5" />,
        type: 'breakeven',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 border-orange-500/30',
        explanation: `Range superiore atteso entro ${analysis.expiration_date}. Implied move: ±${analysis.implied_move_pct?.toFixed(1)}%`,
        detailedExplanation: `Lo Straddle mensile costa $${analysis.straddle_price?.toFixed(0)}. Questo prezzo definisce il "range atteso" dal mercato. Sopra il Breakeven, il movimento ha superato le aspettative.`
      });
    }
    
    // PREZZO ATTUALE
    levels.push({
      id: 'm_current',
      price: spotPrice,
      label: 'ADESSO',
      sublabel: 'SPX Spot',
      icon: <MapPin className="h-5 w-5" />,
      type: 'current',
      color: 'text-white',
      bgColor: 'bg-white/10 border-white/40',
      explanation: 'Prezzo attuale S&P 500.',
      detailedExplanation: ''
    });
    
    // ZERO GAMMA (PUNTO DI SVOLTA)
    if (analysis.zero_gamma_level || analysis.gex_flip_point) {
      const zeroGamma = analysis.zero_gamma_level || analysis.gex_flip_point;
      const isAbove = spotPrice > zeroGamma;
      levels.push({
        id: 'm_flip',
        price: zeroGamma,
        label: 'PUNTO DI SVOLTA',
        sublabel: 'Zero Gamma',
        icon: <Zap className="h-5 w-5" />,
        type: 'pivot',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 border-yellow-500/30',
        explanation: isAbove 
          ? 'Siamo SOPRA → mercato più stabile, i dealer frenano i movimenti.'
          : 'Siamo SOTTO → mercato più volatile, i dealer amplificano i movimenti.',
        detailedExplanation: 'Il "Zero Gamma" (o GEX Flip Point) è il livello dove il Gamma Exposure totale cambia segno. SOPRA questo livello: i dealer comprano sui cali e vendono sui rally (stabilizzano). SOTTO: fanno l\'opposto (amplificano). È il confine tra mercato "calmo" e mercato "nervoso".'
      });
    }
    
    // MAX PAIN (MAGNETE)
    if (analysis.max_pain_strike) {
      levels.push({
        id: 'm_magnet',
        price: analysis.max_pain_strike,
        label: 'MAGNETE',
        sublabel: 'Max Pain',
        icon: <Magnet className="h-5 w-5" />,
        type: 'pivot',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10 border-purple-500/30',
        explanation: `Target per scadenza ${analysis.expiration_date}. Dove le opzioni mensili perdono più valore.`,
        detailedExplanation: 'Il Max Pain mensile è particolarmente importante per i "OPEX Friday" (terzo venerdì del mese), quando scadono le opzioni mensili. Il prezzo spesso gravita verso questo livello nei giorni precedenti la scadenza.'
      });
    }
    
    // BREAKEVEN INFERIORE
    if (analysis.atm_strike && analysis.straddle_price) {
      const beDown = analysis.atm_strike - analysis.straddle_price;
      levels.push({
        id: 'm_be_down',
        price: beDown,
        label: 'BREAKEVEN ↓',
        sublabel: 'Straddle BE Down',
        icon: <TrendingDown className="h-5 w-5" />,
        type: 'breakeven',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 border-orange-500/30',
        explanation: `Range inferiore atteso entro ${analysis.expiration_date}.`,
        detailedExplanation: 'Il Breakeven inferiore definisce il limite del range "prezzato" dal mercato. Sotto questo, il mercato sta facendo un movimento più grande delle aspettative.'
      });
    }
    
    // PAVIMENTO (Put Wall)
    if (analysis.put_wall) {
      levels.push({
        id: 'm_floor',
        price: analysis.put_wall,
        label: 'PAVIMENTO',
        sublabel: 'Put Wall',
        icon: <Shield className="h-5 w-5" />,
        type: 'support',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10 border-green-500/30',
        explanation: `Supporto forte fino a ${analysis.expiration_date}. Strike con massimo OI sulle Put mensili.`,
        detailedExplanation: 'Il Put Wall mensile è un supporto molto forte. Spesso rappresenta anche il livello dove gli istituzionali hanno le loro protezioni (hedge). Romperlo può scatenare vendite forzate.',
        extraInfo: analysis.put_wall_oi ? `OI: ${formatCompact(analysis.put_wall_oi)}` : undefined
      });
    }
    
    return levels.sort((a, b) => b.price - a.price);
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderLevelCard = (level: PriceLevel) => {
    const spotPrice = analysis?.realtime_price || analysis?.spx_price || 0;
    const distancePercent = level.type !== 'current' 
      ? ((level.price - spotPrice) / spotPrice * 100) 
      : 0;
    const isExpanded = expandedExplanation === level.id;
    
    return (
      <div key={level.id} className="mb-2">
        <button
          onClick={() => level.type !== 'current' && setExpandedExplanation(isExpanded ? null : level.id)}
          className={`
            w-full flex items-center justify-between p-3 rounded-xl border transition-all
            ${level.bgColor}
            ${level.type !== 'current' ? 'cursor-pointer hover:brightness-110 active:scale-[0.99]' : 'cursor-default'}
            ${isExpanded ? 'ring-1 ring-white/20' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <div className={level.color}>{level.icon}</div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className={`font-bold ${level.color}`}>{level.label}</span>
                {level.sublabel && (
                  <span className="text-xs text-slate-500">({level.sublabel})</span>
                )}
              </div>
              <div className={`text-lg font-mono font-bold ${level.type === 'current' ? 'text-white' : level.color}`}>
                {formatNumber(level.price, level.type === 'current' ? 2 : 0)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {level.type !== 'current' && (
              <div className="text-right mr-2">
                <div className={`text-sm font-mono ${distancePercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(distancePercent)}
                </div>
                {level.extraInfo && (
                  <div className="text-xs text-slate-500">{level.extraInfo}</div>
                )}
              </div>
            )}
            
            {level.type !== 'current' && (
              <HelpCircle className={`h-4 w-4 ${isExpanded ? 'text-purple-400' : 'text-slate-500'}`} />
            )}
          </div>
        </button>
        
        {/* Expanded Explanation */}
        {isExpanded && (
          <div className="mx-2 mt-2 mb-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              {level.explanation}
            </p>
            
            {level.detailedExplanation && (
              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-xs text-slate-400 leading-relaxed">
                  {level.detailedExplanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // LOADING & ERROR STATES
  // ============================================================

  if (loading && !analysis) {
    return (
      <Card className="bg-slate-900/90 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-400 mr-3" />
          <span className="text-slate-400">Caricamento dati options SPX...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-900/90 border-slate-700">
        <CardContent className="flex flex-col items-center py-8 gap-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-red-400 text-sm text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={loadAnalysis}>Riprova</Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  const dailyLevels = buildDailyLevels();
  const monthlyLevels = buildMonthlyLevels();
  const spotPrice = analysis.realtime_price || analysis.spx_price;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Card className="bg-slate-900/90 border-slate-700 overflow-hidden">
      
      {/* ═══════════════════════════════════════════════════════════════
          HEADER: Prezzo SPX
      ═══════════════════════════════════════════════════════════════ */}
      <div className="px-4 py-4 border-b border-slate-700/50 bg-gradient-to-r from-purple-900/30 to-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">S&P 500</div>
              <div className="text-3xl font-bold text-white font-mono">
                {formatNumber(spotPrice, 2)}
              </div>
            </div>
            <Badge className={`${analysis.realtime_change_pct >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} text-sm`}>
              {analysis.realtime_change_pct >= 0 ? '▲' : '▼'} {Math.abs(analysis.realtime_change_pct).toFixed(2)}%
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />}
            <Button variant="ghost" size="sm" onClick={loadAnalysis} className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SEZIONE 1: LIVELLI CHIAVE
      ═══════════════════════════════════════════════════════════════ */}
      <div className="border-b border-slate-700/50">
        <div className="px-4 py-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Livelli Chiave</h3>
        </div>
        
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="w-full rounded-none border-b border-slate-700/50 bg-transparent h-auto p-0">
            <TabsTrigger 
              value="daily" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:bg-cyan-500/10 py-3"
            >
              <Clock className="h-4 w-4 mr-2 text-cyan-400" />
              <span className="text-cyan-400">Oggi (0DTE)</span>
            </TabsTrigger>
            <TabsTrigger 
              value="monthly"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-400 data-[state=active]:bg-purple-500/10 py-3"
            >
              <Calendar className="h-4 w-4 mr-2 text-purple-400" />
              <span className="text-purple-400">Mensile</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="p-4 mt-0">
            {dailyLevels.length > 1 ? (
              <>
                {dailyLevels.map(level => renderLevelCard(level))}
                
                <p className="text-xs text-slate-500 mt-4 flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>I livelli 0DTE sono basati sulle opzioni che scadono oggi. Tocca ogni livello per la spiegazione.</span>
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Nessuna scadenza 0DTE oggi</p>
                <p className="text-xs mt-1">Le opzioni 0DTE SPX scadono ogni giorno di trading</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="monthly" className="p-4 mt-0">
            {monthlyLevels.map(level => renderLevelCard(level))}
            
            <p className="text-xs text-slate-500 mt-4 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>I livelli mensili sono validi fino a scadenza ({analysis.expiration_date}). Tocca ogni livello per la spiegazione.</span>
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SEZIONE 2: STRADDLE & RANGE ATTESO
      ═══════════════════════════════════════════════════════════════ */}
      <div className="border-b border-slate-700/50">
        <button
          onClick={() => setExpandedExplanation(expandedExplanation === 'straddle' ? null : 'straddle')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Straddle & Range Atteso</h3>
          </div>
          <HelpCircle className={`h-4 w-4 ${expandedExplanation === 'straddle' ? 'text-purple-400' : 'text-slate-500'}`} />
        </button>
        
        {expandedExplanation === 'straddle' && (
          <div className="px-4 pb-3">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-400 leading-relaxed">
              <p className="mb-2">
                Lo <strong className="text-slate-300">Straddle ATM</strong> è l'acquisto contemporaneo di una Call e una Put allo stesso strike (At-The-Money).
              </p>
              <p className="mb-2">
                Il suo prezzo indica quanto costa "scommettere" su un movimento in qualsiasi direzione.
              </p>
              <p>
                <strong className="text-slate-300">Implied Move</strong> = Straddle ÷ Prezzo Spot. È il movimento che il mercato "prezza" come atteso.
              </p>
            </div>
          </div>
        )}
        
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {/* 0DTE Straddle */}
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-cyan-400 uppercase font-semibold">Oggi (0DTE)</span>
              </div>
              
              {analysis.straddle_0dte_price ? (
                <>
                  <div className="mb-2">
                    <div className="text-xs text-slate-500">Strike ATM</div>
                    <div className="text-lg font-mono text-cyan-300">{formatNumber(analysis.straddle_0dte_strike)}</div>
                  </div>
                  <div className="mb-2">
                    <div className="text-xs text-slate-500">Straddle</div>
                    <div className="text-2xl font-bold font-mono text-cyan-300">${analysis.straddle_0dte_price.toFixed(0)}</div>
                  </div>
                  <div className="mb-2">
                    <div className="text-xs text-slate-500">Implied Move</div>
                    <div className="text-lg font-mono text-white">±{analysis.straddle_0dte_implied_move_pct?.toFixed(2)}%</div>
                  </div>
                  <div className="pt-2 border-t border-cyan-500/20">
                    <div className="text-xs text-slate-500">Range Atteso</div>
                    <div className="text-sm font-mono text-slate-300">
                      {formatNumber((analysis.straddle_0dte_strike || 0) - (analysis.straddle_0dte_price || 0))} - {formatNumber((analysis.straddle_0dte_strike || 0) + (analysis.straddle_0dte_price || 0))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500 py-4 text-center">
                  No 0DTE oggi
                </div>
              )}
            </div>
            
            {/* Monthly Straddle */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-purple-400 uppercase font-semibold">Mensile</span>
              </div>
              
              <div className="mb-2">
                <div className="text-xs text-slate-500">Strike ATM</div>
                <div className="text-lg font-mono text-purple-300">{formatNumber(analysis.atm_strike)}</div>
              </div>
              <div className="mb-2">
                <div className="text-xs text-slate-500">Straddle</div>
                <div className="text-2xl font-bold font-mono text-purple-300">${analysis.straddle_price?.toFixed(0) || '0'}</div>
              </div>
              <div className="mb-2">
                <div className="text-xs text-slate-500">Implied Move</div>
                <div className="text-lg font-mono text-white">±{analysis.implied_move_pct?.toFixed(1)}%</div>
              </div>
              <div className="pt-2 border-t border-purple-500/20">
                <div className="text-xs text-slate-500">Range fino a {analysis.expiration_date}</div>
                <div className="text-sm font-mono text-slate-300">
                  {formatNumber((analysis.atm_strike || 0) - (analysis.straddle_price || 0))} - {formatNumber((analysis.atm_strike || 0) + (analysis.straddle_price || 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SEZIONE 3: DATI AVANZATI
      ═══════════════════════════════════════════════════════════════ */}
      <div className="border-t border-slate-700/50">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        >
          <span className="flex items-center gap-2 text-slate-400">
            <Activity className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Dati Avanzati</span>
          </span>
          {showAdvanced ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>
        
        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4">
            
            {/* VOLATILITÀ (VIX, VVIX) */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <button
                onClick={() => setExpandedExplanation(expandedExplanation === 'volatility' ? null : 'volatility')}
                className="w-full flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-400" />
                  <span className="text-sm font-semibold text-slate-300 uppercase">Volatilità</span>
                </div>
                <HelpCircle className={`h-4 w-4 ${expandedExplanation === 'volatility' ? 'text-purple-400' : 'text-slate-500'}`} />
              </button>
              
              {expandedExplanation === 'volatility' && (
                <div className="mb-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/30 text-xs text-slate-400 leading-relaxed">
                  <p className="mb-2">
                    <strong className="text-slate-300">VIX</strong>: "Fear Index" - misura la volatilità attesa a 30 giorni.
                    Sotto 15 = calma, 15-20 = normale, 20-25 = tensione, sopra 25 = paura.
                  </p>
                  <p>
                    <strong className="text-slate-300">VVIX</strong>: Volatilità del VIX. Indica quanto sono stabili le aspettative.
                    Sotto 85 = stabile, 85-100 = normale, sopra 100 = alta incertezza.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-700/30">
                  <div className="text-xs text-slate-500 uppercase mb-1">VIX</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold font-mono ${
                      analysis.vix && analysis.vix > 25 ? 'text-red-400' :
                      analysis.vix && analysis.vix > 20 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {analysis.vix?.toFixed(1) || 'N/A'}
                    </span>
                    {analysis.vix_change_pct !== null && (
                      <span className={`text-xs font-mono ${analysis.vix_change_pct >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatPercent(analysis.vix_change_pct, 1)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-700/30">
                  <div className="text-xs text-slate-500 uppercase mb-1">VVIX</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold font-mono ${
                      analysis.vvix && analysis.vvix > 100 ? 'text-red-400' :
                      analysis.vvix && analysis.vvix > 85 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {analysis.vvix?.toFixed(1) || 'N/A'}
                    </span>
                    {analysis.vvix_change_pct !== null && (
                      <span className={`text-xs font-mono ${analysis.vvix_change_pct >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatPercent(analysis.vvix_change_pct, 1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* SENTIMENT (P/C Ratio) */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <button
                onClick={() => setExpandedExplanation(expandedExplanation === 'sentiment' ? null : 'sentiment')}
                className="w-full flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-300 uppercase">Sentiment (Put/Call Ratio)</span>
                </div>
                <HelpCircle className={`h-4 w-4 ${expandedExplanation === 'sentiment' ? 'text-purple-400' : 'text-slate-500'}`} />
              </button>
              
              {expandedExplanation === 'sentiment' && (
                <div className="mb-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/30 text-xs text-slate-400 leading-relaxed">
                  <p className="mb-2">
                    Il <strong className="text-slate-300">Put/Call Ratio</strong> indica il rapporto tra opzioni Put (ribassiste) e Call (rialziste).
                  </p>
                  <p>
                    Sotto 0.7 = più Call → ottimismo. Sopra 1.0 = più Put → pessimismo o copertura.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-1 text-xs text-cyan-400 uppercase mb-1">
                    <Clock className="h-3 w-3" /> 0DTE
                  </div>
                  <div className={`text-2xl font-bold font-mono ${
                    analysis.daily_put_call_ratio === null ? 'text-slate-500' :
                    analysis.daily_put_call_ratio < 0.7 ? 'text-green-400' :
                    analysis.daily_put_call_ratio > 1.0 ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {analysis.daily_put_call_ratio?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-1 text-xs text-purple-400 uppercase mb-1">
                    <Calendar className="h-3 w-3" /> Mensile
                  </div>
                  <div className={`text-2xl font-bold font-mono ${
                    analysis.put_call_ratio_oi < 0.7 ? 'text-green-400' :
                    analysis.put_call_ratio_oi > 1.0 ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {analysis.put_call_ratio_oi.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* GEX */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <button
                onClick={() => setExpandedExplanation(expandedExplanation === 'gex' ? null : 'gex')}
                className="w-full flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span className="text-sm font-semibold text-slate-300 uppercase">Gamma Exposure (GEX)</span>
                </div>
                <HelpCircle className={`h-4 w-4 ${expandedExplanation === 'gex' ? 'text-purple-400' : 'text-slate-500'}`} />
              </button>
              
              {expandedExplanation === 'gex' && (
                <div className="mb-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/30 text-xs text-slate-400 leading-relaxed">
                  <p className="mb-2">
                    Il <strong className="text-slate-300">GEX</strong> misura come i market maker devono coprirsi.
                  </p>
                  <p className="mb-2">
                    <strong className="text-blue-400">GEX Positivo (Long Gamma)</strong>: I dealer comprano quando scende, vendono quando sale → STABILIZZANO il mercato → movimenti contenuti.
                  </p>
                  <p>
                    <strong className="text-orange-400">GEX Negativo (Short Gamma)</strong>: I dealer vendono quando scende, comprano quando sale → AMPLIFICANO i movimenti → swing violenti.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border ${
                  analysis.daily_gex_positioning === 'long_gamma' ? 'bg-blue-500/10 border-blue-500/30' :
                  analysis.daily_gex_positioning === 'short_gamma' ? 'bg-orange-500/10 border-orange-500/30' :
                  'bg-slate-700/30 border-slate-600/30'
                }`}>
                  <div className="flex items-center gap-1 text-xs text-cyan-400 uppercase mb-1">
                    <Clock className="h-3 w-3" /> 0DTE
                  </div>
                  <div className={`text-2xl font-bold font-mono ${
                    analysis.daily_gex_positioning === 'long_gamma' ? 'text-blue-400' :
                    analysis.daily_gex_positioning === 'short_gamma' ? 'text-orange-400' :
                    'text-slate-400'
                  }`}>
                    {analysis.daily_gex !== null ? `${analysis.daily_gex >= 0 ? '+' : ''}${analysis.daily_gex.toFixed(1)}B` : 'N/A'}
                  </div>
                  <div className={`text-xs mt-1 ${
                    analysis.daily_gex_positioning === 'long_gamma' ? 'text-blue-300' :
                    analysis.daily_gex_positioning === 'short_gamma' ? 'text-orange-300' :
                    'text-slate-500'
                  }`}>
                    {analysis.daily_gex_positioning === 'long_gamma' ? '🎯 Stabilizzato' :
                     analysis.daily_gex_positioning === 'short_gamma' ? '⚡ Amplificato' : '➖ Neutro'}
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg border ${
                  analysis.dealer_positioning === 'long_gamma' ? 'bg-blue-500/10 border-blue-500/30' :
                  analysis.dealer_positioning === 'short_gamma' ? 'bg-orange-500/10 border-orange-500/30' :
                  'bg-slate-700/30 border-slate-600/30'
                }`}>
                  <div className="flex items-center gap-1 text-xs text-purple-400 uppercase mb-1">
                    <Calendar className="h-3 w-3" /> Mensile
                  </div>
                  <div className={`text-2xl font-bold font-mono ${
                    analysis.dealer_positioning === 'long_gamma' ? 'text-blue-400' :
                    analysis.dealer_positioning === 'short_gamma' ? 'text-orange-400' :
                    'text-slate-400'
                  }`}>
                    {analysis.total_gex >= 0 ? '+' : ''}{analysis.total_gex.toFixed(1)}B
                  </div>
                  <div className={`text-xs mt-1 ${
                    analysis.dealer_positioning === 'long_gamma' ? 'text-blue-300' :
                    analysis.dealer_positioning === 'short_gamma' ? 'text-orange-300' :
                    'text-slate-500'
                  }`}>
                    {analysis.dealer_positioning === 'long_gamma' ? '🎯 Stabilizzato' :
                     analysis.dealer_positioning === 'short_gamma' ? '⚡ Amplificato' : '➖ Neutro'}
                  </div>
                </div>
              </div>
              
              {/* TOP GEX STRIKES - Con Tabs 0DTE / Mensile */}
              {(analysis.gex_levels?.length > 0 || analysis.daily_gex_levels?.length > 0) && (
                <div className="mt-4">
                  <button
                    onClick={() => setExpandedExplanation(expandedExplanation === 'gex_levels' ? null : 'gex_levels')}
                    className="w-full flex items-center justify-between mb-2"
                  >
                    <span className="text-xs text-slate-400 uppercase">Strike Chiave GEX</span>
                    <HelpCircle className={`h-3 w-3 ${expandedExplanation === 'gex_levels' ? 'text-purple-400' : 'text-slate-500'}`} />
                  </button>
                  
                  {expandedExplanation === 'gex_levels' && (
                    <div className="mb-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/30 text-xs text-slate-400 leading-relaxed">
                      <p className="mb-2">
                        <strong className="text-blue-400">Strike blu (GEX+)</strong>: Zone dove il prezzo tende a "bloccarsi". I dealer stabilizzano il prezzo qui.
                      </p>
                      <p>
                        <strong className="text-orange-400">Strike arancio (GEX-)</strong>: Zone dove il prezzo può accelerare. I dealer amplificano i movimenti qui.
                      </p>
                    </div>
                  )}
                  
                  <Tabs defaultValue="monthly_gex" className="w-full">
                    <TabsList className="w-full h-auto p-1 bg-slate-800/50 rounded-lg mb-2">
                      <TabsTrigger 
                        value="daily_gex" 
                        className="flex-1 text-xs py-1.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        0DTE
                      </TabsTrigger>
                      <TabsTrigger 
                        value="monthly_gex"
                        className="flex-1 text-xs py-1.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Mensile
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* 0DTE GEX Strikes */}
                    <TabsContent value="daily_gex" className="mt-0">
                      {analysis.daily_gex_levels && analysis.daily_gex_levels.length > 0 ? (
                        <div className="space-y-1">
                          {/* Prezzo corrente come riferimento */}
                          <div className="flex items-center justify-center gap-2 py-1 text-xs text-slate-400">
                            <div className="flex-1 h-px bg-slate-600"></div>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-white" />
                              <span className="font-mono text-white">{formatNumber(spotPrice, 2)}</span>
                            </span>
                            <div className="flex-1 h-px bg-slate-600"></div>
                          </div>
                          {analysis.daily_gex_levels.slice(0, 5).map((level, idx) => (
                            <div 
                              key={idx}
                              className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                                level.type === 'positive' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-orange-500/10 border border-orange-500/20'
                              }`}
                            >
                              <span className={`flex items-center gap-2 ${level.type === 'positive' ? 'text-blue-300' : 'text-orange-300'}`}>
                                {level.type === 'positive' ? <Shield className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                                <span className="font-mono font-bold">{formatNumber(level.strike)}</span>
                                <span className="text-xs opacity-70">{level.type === 'positive' ? 'Stabilità' : 'Volatilità'}</span>
                              </span>
                              <span className={`font-mono text-sm ${level.type === 'positive' ? 'text-blue-400' : 'text-orange-400'}`}>
                                {level.gex >= 0 ? '+' : ''}{formatCompact(level.gex)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500 text-sm">
                          <Clock className="h-5 w-5 mx-auto mb-1 opacity-50" />
                          Nessun dato 0DTE disponibile
                        </div>
                      )}
                    </TabsContent>
                    
                    {/* Monthly GEX Strikes */}
                    <TabsContent value="monthly_gex" className="mt-0">
                      {analysis.gex_levels && analysis.gex_levels.length > 0 ? (
                        <div className="space-y-1">
                          {/* Prezzo corrente come riferimento */}
                          <div className="flex items-center justify-center gap-2 py-1 text-xs text-slate-400">
                            <div className="flex-1 h-px bg-slate-600"></div>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-white" />
                              <span className="font-mono text-white">{formatNumber(spotPrice, 2)}</span>
                            </span>
                            <div className="flex-1 h-px bg-slate-600"></div>
                          </div>
                          {analysis.gex_levels.slice(0, 5).map((level, idx) => (
                            <div 
                              key={idx}
                              className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                                level.type === 'positive' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-orange-500/10 border border-orange-500/20'
                              }`}
                            >
                              <span className={`flex items-center gap-2 ${level.type === 'positive' ? 'text-blue-300' : 'text-orange-300'}`}>
                                {level.type === 'positive' ? <Shield className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                                <span className="font-mono font-bold">{formatNumber(level.strike)}</span>
                                <span className="text-xs opacity-70">{level.type === 'positive' ? 'Stabilità' : 'Volatilità'}</span>
                              </span>
                              <span className={`font-mono text-sm ${level.type === 'positive' ? 'text-blue-400' : 'text-orange-400'}`}>
                                {level.gex >= 0 ? '+' : ''}{formatCompact(level.gex)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500 text-sm">
                          Nessun dato mensile disponibile
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
            
            {/* VOLUME & OI */}
            <details className="group">
              <summary className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 cursor-pointer hover:bg-slate-800/50 transition-colors flex items-center justify-between list-none">
                <span className="flex items-center gap-2 text-sm text-slate-400">
                  <BarChart3 className="h-4 w-4" />
                  Volume & Open Interest
                </span>
                <ChevronDown className="h-4 w-4 text-slate-500 group-open:rotate-180 transition-transform" />
              </summary>
              
              <div className="mt-3 space-y-3">
                {/* 0DTE */}
                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs text-cyan-400 uppercase font-semibold">0DTE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-green-400 uppercase mb-2">
                        <TrendingUp className="h-3 w-3" /> CALL
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">OI:</span>
                          <span className="text-green-400 font-mono">{formatCompact(analysis.daily_total_call_oi)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Volume:</span>
                          <span className="text-slate-300 font-mono">{formatCompact(analysis.daily_total_call_volume)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-red-400 uppercase mb-2">
                        <TrendingDown className="h-3 w-3" /> PUT
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">OI:</span>
                          <span className="text-red-400 font-mono">{formatCompact(analysis.daily_total_put_oi)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Volume:</span>
                          <span className="text-slate-300 font-mono">{formatCompact(analysis.daily_total_put_volume)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mensile */}
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span className="text-xs text-purple-400 uppercase font-semibold">Mensile ({analysis.expiration_date})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-green-400 uppercase mb-2">
                        <TrendingUp className="h-3 w-3" /> CALL
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">OI:</span>
                          <span className="text-green-400 font-mono">{formatCompact(analysis.total_call_oi)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Volume:</span>
                          <span className="text-slate-300 font-mono">{formatCompact(analysis.total_call_volume)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-red-400 uppercase mb-2">
                        <TrendingDown className="h-3 w-3" /> PUT
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">OI:</span>
                          <span className="text-red-400 font-mono">{formatCompact(analysis.total_put_oi)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Volume:</span>
                          <span className="text-slate-300 font-mono">{formatCompact(analysis.total_put_volume)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
            
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-700/30 flex justify-between items-center">
        <span className="text-xs text-slate-500">
          {analysis.contracts_analyzed.toLocaleString()} contratti analizzati
        </span>
        <span className="text-xs text-slate-500">
          {lastUpdate?.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
    </Card>
  );
}
