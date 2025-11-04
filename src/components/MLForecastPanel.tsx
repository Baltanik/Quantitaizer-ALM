import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  AlertTriangle,
  Clock,
  BarChart3,
  Activity
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

interface MLPrediction {
  id: number;
  date: string;
  model_version: string;
  prediction_horizon: number;
  predicted_score: number;
  predicted_scenario: string;
  confidence: number;
  scenario_change_probability: number;
  direction_probability: number;
  created_at: string;
}

interface PatternAnalysis {
  id: number;
  date: string;
  regime: string;
  regime_confidence: number;
  detected_cycles: number;
  anomalies: any[];
  similar_patterns: any[];
  created_at: string;
}

interface MLForecastData {
  prediction: MLPrediction | null;
  patternAnalysis: PatternAnalysis | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * ML Forecast Panel - Visualizza predizioni e pattern analysis
 * Componente principale per la Fase 2 ML
 */
export const MLForecastPanel: React.FC = () => {
  const [data, setData] = useState<MLForecastData>({
    prediction: null,
    patternAnalysis: null,
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  // supabase client already imported

  useEffect(() => {
    fetchMLData();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('ml_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ml_predictions' },
        () => fetchMLData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pattern_analysis' },
        () => fetchMLData()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMLData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch latest ML prediction
      const { data: predictionData, error: predError } = await supabase
        .from('ml_predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Fetch latest pattern analysis
      const { data: patternData, error: patternError } = await supabase
        .from('pattern_analysis')
        .select('*')
        .eq('analysis_type', 'REGIME')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (predError && predError.code !== 'PGRST116') {
        throw new Error(`Prediction fetch error: ${predError.message}`);
      }

      if (patternError && patternError.code !== 'PGRST116') {
        throw new Error(`Pattern analysis fetch error: ${patternError.message}`);
      }

      setData({
        prediction: predictionData || null,
        patternAnalysis: patternData || null,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching ML data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const triggerMLInference = async () => {
    try {
      const response = await fetch('https://tolaojeqjcoskegelule.supabase.co/functions/v1/ml-inference', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTI1MzksImV4cCI6MjA3NzU4ODUzOX0.8iJ8SHDG5Ffdu5X8ZF6-QSiyIz9iTXKm8uaLXQt_2OI`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('ML Inference triggered:', result);
      
      // Refresh data after inference
      setTimeout(fetchMLData, 2000);
      
    } catch (error) {
      console.error('Error triggering ML inference:', error);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRegimeColor = (regime: string): string => {
    switch (regime) {
      case 'ABUNDANT': return 'bg-green-500';
      case 'ADEQUATE': return 'bg-blue-500';
      case 'SCARCE': return 'bg-orange-500';
      case 'CRISIS': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getScenarioIcon = (scenario: string) => {
    if (scenario?.includes('QE')) return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (scenario?.includes('QT')) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Activity className="h-4 w-4 text-blue-400" />;
  };

  if (data.isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Brain className="h-5 w-5 text-purple-400" />
            ML Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            <span className="ml-3 text-slate-300">Loading ML predictions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error) {
    return (
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Brain className="h-5 w-5 text-purple-400" />
            ML Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {data.error}
            </AlertDescription>
          </Alert>
          <button 
            onClick={fetchMLData}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Brain className="h-5 w-5 text-purple-400" />
              ML Forecast
            </CardTitle>
            <CardDescription className="text-slate-400">
              AI-powered predictions and pattern analysis
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {data.lastUpdated && (
              <span className="text-xs text-slate-500">
                Updated {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={triggerMLInference}
              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              title="Trigger ML Inference"
            >
              <Zap className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="prediction" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700">
            <TabsTrigger value="prediction" className="data-[state=active]:bg-slate-600">
              Prediction
            </TabsTrigger>
            <TabsTrigger value="patterns" className="data-[state=active]:bg-slate-600">
              Patterns
            </TabsTrigger>
            <TabsTrigger value="regime" className="data-[state=active]:bg-slate-600">
              Regime
            </TabsTrigger>
          </TabsList>

          {/* Prediction Tab */}
          <TabsContent value="prediction" className="space-y-4">
            {data.prediction ? (
              <>
                {/* Main Prediction */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">7-Day Forecast</h3>
                    <Badge variant="outline" className="border-purple-400 text-purple-300">
                      {data.prediction.model_version}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Predicted Score */}
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getScoreColor(data.prediction.predicted_score)}`}>
                        {data.prediction.predicted_score}
                      </div>
                      <div className="text-sm text-slate-400">Predicted Score</div>
                      <Progress 
                        value={data.prediction.predicted_score} 
                        className="mt-2 h-2"
                      />
                    </div>

                    {/* Confidence */}
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400">
                        {Math.round(data.prediction.confidence * 100)}%
                      </div>
                      <div className="text-sm text-slate-400">Confidence</div>
                      <Progress 
                        value={data.prediction.confidence * 100} 
                        className="mt-2 h-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Scenario Prediction */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {getScenarioIcon(data.prediction.predicted_scenario)}
                    <h3 className="text-lg font-semibold text-white">Scenario Forecast</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Predicted Scenario:</span>
                      <Badge className="bg-blue-600">
                        {data.prediction.predicted_scenario}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Change Probability:</span>
                      <span className="text-orange-400 font-semibold">
                        {Math.round(data.prediction.scenario_change_probability * 100)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Direction Bias:</span>
                      <div className="flex items-center gap-1">
                        {data.prediction.direction_probability > 0.5 ? (
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                        <span className="text-white font-semibold">
                          {Math.round(data.prediction.direction_probability * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prediction Metadata */}
                <div className="text-xs text-slate-500 flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Horizon: {data.prediction.prediction_horizon} days
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Generated: {new Date(data.prediction.created_at).toLocaleString()}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No ML predictions available</p>
                <button
                  onClick={triggerMLInference}
                  className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Generate Prediction
                </button>
              </div>
            )}
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            {data.patternAnalysis ? (
              <>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Pattern Detection</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-400">
                        {data.patternAnalysis.detected_cycles}
                      </div>
                      <div className="text-sm text-slate-400">Policy Cycles</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {data.patternAnalysis.anomalies?.length || 0}
                      </div>
                      <div className="text-sm text-slate-400">Anomalies</div>
                    </div>
                  </div>
                </div>

                {data.patternAnalysis.similar_patterns && data.patternAnalysis.similar_patterns.length > 0 && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Similar Patterns</h3>
                    <div className="space-y-2">
                      {data.patternAnalysis.similar_patterns.slice(0, 3).map((pattern: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-slate-300">{pattern.pattern}</span>
                          <Badge variant="outline" className="border-cyan-400 text-cyan-300">
                            {pattern.confidence}% match
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pattern analysis available</p>
              </div>
            )}
          </TabsContent>

          {/* Regime Tab */}
          <TabsContent value="regime" className="space-y-4">
            {data.patternAnalysis ? (
              <>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Current Regime</h3>
                  
                  <div className="flex items-center justify-center mb-4">
                    <div className="text-center">
                      <Badge 
                        className={`${getRegimeColor(data.patternAnalysis.regime)} text-white text-lg px-4 py-2`}
                      >
                        {data.patternAnalysis.regime}
                      </Badge>
                      <div className="text-sm text-slate-400 mt-2">
                        {Math.round(data.patternAnalysis.regime_confidence)}% confidence
                      </div>
                    </div>
                  </div>

                  <Progress 
                    value={data.patternAnalysis.regime_confidence} 
                    className="h-3"
                  />
                </div>

                {/* Regime Characteristics */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Regime Characteristics</h3>
                  
                  <div className="space-y-2 text-sm">
                    {data.patternAnalysis.regime === 'ABUNDANT' && (
                      <div className="text-green-300">
                        • High liquidity conditions
                        • Low market stress
                        • Supportive Fed policy
                      </div>
                    )}
                    {data.patternAnalysis.regime === 'ADEQUATE' && (
                      <div className="text-blue-300">
                        • Normal liquidity conditions
                        • Moderate market stress
                        • Neutral Fed stance
                      </div>
                    )}
                    {data.patternAnalysis.regime === 'SCARCE' && (
                      <div className="text-orange-300">
                        • Tightening liquidity
                        • Elevated market stress
                        • Restrictive Fed policy
                      </div>
                    )}
                    {data.patternAnalysis.regime === 'CRISIS' && (
                      <div className="text-red-300">
                        • Severe liquidity stress
                        • High market volatility
                        • Emergency Fed measures likely
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No regime analysis available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
