/**
 * SPX OPTIONS INTELLIGENCE PANEL - MOBILE FIRST v4
 * 
 * Design educativo:
 * - Due sezioni: GIORNALIERI (0DTE) e MENSILI
 * - Termini semplici in primo piano + termini tecnici visibili
 * - Spiegazioni che insegnano il concetto
 * - Dati avanzati per chi vuole approfondire
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
  Target,
  Activity,
  Calendar,
  Clock,
  Magnet,
  ArrowUpCircle,
  ArrowDownCircle,
  MapPin,
  BarChart3,
  Gauge
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { analyzeSPXOptions, SPXAnalysis } from '@/services/polygonService';

interface SPXOptionsPanelProps {
  fedScenario?: string;
}

interface PriceLevel {
  id: string;
  price: number;
  simpleLabel: string;
  technicalTerm: string;
  icon: React.ReactNode;
  type: 'resistance' | 'support' | 'pivot' | 'current' | 'breakeven';
  color: string;
  bgColor: string;
  explanation: string;
  learnMore: string;
  oiOrVolume?: number;
}

export function SPXOptionsPanel({ fedScenario }: SPXOptionsPanelProps) {
  const [analysis, setAnalysis] = useState<SPXAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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
            spx_price: data.price
          } : null);
        }
      } catch (e) {
        console.warn('Price refresh failed:', e);
      }
    }, 60 * 1000);
    
    return () => clearInterval(priceInterval);
  }, [analysis]);

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

  // Determine market regime
  const getMarketRegime = () => {
    if (!analysis) return null;
    
    const spotPrice = analysis.realtime_price || analysis.spx_price;
    const callWall = analysis.daily_call_wall || analysis.call_wall;
    const putWall = analysis.daily_put_wall || analysis.put_wall;
    
    // Distance to walls
    const distToCall = callWall ? ((callWall - spotPrice) / spotPrice * 100) : null;
    const distToPut = putWall ? ((spotPrice - putWall) / spotPrice * 100) : null;
    
    // Regime based on GEX
    const isLongGamma = analysis.dealer_positioning === 'long_gamma';
    const isShortGamma = analysis.dealer_positioning === 'short_gamma';
    
    // Near wall?
    const nearResistance = distToCall !== null && distToCall < 0.5;
    const nearSupport = distToPut !== null && distToPut < 0.5;
    
    if (isLongGamma) {
      return {
        icon: <Target className="h-5 w-5 text-blue-400" />,
        title: 'MERCATO CONTENUTO',
        subtitle: 'Range previsto',
        description: 'I grandi operatori (market maker) stanno stabilizzando il mercato. Movimenti ampi sono meno probabili.',
        color: 'from-blue-500/20 to-cyan-500/20',
        borderColor: 'border-blue-500/30'
      };
    } else if (isShortGamma) {
      return {
        icon: <Zap className="h-5 w-5 text-orange-400" />,
        title: 'MERCATO REATTIVO',
        subtitle: 'Volatilità aumentata',
        description: 'I market maker amplificheranno i movimenti. Aspettati swing più ampi del solito.',
        color: 'from-orange-500/20 to-red-500/20',
        borderColor: 'border-orange-500/30'
      };
    } else if (nearResistance) {
      return {
        icon: <ArrowUpCircle className="h-5 w-5 text-red-400" />,
        title: 'VICINO AL TETTO',
        subtitle: 'Resistenza forte',
        description: 'Il prezzo è vicino a un livello dove i venditori tendono a intervenire.',
        color: 'from-red-500/20 to-pink-500/20',
        borderColor: 'border-red-500/30'
      };
    } else if (nearSupport) {
      return {
        icon: <Shield className="h-5 w-5 text-green-400" />,
        title: 'VICINO AL PAVIMENTO',
        subtitle: 'Supporto forte',
        description: 'Il prezzo è vicino a un livello dove i compratori tendono a intervenire.',
        color: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'border-green-500/30'
      };
    }
    
    return {
      icon: <BarChart3 className="h-5 w-5 text-slate-400" />,
      title: 'MERCATO IN EQUILIBRIO',
      subtitle: 'Normale operatività',
      description: 'Nessun segnale estremo. Il mercato si muove liberamente tra i livelli chiave.',
      color: 'from-slate-500/20 to-slate-600/20',
      borderColor: 'border-slate-500/30'
    };
  };

  // Calculate today's scenario with probabilities
  const getTodayScenario = () => {
    if (!analysis) return null;
    
    const spotPrice = analysis.realtime_price || analysis.spx_price;
    const callWall = analysis.daily_call_wall || analysis.call_wall;
    const putWall = analysis.daily_put_wall || analysis.put_wall;
    const maxPain = analysis.daily_max_pain || analysis.max_pain_strike;
    const rawImpliedMove = analysis.straddle_0dte_implied_move_pct || analysis.implied_move_pct || 1;
    
    // ═══════════════════════════════════════════════════════════════
    // FIX #1: TIME DECAY INTRADAY
    // Lo straddle 0DTE perde valore durante la giornata (theta decay)
    // Alle 9:30 hai ~6.5h di trading, alle 15:00 solo ~1h
    // Usiamo sqrt(time) perché theta scala con radice del tempo
    // ═══════════════════════════════════════════════════════════════
    const now = new Date();
    const marketOpenHour = 9.5;  // 9:30 AM ET
    const marketCloseHour = 16;  // 4:00 PM ET
    const totalTradingHours = marketCloseHour - marketOpenHour; // 6.5 hours
    
    const currentHour = now.getHours() + (now.getMinutes() / 60);
    const hoursToClose = Math.max(0.25, marketCloseHour - currentHour); // Min 15 min
    const timeDecayFactor = Math.sqrt(hoursToClose / totalTradingHours);
    
    // Applica time decay solo se siamo in market hours e usando 0DTE
    const isMarketHours = currentHour >= marketOpenHour && currentHour <= marketCloseHour;
    const using0DTE = analysis.straddle_0dte_implied_move_pct !== null;
    const impliedMove = (isMarketHours && using0DTE) 
      ? rawImpliedMove * timeDecayFactor 
      : rawImpliedMove;
    
    // Calculate range bounds (con implied move adjusted)
    const rangeHigh = spotPrice * (1 + impliedMove / 100);
    const rangeLow = spotPrice * (1 - impliedMove / 100);
    
    // Base probability of staying in range: ~68% (1 std dev from options pricing)
    let rangeProb = 68;
    
    // ═══════════════════════════════════════════════════════════════
    // FIX #2: GEX SCALING CONTINUO
    // Invece di step fissi (+12%/-15%), usiamo una funzione continua
    // che scala in base all'intensità del GEX
    // tanh() fornisce smooth scaling tra -1 e +1
    // ═══════════════════════════════════════════════════════════════
    const totalGex = analysis.total_gex || 0;
    const GEX_NORMALIZATION_FACTOR = 2; // 2B = GEX "medio" per SPX
    const gexNormalized = totalGex / GEX_NORMALIZATION_FACTOR;
    
    // Max modifier: +12% per long gamma estremo, -15% per short gamma estremo
    // tanh scala smoothly: gexNorm=1 → ~0.46, gexNorm=2 → ~0.76, gexNorm=3 → ~0.90
    if (totalGex > 0) {
      // Long gamma: dealers stabilize → range più probabile
      const gexModifier = Math.tanh(gexNormalized * 0.5) * 12;
      rangeProb += gexModifier;
    } else if (totalGex < 0) {
      // Short gamma: dealers amplify → breakout più probabile
      const gexModifier = Math.tanh(Math.abs(gexNormalized) * 0.5) * 15;
      rangeProb -= gexModifier;
    }
    // Clamp range probability tra 40% e 85% e arrotonda
    rangeProb = Math.round(Math.max(40, Math.min(85, rangeProb)));
    
    // Calculate directional bias
    const distToCallWall = callWall ? (callWall - spotPrice) : Infinity;
    const distToPutWall = putWall ? (spotPrice - putWall) : Infinity;
    const distToMaxPain = maxPain ? (maxPain - spotPrice) : 0;
    
    // Bias calculation: positive = bullish, negative = bearish
    let bias = 0;
    let biasReason = '';
    
    // Max Pain magnetism (stronger effect closer to expiry)
    if (maxPain && Math.abs(distToMaxPain) > 5) {
      if (distToMaxPain > 0) {
        bias += 0.3; // Max pain above → slight pull up
        biasReason = `Max Pain a ${formatNumber(maxPain)} attira verso l'alto`;
      } else {
        bias -= 0.3; // Max pain below → slight pull down
        biasReason = `Max Pain a ${formatNumber(maxPain)} attira verso il basso`;
      }
    }
    
    // Wall proximity effect
    if (distToCallWall < distToPutWall && distToCallWall < spotPrice * 0.01) {
      bias -= 0.4; // Close to call wall → resistance → bearish bias
      biasReason = 'Vicino al Tetto → probabile respinta';
    } else if (distToPutWall < distToCallWall && distToPutWall < spotPrice * 0.01) {
      bias += 0.4; // Close to put wall → support → bullish bias
      biasReason = 'Vicino al Pavimento → probabile rimbalzo';
    }
    
    // P/C Ratio sentiment
    if (analysis.put_call_ratio_oi < 0.7) {
      bias += 0.2; // Bullish sentiment
    } else if (analysis.put_call_ratio_oi > 1.0) {
      bias -= 0.2; // Bearish sentiment / hedging
    }
    
    // ═══════════════════════════════════════════════════════════════
    // VVIX-BASED CONFIDENCE ASSESSMENT
    // VVIX è la volatilità del VIX - range tipico 80-130
    // VVIX < 85: Vol of Vol molto bassa → distribuzione normale, alta confidenza
    // VVIX 85-100: Normale → media confidenza
    // VVIX 100-115: Elevata → bassa confidenza, possibili movimenti estremi
    // VVIX > 115: Estrema → le probabilità sono poco affidabili
    // ═══════════════════════════════════════════════════════════════
    const vvix = analysis.vvix;
    let confidence: 'high' | 'medium' | 'low' | 'very_low' = 'medium';
    let confidenceReason = '';
    
    if (vvix !== null && vvix !== undefined) {
      if (vvix < 85) {
        confidence = 'high';
        confidenceReason = `VVIX ${vvix.toFixed(1)} - Vol of Vol bassa, probabilità affidabili`;
      } else if (vvix < 100) {
        confidence = 'medium';
        confidenceReason = `VVIX ${vvix.toFixed(1)} - Range normale, probabilità indicative`;
      } else if (vvix < 115) {
        confidence = 'low';
        confidenceReason = `VVIX ${vvix.toFixed(1)} - Vol of Vol elevata, prendere con cautela`;
      } else {
        confidence = 'very_low';
        confidenceReason = `VVIX ${vvix.toFixed(1)} - Estrema instabilità, probabilità poco affidabili`;
      }
    } else {
      confidenceReason = 'VVIX non disponibile';
    }
    
    // Determine scenario
    let scenario: {
      title: string;
      description: string;
      rangeProb: number;
      upProb: number;
      downProb: number;
      target: number | null;
      rangeHigh: number;
      rangeLow: number;
      confidence: 'high' | 'medium' | 'low' | 'very_low';
      confidenceReason: string;
      timeDecayApplied: boolean;
      gexModifier: number;
    };
    
    const breakoutProb = 100 - rangeProb;
    const gexModifierApplied = Math.round((totalGex > 0 
      ? Math.tanh(gexNormalized * 0.5) * 12 
      : totalGex < 0 
        ? -Math.tanh(Math.abs(gexNormalized) * 0.5) * 15 
        : 0) * 10) / 10; // Arrotonda a 1 decimale
    let upProb: number;
    let downProb: number;
    
    // Arrotonda breakout prob
    const breakoutProbRounded = Math.round(breakoutProb);
    
    if (bias > 0.3) {
      // Bullish bias
      upProb = Math.round(breakoutProbRounded * 0.7);
      downProb = breakoutProbRounded - upProb; // Assicura somma = 100%
    } else if (bias < -0.3) {
      // Bearish bias
      downProb = Math.round(breakoutProbRounded * 0.7);
      upProb = breakoutProbRounded - downProb; // Assicura somma = 100%
    } else {
      // Neutral - split equo
      upProb = Math.round(breakoutProbRounded / 2);
      downProb = breakoutProbRounded - upProb; // Assicura somma = 100%
    }
    
    // Determine primary scenario
    if (rangeProb >= 70) {
      scenario = {
        title: 'RANGE BOUND',
        description: biasReason || `Il prezzo dovrebbe restare tra ${formatNumber(rangeLow)} e ${formatNumber(rangeHigh)}`,
        rangeProb,
        upProb,
        downProb,
        target: maxPain,
        rangeHigh,
        rangeLow,
        confidence,
        confidenceReason,
        timeDecayApplied: isMarketHours && using0DTE,
        gexModifier: gexModifierApplied
      };
    } else if (rangeProb >= 55) {
      scenario = {
        title: bias > 0 ? 'LEGGERO RIALZO' : bias < 0 ? 'LEGGERA FLESSIONE' : 'LATERALE',
        description: biasReason || 'Movimento contenuto con possibili test dei livelli',
        rangeProb,
        upProb,
        downProb,
        target: bias > 0 ? callWall : bias < 0 ? putWall : maxPain,
        rangeHigh,
        rangeLow,
        confidence,
        confidenceReason,
        timeDecayApplied: isMarketHours && using0DTE,
        gexModifier: gexModifierApplied
      };
    } else {
      scenario = {
        title: 'VOLATILITÀ ELEVATA',
        description: 'I market maker amplificheranno i movimenti. Possibile breakout dei livelli.',
        rangeProb,
        upProb,
        downProb,
        target: null,
        rangeHigh,
        rangeLow,
        confidence,
        confidenceReason,
        timeDecayApplied: isMarketHours && using0DTE,
        gexModifier: gexModifierApplied
      };
    }
    
    return scenario;
  };

  // Build DAILY levels (0DTE)
  const buildDailyLevels = (): PriceLevel[] => {
    if (!analysis) return [];
    
    const spotPrice = analysis.realtime_price || analysis.spx_price;
    const levels: PriceLevel[] = [];
    
    // TETTO GIORNALIERO (Daily Call Wall)
    if (analysis.daily_call_wall) {
      levels.push({
        id: 'd_ceiling',
        price: analysis.daily_call_wall,
        simpleLabel: 'TETTO',
        technicalTerm: 'Call Wall 0DTE',
        icon: <ArrowUpCircle className="h-5 w-5 text-red-400" />,
        type: 'resistance',
        color: 'text-red-400',
        bgColor: 'bg-gradient-to-r from-red-500/10 to-red-600/5 border-red-500/30',
        explanation: 'Resistenza del giorno. Strike con massimo Open Interest sulle Call che scadono OGGI. I market maker difendono questo livello.',
        learnMore: 'Il "Call Wall" giornaliero è lo strike con il maggior OI sulle Call 0DTE. Quando il prezzo si avvicina, i dealer vendono per coprirsi (delta hedging), creando resistenza intraday.',
        oiOrVolume: analysis.daily_call_wall_oi || undefined
      });
    }
    
    // BREAKEVEN SUPERIORE 0DTE
    if (analysis.straddle_0dte_strike && analysis.straddle_0dte_price) {
      const beUp = analysis.straddle_0dte_strike + analysis.straddle_0dte_price;
      levels.push({
        id: 'd_be_up',
        price: beUp,
        simpleLabel: 'BREAKEVEN ↑',
        technicalTerm: 'Straddle BE Up 0DTE',
        icon: <TrendingUp className="h-5 w-5 text-orange-400" />,
        type: 'breakeven',
        color: 'text-orange-400',
        bgColor: 'bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30',
        explanation: `Sopra questo livello, chi ha comprato volatilità oggi guadagna. Il mercato "prezza" che SPX resti sotto.`,
        learnMore: `Lo Straddle 0DTE costa $${analysis.straddle_0dte_price?.toFixed(0)}. Il Breakeven superiore è strike + premio = ${formatNumber(beUp)}. Sopra questo, i buyer di volatilità sono in profitto.`
      });
    }
    
    // PREZZO ATTUALE
    levels.push({
      id: 'd_current',
      price: spotPrice,
      simpleLabel: 'ADESSO',
      technicalTerm: 'Spot Price',
      icon: <MapPin className="h-5 w-5 text-white" />,
      type: 'current',
      color: 'text-white',
      bgColor: 'bg-gradient-to-r from-white/10 to-white/5 border-white/40',
      explanation: `Prezzo attuale S&P 500. Variazione: ${analysis.realtime_change_pct >= 0 ? '+' : ''}${analysis.realtime_change_pct.toFixed(2)}%`,
      learnMore: 'SPX è l\'indice S&P 500, le 500 maggiori aziende USA per capitalizzazione. È IL benchmark del mercato azionario globale.'
    });
    
    // MAX PAIN GIORNALIERO
    if (analysis.daily_max_pain && Math.abs(analysis.daily_max_pain - spotPrice) > 5) {
      levels.push({
        id: 'd_magnet',
        price: analysis.daily_max_pain,
        simpleLabel: 'MAGNETE',
        technicalTerm: 'Max Pain 0DTE',
        icon: <Magnet className="h-5 w-5 text-purple-400" />,
        type: 'pivot',
        color: 'text-purple-400',
        bgColor: 'bg-gradient-to-r from-purple-500/10 to-purple-600/5 border-purple-500/30',
        explanation: 'Dove le opzioni 0DTE perdono più valore. Il prezzo tende a gravitare qui verso la chiusura.',
        learnMore: 'Il "Max Pain" è lo strike dove il valore totale delle opzioni (call + put) è minimo. I market maker hanno interesse economico a far chiudere il prezzo qui.'
      });
    }
    
    // BREAKEVEN INFERIORE 0DTE
    if (analysis.straddle_0dte_strike && analysis.straddle_0dte_price) {
      const beDown = analysis.straddle_0dte_strike - analysis.straddle_0dte_price;
      levels.push({
        id: 'd_be_down',
        price: beDown,
        simpleLabel: 'BREAKEVEN ↓',
        technicalTerm: 'Straddle BE Down 0DTE',
        icon: <TrendingDown className="h-5 w-5 text-orange-400" />,
        type: 'breakeven',
        color: 'text-orange-400',
        bgColor: 'bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30',
        explanation: `Sotto questo livello, chi ha comprato volatilità oggi guadagna. Il mercato "prezza" che SPX resti sopra.`,
        learnMore: `Il Breakeven inferiore è strike - premio = ${formatNumber(beDown)}. Sotto questo, i buyer di volatilità (Put) sono in profitto.`
      });
    }
    
    // PAVIMENTO GIORNALIERO (Daily Put Wall)
    if (analysis.daily_put_wall) {
      levels.push({
        id: 'd_floor',
        price: analysis.daily_put_wall,
        simpleLabel: 'PAVIMENTO',
        technicalTerm: 'Put Wall 0DTE',
        icon: <Shield className="h-5 w-5 text-green-400" />,
        type: 'support',
        color: 'text-green-400',
        bgColor: 'bg-gradient-to-r from-green-500/10 to-green-600/5 border-green-500/30',
        explanation: 'Supporto del giorno. Strike con massimo Open Interest sulle Put che scadono OGGI. I market maker difendono questo livello.',
        learnMore: 'Il "Put Wall" giornaliero è lo strike con il maggior OI sulle Put 0DTE. Quando il prezzo scende qui, i dealer comprano per coprirsi, creando supporto intraday.',
        oiOrVolume: analysis.daily_put_wall_oi || undefined
      });
    }
    
    return levels.sort((a, b) => b.price - a.price);
  };

  // Build MONTHLY levels
  const buildMonthlyLevels = (): PriceLevel[] => {
    if (!analysis) return [];
    
    const spotPrice = analysis.realtime_price || analysis.spx_price;
    const levels: PriceLevel[] = [];
    
    // TETTO MENSILE (Monthly Call Wall)
    if (analysis.call_wall) {
      levels.push({
        id: 'm_ceiling',
        price: analysis.call_wall,
        simpleLabel: 'TETTO',
        technicalTerm: 'Call Wall Monthly',
        icon: <ArrowUpCircle className="h-5 w-5 text-red-400" />,
        type: 'resistance',
        color: 'text-red-400',
        bgColor: 'bg-gradient-to-r from-red-500/10 to-red-600/5 border-red-500/30',
        explanation: `Resistenza fino a scadenza ${analysis.expiration_date}. Strike con massimo OI sulle Call mensili.`,
        learnMore: 'Il "Call Wall" mensile è più "pesante" del giornaliero perché accumula posizioni di settimane. È un livello chiave per swing trader e investitori.',
        oiOrVolume: analysis.call_wall_oi || undefined
      });
    }
    
    // BREAKEVEN SUPERIORE MENSILE
    if (analysis.atm_strike && analysis.straddle_price) {
      const beUp = analysis.atm_strike + analysis.straddle_price;
      levels.push({
        id: 'm_be_up',
        price: beUp,
        simpleLabel: 'BREAKEVEN ↑',
        technicalTerm: 'Straddle BE Up Monthly',
        icon: <TrendingUp className="h-5 w-5 text-orange-400" />,
        type: 'breakeven',
        color: 'text-orange-400',
        bgColor: 'bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30',
        explanation: `Range superiore atteso entro ${analysis.expiration_date}. Implied move: ±${analysis.implied_move_pct?.toFixed(1)}%`,
        learnMore: `Lo Straddle mensile costa $${analysis.straddle_price?.toFixed(0)}. Questo definisce il range "priced in" dal mercato fino a scadenza.`
      });
    }
    
    // ZONA DI SVOLTA (Zero Gamma)
    if (analysis.zero_gamma_level || analysis.gex_flip_point) {
      const zeroGamma = analysis.zero_gamma_level || analysis.gex_flip_point;
      levels.push({
        id: 'm_flip',
        price: zeroGamma,
        simpleLabel: 'ZONA DI SVOLTA',
        technicalTerm: 'Zero Gamma / GEX Flip',
        icon: <Zap className="h-5 w-5 text-yellow-400" />,
        type: 'pivot',
        color: 'text-yellow-400',
        bgColor: 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/30',
        explanation: spotPrice > zeroGamma 
          ? 'Siamo SOPRA → mercato più stabile, tendenza a restare in range.'
          : 'Siamo SOTTO → mercato più volatile, movimenti direzionali amplificati.',
        learnMore: 'Il "Zero Gamma" è dove il Gamma Exposure totale cambia segno. SOPRA: i dealer comprano sui cali e vendono sui rally (stabilizzando). SOTTO: fanno l\'opposto (amplificando i movimenti).'
      });
    }
    
    // PREZZO ATTUALE
    levels.push({
      id: 'm_current',
      price: spotPrice,
      simpleLabel: 'ADESSO',
      technicalTerm: 'Spot Price',
      icon: <MapPin className="h-5 w-5 text-white" />,
      type: 'current',
      color: 'text-white',
      bgColor: 'bg-gradient-to-r from-white/10 to-white/5 border-white/40',
      explanation: `Prezzo attuale S&P 500.`,
      learnMore: ''
    });
    
    // MAX PAIN MENSILE
    if (analysis.max_pain_strike) {
      levels.push({
        id: 'm_magnet',
        price: analysis.max_pain_strike,
        simpleLabel: 'MAGNETE',
        technicalTerm: 'Max Pain Monthly',
        icon: <Magnet className="h-5 w-5 text-purple-400" />,
        type: 'pivot',
        color: 'text-purple-400',
        bgColor: 'bg-gradient-to-r from-purple-500/10 to-purple-600/5 border-purple-500/30',
        explanation: `Target per scadenza ${analysis.expiration_date}. Dove le opzioni mensili perdono più valore.`,
        learnMore: 'Il Max Pain mensile è particolarmente importante per i "OPEX Friday" (terzo venerdì del mese), quando scadono le opzioni mensili e il prezzo spesso gravita verso questo livello.'
      });
    }
    
    // BREAKEVEN INFERIORE MENSILE
    if (analysis.atm_strike && analysis.straddle_price) {
      const beDown = analysis.atm_strike - analysis.straddle_price;
      levels.push({
        id: 'm_be_down',
        price: beDown,
        simpleLabel: 'BREAKEVEN ↓',
        technicalTerm: 'Straddle BE Down Monthly',
        icon: <TrendingDown className="h-5 w-5 text-orange-400" />,
        type: 'breakeven',
        color: 'text-orange-400',
        bgColor: 'bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30',
        explanation: `Range inferiore atteso entro ${analysis.expiration_date}.`,
        learnMore: 'Il Breakeven inferiore definisce il limite del range "priced in". Sotto questo, il mercato sta facendo un movimento più grande delle attese.'
      });
    }
    
    // PAVIMENTO MENSILE (Monthly Put Wall)
    if (analysis.put_wall) {
      levels.push({
        id: 'm_floor',
        price: analysis.put_wall,
        simpleLabel: 'PAVIMENTO',
        technicalTerm: 'Put Wall Monthly',
        icon: <Shield className="h-5 w-5 text-green-400" />,
        type: 'support',
        color: 'text-green-400',
        bgColor: 'bg-gradient-to-r from-green-500/10 to-green-600/5 border-green-500/30',
        explanation: `Supporto forte fino a ${analysis.expiration_date}. Strike con massimo OI sulle Put mensili.`,
        learnMore: 'Il "Put Wall" mensile è un supporto molto forte. Spesso rappresenta anche il livello dove gli istituzionali hanno le loro protezioni (hedge).',
        oiOrVolume: analysis.put_wall_oi || undefined
      });
    }
    
    return levels.sort((a, b) => b.price - a.price);
  };

  const getPCRInterpretation = (ratio: number) => {
    if (ratio < 0.7) return { label: 'BULLISH', color: 'text-green-400', bg: 'bg-green-500/20', desc: 'Più Call che Put → ottimismo' };
    if (ratio > 1.0) return { label: 'BEARISH', color: 'text-red-400', bg: 'bg-red-500/20', desc: 'Più Put che Call → pessimismo/protezione' };
    return { label: 'NEUTRO', color: 'text-yellow-400', bg: 'bg-yellow-500/20', desc: 'Equilibrio tra Call e Put' };
  };

  const getGEXInterpretation = (positioning: string) => {
    if (positioning === 'long_gamma') {
      return { 
        label: 'LONG GAMMA', 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/20',
        desc: 'I dealer stabilizzano il mercato',
        detail: 'Comprano sui cali, vendono sui rally → range-bound'
      };
    }
    if (positioning === 'short_gamma') {
      return { 
        label: 'SHORT GAMMA', 
        color: 'text-orange-400', 
        bg: 'bg-orange-500/20',
        desc: 'I dealer amplificano i movimenti',
        detail: 'Vendono sui cali, comprano sui rally → trending'
      };
    }
    return { 
      label: 'NEUTRO', 
      color: 'text-slate-400', 
      bg: 'bg-slate-500/20',
      desc: 'Posizionamento bilanciato',
      detail: 'Nessun effetto dominante'
    };
  };

  // Render levels list
  const renderLevels = (levels: PriceLevel[]) => {
    const spotPrice = analysis?.realtime_price || analysis?.spx_price || 0;
    
    return (
      <div className="space-y-2">
        {levels.map((level) => (
          <div key={level.id}>
            {/* Level Card */}
            <button
              onClick={() => level.type !== 'current' && setExpandedLevel(expandedLevel === level.id ? null : level.id)}
              className={`
                w-full flex items-center justify-between p-3 rounded-xl border transition-all
                ${level.bgColor}
                ${level.type !== 'current' ? 'cursor-pointer hover:brightness-110 active:scale-[0.99]' : 'cursor-default'}
                ${expandedLevel === level.id ? 'ring-1 ring-white/20' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {level.icon}
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${level.color}`}>{level.simpleLabel}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({level.technicalTerm})</span>
                  </div>
                  <div className={`text-lg font-mono font-bold ${level.type === 'current' ? 'text-white' : level.color}`}>
                    {formatNumber(level.price, level.type === 'current' ? 2 : 0)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Distance from current */}
                {level.type !== 'current' && (
                  <div className="text-right mr-2">
                    <div className={`text-sm font-mono ${
                      level.price > spotPrice ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {level.price > spotPrice ? '+' : ''}{((level.price - spotPrice) / spotPrice * 100).toFixed(2)}%
                    </div>
                    {level.oiOrVolume && (
                      <div className="text-[10px] text-slate-500">
                        OI: {formatCompact(level.oiOrVolume)}
                      </div>
                    )}
                  </div>
                )}
                
                {level.type !== 'current' && (
                  expandedLevel === level.id 
                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>
            
            {/* Expanded Explanation */}
            {expandedLevel === level.id && (
              <div className="mx-2 mt-2 mb-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700/50">
                <p className="text-slate-300 text-sm leading-relaxed">
                  {level.explanation}
                </p>
                
                {level.learnMore && (
                  <details className="mt-3">
                    <summary className="text-xs text-purple-400 cursor-pointer hover:text-purple-300 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Approfondisci: cos'è il {level.technicalTerm}?
                    </summary>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed pl-4 border-l-2 border-purple-500/30">
                      {level.learnMore}
                    </p>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Loading
  if (loading && !analysis) {
    return (
      <Card className="bg-slate-900/90 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-400 mr-3" />
          <span className="text-slate-400">Caricamento dati opzioni SPX...</span>
        </CardContent>
      </Card>
    );
  }

  // Error
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

  const dailyLevels = buildDailyLevels();
  const monthlyLevels = buildMonthlyLevels();
  const regime = getMarketRegime();
  const scenario = getTodayScenario();
  const spotPrice = analysis.realtime_price || analysis.spx_price;
  const pcrInfo = getPCRInterpretation(analysis.put_call_ratio_oi);
  const gexInfo = getGEXInterpretation(analysis.dealer_positioning);

  return (
    <Card className="bg-slate-900/90 border-slate-700 overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER - Prezzo e Badge
      ═══════════════════════════════════════════════════════════════ */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-purple-900/30 to-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">S&P 500</div>
              <div className="text-2xl font-bold text-white font-mono">
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
          SEZIONE 1: IL VERDETTO + SCENARIO OGGI
      ═══════════════════════════════════════════════════════════════ */}
      {regime && (
        <div className={`px-4 py-4 bg-gradient-to-r ${regime.color} border-b ${regime.borderColor}`}>
          <div className="flex items-start gap-3">
            {regime.icon}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold">{regime.title}</h3>
                <span className="text-xs text-slate-400">• {regime.subtitle}</span>
              </div>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                {regime.description}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* ═══════════════════════════════════════════════════════════════
          SCENARIO OGGI con Probabilità
      ═══════════════════════════════════════════════════════════════ */}
      {scenario && (
        <div className="px-4 py-4 bg-slate-800/50 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-purple-400" />
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Scenario più probabile oggi</h4>
          </div>
          
          {/* Main Scenario */}
          <div className="mb-4">
            <div className="text-lg font-bold text-white">{scenario.title}</div>
            <p className="text-sm text-slate-400 mt-1">{scenario.description}</p>
            {scenario.target && (
              <p className="text-xs text-purple-400 mt-1">
                <Magnet className="h-3 w-3 inline mr-1" />
                Target: <span className="font-mono font-bold">{formatNumber(scenario.target)}</span>
              </p>
            )}
          </div>
          
          {/* Probability Bars */}
          <div className="space-y-2">
            {/* Range Probability */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Resta nel range ({formatNumber(scenario.rangeLow)} - {formatNumber(scenario.rangeHigh)})</span>
                <span className="text-blue-400 font-bold">{scenario.rangeProb}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${scenario.rangeProb}%` }}
                />
              </div>
            </div>
            
            {/* Up Probability */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  Breakout rialzista (sopra {formatNumber(scenario.rangeHigh)})
                </span>
                <span className="text-green-400 font-bold">{scenario.upProb}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${scenario.upProb}%` }}
                />
              </div>
            </div>
            
            {/* Down Probability */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-400" />
                  Breakout ribassista (sotto {formatNumber(scenario.rangeLow)})
                </span>
                <span className="text-red-400 font-bold">{scenario.downProb}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${scenario.downProb}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Confidence Indicator + Adjustments Info */}
          <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                Affidabilità Analisi
              </span>
              <Badge className={`text-xs ${
                scenario.confidence === 'high' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                scenario.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                scenario.confidence === 'low' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {scenario.confidence === 'high' ? 'ALTA' :
                 scenario.confidence === 'medium' ? 'MEDIA' :
                 scenario.confidence === 'low' ? 'BASSA' : 'MOLTO BASSA'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400">
              {scenario.confidenceReason}
            </p>
            
            {/* Technical adjustments info */}
            <div className="mt-2 pt-2 border-t border-slate-700/30 flex flex-wrap gap-2 text-[9px] text-slate-500">
              {scenario.timeDecayApplied && (
                <span className="flex items-center gap-1 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                  <Clock className="h-2.5 w-2.5 text-cyan-400" />
                  Time decay applicato
                </span>
              )}
              {scenario.gexModifier !== 0 && (
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                  scenario.gexModifier > 0 ? 'bg-blue-500/10' : 'bg-orange-500/10'
                }`}>
                  <Zap className={`h-2.5 w-2.5 ${scenario.gexModifier > 0 ? 'text-blue-400' : 'text-orange-400'}`} />
                  GEX {scenario.gexModifier > 0 ? '+' : ''}{scenario.gexModifier.toFixed(1)}%
                </span>
              )}
              {analysis.vvix && (
                <span className="flex items-center gap-1 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  <Activity className="h-2.5 w-2.5 text-purple-400" />
                  VVIX {analysis.vvix.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          
          {/* Disclaimer */}
          <p className="text-[10px] text-slate-600 mt-3 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            Probabilità stimate da: straddle pricing (con time decay), GEX positioning (scaling continuo), VVIX (confidenza). Non sono previsioni finanziarie.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STRADDLE COMPARISON - 0DTE vs Monthly
      ═══════════════════════════════════════════════════════════════ */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-b border-slate-700/50">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] text-cyan-400 uppercase font-semibold">Oggi (0DTE)</span>
            </div>
            {analysis.straddle_0dte_price ? (
              <>
                <div className="text-xl font-bold text-cyan-400 font-mono">${analysis.straddle_0dte_price.toFixed(0)}</div>
                <div className="text-[10px] text-slate-400">±{analysis.straddle_0dte_implied_move_pct?.toFixed(2)}% range</div>
              </>
            ) : (
              <div className="text-sm text-slate-500">No 0DTE oggi</div>
            )}
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-3 w-3 text-purple-400" />
              <span className="text-[10px] text-purple-400 uppercase font-semibold">Mensile</span>
            </div>
            <div className="text-xl font-bold text-purple-400 font-mono">${analysis.straddle_price?.toFixed(0) || '0'}</div>
            <div className="text-[10px] text-slate-400">±{analysis.implied_move_pct?.toFixed(1)}% fino a {analysis.expiration_date}</div>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {/* ═══════════════════════════════════════════════════════════════
            TABS: Giornalieri vs Mensili
        ═══════════════════════════════════════════════════════════════ */}
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
              <span className="text-purple-400">Mensile ({analysis.expiration_date})</span>
            </TabsTrigger>
          </TabsList>
          
          {/* DAILY TAB */}
          <TabsContent value="daily" className="p-4 mt-0">
            {dailyLevels.length > 1 ? (
              <>
                {/* Reference Price Info */}
                {analysis.daily_reference_price && (
                  <div className="mb-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs flex items-center gap-2">
                    <Info className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-400">Ref (Prev Close): </span>
                    <span className="text-white font-mono font-semibold">
                      {formatNumber(analysis.daily_reference_price, 2)}
                    </span>
                  </div>
                )}
                
                {renderLevels(dailyLevels)}
                
                {/* Daily distances */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Al Pavimento</div>
                    <div className="text-xl font-bold text-green-400 font-mono">
                      {analysis.daily_put_wall 
                        ? `-${((spotPrice - analysis.daily_put_wall) / spotPrice * 100).toFixed(1)}%` 
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Al Tetto</div>
                    <div className="text-xl font-bold text-red-400 font-mono">
                      {analysis.daily_call_wall 
                        ? `+${((analysis.daily_call_wall - spotPrice) / spotPrice * 100).toFixed(1)}%` 
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Nessuna scadenza 0DTE oggi</p>
                <p className="text-xs mt-1">Le opzioni 0DTE SPX scadono ogni giorno di trading</p>
              </div>
            )}
          </TabsContent>
          
          {/* MONTHLY TAB */}
          <TabsContent value="monthly" className="p-4 mt-0">
            {renderLevels(monthlyLevels)}
            
            {/* Monthly distances */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Al Pavimento</div>
                <div className="text-xl font-bold text-green-400 font-mono">
                  {analysis.put_wall 
                    ? `-${((spotPrice - analysis.put_wall) / spotPrice * 100).toFixed(1)}%` 
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500">{formatNumber(analysis.put_wall)}</div>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Al Tetto</div>
                <div className="text-xl font-bold text-red-400 font-mono">
                  {analysis.call_wall 
                    ? `+${((analysis.call_wall - spotPrice) / spotPrice * 100).toFixed(1)}%` 
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500">{formatNumber(analysis.call_wall)}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════
            SEZIONE DATI AVANZATI (Collapsed by default)
        ═══════════════════════════════════════════════════════════════ */}
        <div className="border-t border-slate-700/50">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-slate-800/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-slate-400">
              <Gauge className="h-4 w-4" />
              Dati avanzati
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">GEX • P/C Ratio • Volume • OI</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </div>
          </button>
          
          {showAdvanced && (
            <div className="px-4 pb-4 space-y-4">
              {/* P/C Ratio */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Put/Call Ratio (OI)</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xl font-bold font-mono ${pcrInfo.color}`}>
                        {analysis.put_call_ratio_oi.toFixed(2)}
                      </span>
                      <Badge className={`${pcrInfo.bg} ${pcrInfo.color} text-xs`}>{pcrInfo.label}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{pcrInfo.desc}</p>
                <details className="mt-2">
                  <summary className="text-[10px] text-purple-400 cursor-pointer hover:text-purple-300 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Cos'è il Put/Call Ratio?
                  </summary>
                  <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
                    Rapporto tra Open Interest di Put e Call. Sotto 0.7 = mercato ottimista (più scommesse al rialzo). Sopra 1.0 = mercato pessimista o in cerca di protezione (più Put).
                  </p>
                </details>
              </div>
              
              {/* GEX */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Gamma Exposure (GEX)</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xl font-bold font-mono ${gexInfo.color}`}>
                        {analysis.total_gex >= 0 ? '+' : ''}{formatCompact(analysis.total_gex)}
                      </span>
                      <Badge className={`${gexInfo.bg} ${gexInfo.color} text-xs`}>{gexInfo.label}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{gexInfo.desc}</p>
                <p className="text-[10px] text-slate-500 mt-1">{gexInfo.detail}</p>
                <details className="mt-2">
                  <summary className="text-[10px] text-purple-400 cursor-pointer hover:text-purple-300 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Cos'è il GEX?
                  </summary>
                  <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
                    Il Gamma Exposure misura quanto i market maker devono comprare/vendere il sottostante quando il prezzo si muove. GEX positivo = stabilizzano (comprano sui cali). GEX negativo = amplificano (vendono sui cali).
                  </p>
                </details>
              </div>
              
              {/* Volume & OI */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-slate-500 uppercase">CALL</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Open Interest:</span>
                      <span className="text-green-400 font-mono">{formatCompact(analysis.total_call_oi)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Volume:</span>
                      <span className="text-slate-300 font-mono">{formatCompact(analysis.total_call_volume)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-slate-500 uppercase">PUT</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Open Interest:</span>
                      <span className="text-red-400 font-mono">{formatCompact(analysis.total_put_oi)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Volume:</span>
                      <span className="text-slate-300 font-mono">{formatCompact(analysis.total_put_volume)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Top GEX Levels */}
              {analysis.gex_levels && analysis.gex_levels.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-slate-400" />
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Top GEX Strikes</span>
                  </div>
                  <div className="space-y-1">
                    {analysis.gex_levels.slice(0, 5).map((level, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between py-1.5 px-2 rounded text-xs ${
                          level.type === 'positive' ? 'bg-blue-500/10' : 'bg-orange-500/10'
                        }`}
                      >
                        <span className={level.type === 'positive' ? 'text-blue-400' : 'text-orange-400'}>
                          {level.type === 'positive' ? (
                            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Stabilità</span>
                          ) : (
                            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Volatilità</span>
                          )} @ {formatNumber(level.strike)}
                        </span>
                        <span className={`font-mono ${level.type === 'positive' ? 'text-blue-300' : 'text-orange-300'}`}>
                          {level.gex >= 0 ? '+' : ''}{formatCompact(level.gex)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <details className="mt-2">
                    <summary className="text-[10px] text-purple-400 cursor-pointer hover:text-purple-300 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Come leggere i GEX Strikes?
                    </summary>
                    <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
                      Gli strike con GEX positivo (blu) sono zone dove il prezzo tende a "bloccarsi" - i dealer stabilizzano. Gli strike con GEX negativo (arancio) sono zone dove il prezzo può accelerare - i dealer amplificano.
                    </p>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════ */}
        <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-700/30 flex justify-between items-center">
          <span className="text-[10px] text-slate-600">
            Fonte: Polygon.io • {analysis.contracts_analyzed.toLocaleString()} contratti
          </span>
          <span className="text-[10px] text-slate-600">
            {lastUpdate?.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
