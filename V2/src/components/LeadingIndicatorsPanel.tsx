/**
 * LEADING INDICATORS PANEL V2
 * 
 * Dashboard avanzato per 5 indicatori predittivi
 * Con visual appeal e interpretazione intelligente
 */

import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Target, 
  Shield, 
  Zap, 
  Activity, 
  Building2, 
  ArrowUp, 
  ArrowDown,
  Minus
} from 'lucide-react';

interface LeadingIndicatorsData {
  tga_trend: number;
  rrp_velocity: number;
  credit_stress_index: number;
  repo_spike_risk: number;
  qt_pivot_probability: number;
  overall_signal: 'bullish' | 'bearish' | 'neutral';
}

interface LeadingIndicatorsPanelProps {
  data: LeadingIndicatorsData;
}

export const LeadingIndicatorsPanel: React.FC<LeadingIndicatorsPanelProps> = ({ data }) => {
  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish': return <TrendingUp className="h-5 w-5" />;
      case 'bearish': return <TrendingDown className="h-5 w-5" />;
      default: return <Minus className="h-5 w-5" />;
    }
  };

  const getSignalBg = (signal: string) => {
    switch (signal) {
      case 'bullish': return 'from-green-600/20 to-emerald-600/20 border-green-500/30';
      case 'bearish': return 'from-red-600/20 to-rose-600/20 border-red-500/30';
      default: return 'from-yellow-600/20 to-amber-600/20 border-yellow-500/30';
    }
  };

  const getRiskColor = (value: number, thresholds: { low: number; high: number }) => {
    if (value <= thresholds.low) return 'text-green-400';
    if (value <= thresholds.high) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskIcon = (value: number, thresholds: { low: number; high: number }) => {
    if (value <= thresholds.low) return <CheckCircle className="h-4 w-4" />;
    if (value <= thresholds.high) return <AlertCircle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          Leading Indicators V2
        </h3>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${getSignalBg(data.overall_signal)} border`}>
          <div className={getSignalColor(data.overall_signal)}>
            {getSignalIcon(data.overall_signal)}
          </div>
          <span className={`font-semibold ${getSignalColor(data.overall_signal)}`}>
            {data.overall_signal.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* QT Pivot Probability */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-slate-300">QT Pivot Probability</span>
            </div>
            {getRiskIcon(data.qt_pivot_probability, { low: 30, high: 60 })}
          </div>
          <div className={`text-2xl font-bold ${getRiskColor(data.qt_pivot_probability, { low: 30, high: 60 })}`}>
            {data.qt_pivot_probability}%
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-1000"
              style={{ width: `${Math.min(data.qt_pivot_probability, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {data.qt_pivot_probability < 30 && "Low probability of policy pivot"}
            {data.qt_pivot_probability >= 30 && data.qt_pivot_probability < 60 && "Moderate pivot risk"}
            {data.qt_pivot_probability >= 60 && "High probability of policy change"}
          </p>
        </div>

        {/* Credit Stress Index */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-medium text-slate-300">Credit Stress Index</span>
            </div>
            {getRiskIcon(data.credit_stress_index, { low: 20, high: 50 })}
          </div>
          <div className={`text-2xl font-bold ${getRiskColor(data.credit_stress_index, { low: 20, high: 50 })}`}>
            {data.credit_stress_index}%
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-1000"
              style={{ width: `${Math.min(data.credit_stress_index, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {data.credit_stress_index < 20 && "Low credit stress"}
            {data.credit_stress_index >= 20 && data.credit_stress_index < 50 && "Moderate stress levels"}
            {data.credit_stress_index >= 50 && "High credit stress"}
          </p>
        </div>

        {/* Repo Spike Risk */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-300">Repo Spike Risk</span>
            </div>
            {getRiskIcon(data.repo_spike_risk, { low: 0, high: 30 })}
          </div>
          <div className={`text-2xl font-bold ${getRiskColor(data.repo_spike_risk, { low: 0, high: 30 })}`}>
            {data.repo_spike_risk}%
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-1000"
              style={{ width: `${Math.min(data.repo_spike_risk, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {data.repo_spike_risk === 0 && "Stable repo conditions"}
            {data.repo_spike_risk > 0 && data.repo_spike_risk < 30 && "Elevated repo risk"}
            {data.repo_spike_risk >= 30 && "High repo volatility risk"}
          </p>
        </div>

        {/* RRP Velocity */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-slate-300">RRP Velocity</span>
            </div>
            <div className={`${Math.abs(data.rrp_velocity) < 0.1 ? 'text-green-400' : 'text-yellow-400'}`}>
              {Math.abs(data.rrp_velocity) < 0.1 ? <CheckCircle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            </div>
          </div>
          <div className={`text-2xl font-bold ${Math.abs(data.rrp_velocity) < 0.1 ? 'text-green-400' : 'text-yellow-400'}`}>
            {data.rrp_velocity.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            {data.rrp_velocity > 0.1 && <ArrowUp className="h-4 w-4 text-red-400" />}
            {data.rrp_velocity < -0.1 && <ArrowDown className="h-4 w-4 text-green-400" />}
            {Math.abs(data.rrp_velocity) <= 0.1 && <Minus className="h-4 w-4 text-gray-400" />}
            <span className="text-xs text-slate-400">
              {Math.abs(data.rrp_velocity) < 0.1 && "Stable drainage"}
              {data.rrp_velocity >= 0.1 && "Active drainage"}
              {data.rrp_velocity <= -0.1 && "Reverse flow"}
            </span>
          </div>
        </div>

        {/* TGA Trend */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium text-slate-300">TGA Trend</span>
            </div>
            <div className={`${Math.abs(data.tga_trend) < 10 ? 'text-green-400' : 'text-yellow-400'}`}>
              {Math.abs(data.tga_trend) < 10 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            </div>
          </div>
          <div className={`text-2xl font-bold ${Math.abs(data.tga_trend) < 10 ? 'text-green-400' : 'text-yellow-400'}`}>
            {data.tga_trend.toFixed(1)}B
          </div>
          <div className="flex items-center gap-1 mt-2">
            {data.tga_trend > 10 && <ArrowUp className="h-4 w-4 text-red-400" />}
            {data.tga_trend < -10 && <ArrowDown className="h-4 w-4 text-green-400" />}
            {Math.abs(data.tga_trend) <= 10 && <Minus className="h-4 w-4 text-gray-400" />}
            <span className="text-xs text-slate-400">
              {Math.abs(data.tga_trend) < 10 && "Neutral impact"}
              {data.tga_trend >= 10 && "Liquidity drain"}
              {data.tga_trend <= -10 && "Liquidity injection"}
            </span>
          </div>
        </div>

        {/* Overall Assessment */}
        <div className={`bg-gradient-to-r ${getSignalBg(data.overall_signal)} border rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Overall Assessment</span>
          </div>
          <div className={`text-lg font-bold ${getSignalColor(data.overall_signal)} mb-2`}>
            {data.overall_signal.toUpperCase()} SIGNAL
          </div>
          <p className="text-xs text-slate-300">
            {data.overall_signal === 'bullish' && "Multiple indicators suggest improving liquidity conditions. Favorable environment for risk assets."}
            {data.overall_signal === 'bearish' && "Multiple indicators suggest tightening liquidity conditions. Caution advised for risk positioning."}
            {data.overall_signal === 'neutral' && "Mixed signals across indicators. Market conditions remain uncertain with balanced risks."}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-slate-600">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-400">
              {[data.qt_pivot_probability < 30, data.credit_stress_index < 20, data.repo_spike_risk === 0, Math.abs(data.rrp_velocity) < 0.1, Math.abs(data.tga_trend) < 10].filter(Boolean).length}
            </div>
            <div className="text-xs text-slate-400">Positive Signals</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-400">
              {[data.qt_pivot_probability >= 30 && data.qt_pivot_probability < 60, data.credit_stress_index >= 20 && data.credit_stress_index < 50, data.repo_spike_risk > 0 && data.repo_spike_risk < 30, Math.abs(data.rrp_velocity) >= 0.1, Math.abs(data.tga_trend) >= 10].filter(Boolean).length}
            </div>
            <div className="text-xs text-slate-400">Neutral Signals</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-400">
              {[data.qt_pivot_probability >= 60, data.credit_stress_index >= 50, data.repo_spike_risk >= 30].filter(Boolean).length}
            </div>
            <div className="text-xs text-slate-400">Warning Signals</div>
          </div>
        </div>
      </div>
    </div>
  );
};