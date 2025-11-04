/**
 * LIQUIDITY SCORE METER V2
 * 
 * Gauge professionale 0-100 con visual appeal
 * Mostra score, grade, trend, confidence
 */

import React from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';

interface LiquidityScoreMeterProps {
  score: number;
  grade: string;
  trend: string;
  confidence: number;
  components?: {
    balanceSheet: number;
    reserves: number;
    stress: number;
    momentum: number;
  };
}

export const LiquidityScoreMeter: React.FC<LiquidityScoreMeterProps> = ({
  score,
  grade,
  trend,
  confidence,
  components
}) => {
  // Color mapping based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    if (score >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-blue-500 to-blue-600';
    if (score >= 40) return 'from-yellow-500 to-yellow-600';
    if (score >= 20) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-5 w-5 text-green-400" />;
      case 'down': return <TrendingDown className="h-5 w-5 text-red-400" />;
      default: return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getGradeEmoji = (grade: string) => {
    switch (grade) {
      case 'A': return '🟢';
      case 'B': return '🔵';
      case 'C': return '🟡';
      case 'D': return '🟠';
      case 'F': return '🔴';
      default: return '⚪';
    }
  };

  // Calculate gauge rotation (0-180 degrees)
  const gaugeRotation = (score / 100) * 180;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Gauge className="h-5 w-5 text-blue-400" />
          Liquidity Score V2
        </h3>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className="text-sm text-slate-400">{trend}</span>
        </div>
      </div>

      {/* Main Gauge */}
      <div className="relative flex justify-center mb-6">
        <div className="relative w-48 h-24 overflow-hidden">
          {/* Background Arc */}
          <div className="absolute inset-0">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <path
                d="M 20 80 A 80 80 0 0 1 180 80"
                fill="none"
                stroke="rgb(51 65 85)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Score Arc */}
              <path
                d="M 20 80 A 80 80 0 0 1 180 80"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" className="stop-red-500" />
                  <stop offset="25%" className="stop-orange-500" />
                  <stop offset="50%" className="stop-yellow-500" />
                  <stop offset="75%" className="stop-blue-500" />
                  <stop offset="100%" className="stop-green-500" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          {/* Needle */}
          <div 
            className="absolute bottom-0 left-1/2 w-1 h-20 bg-white rounded-full origin-bottom transition-transform duration-1000 ease-out"
            style={{ 
              transform: `translateX(-50%) rotate(${gaugeRotation - 90}deg)`,
              transformOrigin: 'bottom center'
            }}
          />
          
          {/* Center Dot */}
          <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-white rounded-full transform -translate-x-1/2 translate-y-1/2" />
        </div>
      </div>

      {/* Score Display */}
      <div className="text-center mb-4">
        <div className={`text-4xl font-bold ${getScoreColor(score)} mb-1`}>
          {score}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{getGradeEmoji(grade)}</span>
          <span className="text-lg font-semibold text-white">Grade {grade}</span>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-slate-400">Confidence</span>
          <span className="text-sm font-medium text-white">{confidence}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full bg-gradient-to-r ${getScoreGradient(confidence)} transition-all duration-1000`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Components Breakdown */}
      {components && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-1">
            <Target className="h-4 w-4" />
            Components
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Balance Sheet:</span>
              <span className="text-white font-medium">{components.balanceSheet}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reserves:</span>
              <span className="text-white font-medium">{components.reserves}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Market Stress:</span>
              <span className="text-white font-medium">{components.stress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Momentum:</span>
              <span className="text-white font-medium">{components.momentum}</span>
            </div>
          </div>
        </div>
      )}

      {/* Interpretation */}
      <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
        <p className="text-xs text-slate-300">
          {score >= 80 && "🟢 Excellent liquidity conditions. Strong bullish signal."}
          {score >= 60 && score < 80 && "🔵 Good liquidity conditions. Moderate bullish signal."}
          {score >= 40 && score < 60 && "🟡 Neutral liquidity conditions. Mixed signals."}
          {score >= 20 && score < 40 && "🟠 Tight liquidity conditions. Caution advised."}
          {score < 20 && "🔴 Severe liquidity stress. Strong bearish signal."}
        </p>
      </div>
    </div>
  );
};