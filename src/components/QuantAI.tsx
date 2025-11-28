/**
 * QuantAI - Componente visivo per l'analisi AI
 * 
 * Sfera quantistica animata con orbite rotanti.
 * GPT-5.1 ogni 8:00 e 16:00 CET + alert.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertTriangle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QuantAIAnalysis {
  id: string;
  created_at: string;
  analysis_date: string;
  summary: string;
  implications: string;
  sentiment: 'bullish' | 'cauto' | 'bearish';
  focus_points: string[];
  scenario: string;
  is_alert?: boolean;
  alert_reason?: string;
}

// Pulisce il markdown
function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').trim();
}

// Estrae paragrafi
function extractParagraphs(text: string): string[] {
  if (!text) return [];
  const cleaned = cleanMarkdown(text);
  const lines = cleaned.split(/(?:^|\n)\s*[•\-\*]\s*/);
  return lines.map(line => line.trim()).filter(line => line.length > 10);
}

// Estrae opportunità e rischi
function extractImplications(text: string): { opportunities: string[]; risks: string[] } {
  if (!text) return { opportunities: [], risks: [] };
  const cleaned = cleanMarkdown(text);
  const opportunities: string[] = [];
  const risks: string[] = [];
  
  const oppMatch = cleaned.match(/OPPORTUNIT[ÀA]:\s*([\s\S]*?)(?=RISCHI:|$)/i);
  if (oppMatch) {
    oppMatch[1].split(/(?:^|\n)\s*[•\-\*]\s*/).map(s => s.trim()).filter(s => s.length > 10).forEach(s => opportunities.push(s));
  }
  
  const riskMatch = cleaned.match(/RISCHI:\s*([\s\S]*?)$/i);
  if (riskMatch) {
    riskMatch[1].split(/(?:^|\n)\s*[•\-\*]\s*/).map(s => s.trim()).filter(s => s.length > 10).forEach(s => risks.push(s));
  }
  
  return { opportunities, risks };
}

