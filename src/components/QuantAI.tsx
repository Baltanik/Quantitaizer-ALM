/**
 * QuantAI - Componente visivo per l'analisi AI
 * 
 * Collapsible card con sfera animata.
 * GPT-5.1 ogni 8:00 e 16:00 CET + alert.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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

// Pulisce il markdown (rimuove ** e altri caratteri)
function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')  // Rimuove **bold**
    .replace(/\*/g, '')    // Rimuove *italic*
    .replace(/`/g, '')     // Rimuove `code`
    .trim();
}

// Estrae paragrafi puliti dal summary
function extractParagraphs(text: string): string[] {
  if (!text) return [];
  
  const cleaned = cleanMarkdown(text);
  
  // Splitta per bullet points (•, -, *)
  const lines = cleaned.split(/(?:^|\n)\s*[•\-\*]\s*/);
  
  // Filtra linee vuote e pulisci
  return lines
    .map(line => line.trim())
    .filter(line => line.length > 10);
}

// Estrae opportunità e rischi dalle implications
function extractImplications(text: string): { opportunities: string[]; risks: string[] } {
  if (!text) return { opportunities: [], risks: [] };
  
  const cleaned = cleanMarkdown(text);
  const opportunities: string[] = [];
  const risks: string[] = [];
  
  // Trova sezione OPPORTUNITÀ
  const oppMatch = cleaned.match(/OPPORTUNIT[ÀA]:\s*([\s\S]*?)(?=RISCHI:|$)/i);
  if (oppMatch) {
    oppMatch[1].split(/(?:^|\n)\s*[•\-\*]\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .forEach(s => opportunities.push(s));
  }
  
  // Trova sezione RISCHI
  const riskMatch = cleaned.match(/RISCHI:\s*([\s\S]*?)$/i);
  if (riskMatch) {
    riskMatch[1].split(/(?:^|\n)\s*[•\-\*]\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .forEach(s => risks.push(s));
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
          particleColor: '#10b981',
          borderColor: 'border-emerald-500/30',
          icon: TrendingUp,
          label: 'BULLISH',
        };
      case 'bearish':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500',
          particleColor: '#ef4444',
          borderColor: 'border-red-500/30',
          icon: TrendingDown,
          label: 'BEARISH',
        };
      default:
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500',
          particleColor: '#f59e0b',
          borderColor: 'border-amber-500/30',
          icon: Minus,
          label: 'CAUTO',
        };
    }
  };

  const sentimentConfig = analysis ? getSentimentConfig(analysis.sentiment) : getSentimentConfig('cauto');
  const SentimentIcon = sentimentConfig.icon;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // Parse dei dati
  const summaryParagraphs = analysis ? extractParagraphs(analysis.summary) : [];
  const { opportunities, risks } = analysis ? extractImplications(analysis.implications) : { opportunities: [], risks: [] };
  
  // Preview per quando chiuso
  const previewText = summaryParagraphs[0] || cleanMarkdown(analysis?.summary || '').substring(0, 120) + '...';

  return (
    <Card 
      className={`
        relative overflow-hidden 
        bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
        ${sentimentConfig.borderColor} border
        hover:border-opacity-60 
        transition-all duration-300 cursor-pointer
      `}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardContent className="relative z-10 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mini Sfera */}
            <div 
              className={`
                w-10 h-10 rounded-full 
                ${sentimentConfig.bgColor}/20 
                flex items-center justify-center
                animate-pulse
              `}
              style={{ boxShadow: `0 0 15px ${sentimentConfig.particleColor}30` }}
            >
              <Sparkles className={`w-4 h-4 ${sentimentConfig.color}`} />
            </div>

            {/* Titolo */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  QuantAI
                </h3>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${sentimentConfig.color} border-current/30 bg-current/10 px-2 py-0`}
                >
                  <SentimentIcon className="w-3 h-3 mr-1" />
                  {sentimentConfig.label}
                </Badge>
                {analysis?.is_alert && (
                  <Badge variant="destructive" className="text-xs px-2 py-0">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    ALERT
                  </Badge>
                )}
              </div>
              {analysis && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatTime(analysis.created_at)}
                  <span className="text-slate-600">•</span>
                  <span className="uppercase text-slate-400">{analysis.scenario}</span>
                </div>
              )}
            </div>
          </div>

          {/* Expand/Collapse */}
          <div className={`p-1.5 rounded-lg ${sentimentConfig.color}`}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {/* Preview quando chiuso */}
        {!isExpanded && analysis && (
          <p className="mt-3 text-sm text-slate-400 line-clamp-2">
            {previewText}
          </p>
        )}

        {/* Contenuto espanso */}
        {isExpanded && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200" onClick={e => e.stopPropagation()}>
            
            {/* Alert banner */}
            {analysis?.is_alert && analysis?.alert_reason && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-300">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  <strong>Trigger:</strong> {analysis.alert_reason}
                </p>
              </div>
            )}

            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-700/50 rounded w-full" />
                <div className="h-4 bg-slate-700/50 rounded w-5/6" />
                <div className="h-4 bg-slate-700/50 rounded w-4/6" />
              </div>
            ) : analysis ? (
              <>
                {/* ANALISI - testo fluido */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">📊 Analisi</h4>
                  <div className="space-y-3">
                    {summaryParagraphs.map((para, i) => (
                      <p key={i} className="text-sm text-slate-200 leading-relaxed">
                        {para}
                      </p>
                    ))}
                  </div>
                </div>

                {/* OPPORTUNITÀ E RISCHI - side by side */}
                {(opportunities.length > 0 || risks.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {opportunities.length > 0 && (
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <h4 className="text-xs font-semibold text-emerald-400 uppercase mb-2">✅ Opportunità</h4>
                        <div className="space-y-2">
                          {opportunities.map((opp, i) => (
                            <p key={i} className="text-sm text-slate-300 leading-relaxed">
                              {opp}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {risks.length > 0 && (
                      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <h4 className="text-xs font-semibold text-red-400 uppercase mb-2">⚠️ Rischi</h4>
                        <div className="space-y-2">
                          {risks.map((risk, i) => (
                            <p key={i} className="text-sm text-slate-300 leading-relaxed">
                              {risk}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* FOCUS POINTS */}
                {analysis.focus_points && analysis.focus_points.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-xs text-slate-500">🎯 Focus:</span>
                    {analysis.focus_points.map((point, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="text-xs bg-slate-800/50 border-slate-600/30 text-slate-300"
                      >
                        {point}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-400">Nessuna analisi disponibile</p>
                <p className="text-xs text-slate-500 mt-2">L'analisi verrà generata automaticamente alle 8:00 o 16:00</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between text-xs text-slate-500">
              <span>Prossimo: {getNextUpdate()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default QuantAI;