export function QuantAI() {
  const [analysis, setAnalysis] = useState<QuantAIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchLatestAnalysis();
  }, []);

  const fetchLatestAnalysis = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('quantai_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching QuantAI analysis:', error);
      }
      
      setAnalysis(data as QuantAIAnalysis | null);
    } catch (err) {
      console.error('QuantAI fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentConfig = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500',
          glowColor: 'rgba(16, 185, 129, 0.4)',
          particleColor: '#10b981',
          borderColor: 'border-emerald-500/40',
          shadowColor: 'shadow-emerald-500/20',
          icon: TrendingUp,
          label: 'BULLISH',
        };
      case 'bearish':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500',
          glowColor: 'rgba(239, 68, 68, 0.4)',
          particleColor: '#ef4444',
          borderColor: 'border-red-500/40',
          shadowColor: 'shadow-red-500/20',
          icon: TrendingDown,
          label: 'BEARISH',
        };
      default:
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500',
          glowColor: 'rgba(245, 158, 11, 0.4)',
          particleColor: '#f59e0b',
          borderColor: 'border-amber-500/40',
          shadowColor: 'shadow-amber-500/20',
          icon: Minus,
          label: 'CAUTO',
        };
    }
  };

  const sentimentConfig = analysis ? getSentimentConfig(analysis.sentiment) : getSentimentConfig('cauto');
  const SentimentIcon = sentimentConfig.icon;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getNextUpdate = () => {
    const now = new Date();
    const hours = now.getUTCHours();
    const slots = [7, 15];
    for (const slot of slots) {
      if (hours < slot) {
        const next = new Date(now);
        next.setUTCHours(slot, 0, 0, 0);
        return next.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      }
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(7, 0, 0, 0);
    return 'Domani 08:00';
  };

  const summaryParagraphs = analysis ? extractParagraphs(analysis.summary) : [];
  const { opportunities, risks } = analysis ? extractImplications(analysis.implications) : { opportunities: [], risks: [] };

  // Inline styles for animations
  const orbitalStyles = `
    @keyframes orbit1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes orbit2 { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
    @keyframes orbit3 { from { transform: rotate(180deg); } to { transform: rotate(540deg); } }
    @keyframes pulse-core { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.15); opacity: 1; } }
    @keyframes float-particle { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-8px) translateX(4px); } }
    @keyframes energy-flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
  `;

  return (
    <>
      <style>{orbitalStyles}</style>
      <Card 
        className={`
          relative overflow-hidden cursor-pointer
          bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950
          ${sentimentConfig.borderColor} border-2
          ${sentimentConfig.shadowColor} shadow-lg
          transition-all duration-500 hover:shadow-xl
        `}
        style={{
          animation: 'breathe 4s ease-in-out infinite',
          boxShadow: `0 0 30px ${sentimentConfig.glowColor}, inset 0 0 60px rgba(0,0,0,0.5)`,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Background Energy Effect */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, ${sentimentConfig.glowColor} 0%, transparent 70%)`,
          }}
        />
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${sentimentConfig.bgColor}`}
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animation: `float-particle ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        <CardContent className="relative z-10 p-6">
          
          {/* === STATO CHIUSO: Focus sulla Sfera === */}
          {!isExpanded && (
            <div className="flex flex-col items-center py-4">
              {/* Quantum Sphere - Grande e Centrale */}
              <div className="relative w-32 h-32 mb-6">
                {/* Orbita 1 - Esterna */}
                <div 
                  className="absolute inset-0 rounded-full border border-dashed"
                  style={{
                    borderColor: `${sentimentConfig.particleColor}40`,
                    animation: 'orbit1 8s linear infinite',
                  }}
                >
                  <div 
                    className={`absolute w-2 h-2 rounded-full ${sentimentConfig.bgColor}`}
                    style={{ top: '0%', left: '50%', transform: 'translateX(-50%)', boxShadow: `0 0 8px ${sentimentConfig.particleColor}` }}
                  />
                </div>

                {/* Orbita 2 - Media */}
                <div 
                  className="absolute inset-4 rounded-full border"
                  style={{
                    borderColor: `${sentimentConfig.particleColor}60`,
                    animation: 'orbit2 6s linear infinite',
                  }}
                >
                  <div 
                    className={`absolute w-2.5 h-2.5 rounded-full ${sentimentConfig.bgColor}`}
                    style={{ top: '0%', left: '50%', transform: 'translateX(-50%)', boxShadow: `0 0 10px ${sentimentConfig.particleColor}` }}
                  />
                  <div 
                    className={`absolute w-1.5 h-1.5 rounded-full ${sentimentConfig.bgColor}`}
                    style={{ bottom: '0%', left: '50%', transform: 'translateX(-50%)', boxShadow: `0 0 6px ${sentimentConfig.particleColor}` }}
                  />
                </div>

                {/* Orbita 3 - Interna */}
                <div 
                  className="absolute inset-8 rounded-full border border-dotted"
                  style={{
                    borderColor: `${sentimentConfig.particleColor}80`,
                    animation: 'orbit3 4s linear infinite',
                  }}
                >
                  <div 
                    className={`absolute w-1.5 h-1.5 rounded-full ${sentimentConfig.bgColor}`}
                    style={{ top: '50%', right: '0%', transform: 'translateY(-50%)', boxShadow: `0 0 8px ${sentimentConfig.particleColor}` }}
                  />
                </div>

                {/* Core Centrale */}
                <div 
                  className={`absolute inset-10 rounded-full ${sentimentConfig.bgColor} flex items-center justify-center`}
                  style={{
                    animation: 'pulse-core 2s ease-in-out infinite',
                    boxShadow: `0 0 40px ${sentimentConfig.particleColor}, 0 0 80px ${sentimentConfig.glowColor}`,
                  }}
                >
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Info Badge - Sotto la Sfera */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    QuantAI
                  </span>
                  {analysis?.is_alert && (
                    <Badge variant="destructive" className="animate-pulse">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      ALERT
                    </Badge>
                  )}
                </div>
                
                <Badge 
                  className={`text-sm px-4 py-1 ${sentimentConfig.bgColor} text-white font-bold`}
                  style={{ boxShadow: `0 0 15px ${sentimentConfig.glowColor}` }}
                >
                  <SentimentIcon className="w-4 h-4 mr-2" />
                  {sentimentConfig.label}
                </Badge>

                {analysis && (
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                    <span className="uppercase font-medium">{analysis.scenario}</span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(analysis.created_at)}
                    </span>
                  </div>
                )}

                {/* Expand hint */}
                <div className={`mt-4 flex items-center gap-1 text-xs ${sentimentConfig.color} animate-bounce`}>
                  <ChevronDown className="w-4 h-4" />
                  <span>Espandi analisi</span>
                </div>
              </div>
            </div>
          )}

          {/* === STATO APERTO: Contenuto Testuale === */}
          {isExpanded && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Header compatto */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Mini Sfera */}
                  <div 
                    className={`w-10 h-10 rounded-full ${sentimentConfig.bgColor}/30 flex items-center justify-center`}
                    style={{ boxShadow: `0 0 15px ${sentimentConfig.glowColor}` }}
                  >
                    <Zap className={`w-5 h-5 ${sentimentConfig.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">QuantAI</span>
                      <Badge variant="outline" className={`text-xs ${sentimentConfig.color} border-current/30`}>
                        {sentimentConfig.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {analysis && formatTime(analysis.created_at)} • {analysis?.scenario?.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${sentimentConfig.color}`}>
                  <ChevronUp className="w-5 h-5" />
                </div>
              </div>

              {/* Alert Banner */}
              {analysis?.is_alert && analysis?.alert_reason && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                  <p className="text-sm text-red-300">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    <strong>Alert:</strong> {analysis.alert_reason}
                  </p>
                </div>
              )}

              {/* Content */}
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-700/50 rounded w-full" />
                  <div className="h-4 bg-slate-700/50 rounded w-5/6" />
                  <div className="h-4 bg-slate-700/50 rounded w-4/6" />
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/30">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">📊 Analisi</h4>
                    <div className="space-y-2">
                      {summaryParagraphs.map((para, i) => (
                        <p key={i} className="text-sm text-slate-200 leading-relaxed">{para}</p>
                      ))}
                    </div>
                  </div>

                  {/* Opportunities & Risks */}
                  {(opportunities.length > 0 || risks.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {opportunities.length > 0 && (
                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                          <h4 className="text-xs font-semibold text-emerald-400 uppercase mb-2">✅ Opportunità</h4>
                          <div className="space-y-2">
                            {opportunities.map((opp, i) => (
                              <p key={i} className="text-sm text-slate-300 leading-relaxed">{opp}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {risks.length > 0 && (
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                          <h4 className="text-xs font-semibold text-red-400 uppercase mb-2">⚠️ Rischi</h4>
                          <div className="space-y-2">
                            {risks.map((risk, i) => (
                              <p key={i} className="text-sm text-slate-300 leading-relaxed">{risk}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Focus Points */}
                  {analysis.focus_points?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="text-xs text-slate-500">🎯 Focus:</span>
                      {analysis.focus_points.map((point, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-slate-800/50 border-slate-600/30 text-slate-300">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-400">Nessuna analisi disponibile</p>
                  <p className="text-xs text-slate-500 mt-2">Prossimo update: {getNextUpdate()}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center justify-between text-xs text-slate-500">
                <span>Prossimo: {getNextUpdate()}</span>

              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default QuantAI;
