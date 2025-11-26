// ============================================================================
// PDF GENERATOR - Professional finance report layout
// ============================================================================
// Libreria: pdfmake (Deno-compatible)
// Style: Bloomberg Terminal / Goldman Sachs research report

import PdfPrinter from 'npm:pdfmake@0.2.7';
import type { TDocumentDefinitions, Content } from 'npm:pdfmake@0.2.7/interfaces';
import type { Deltas, Alert } from './alertEngine.ts';
import type { ScenarioState } from './scenarioEngine.ts';

interface ReportData {
  date: string;
  metrics: any;
  deltas: Deltas;
  scenario: ScenarioState;
  alerts: Alert[];
}

// ============================================================================
// FONTS CONFIG
// ============================================================================
const fonts = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatNumber(num: number, decimals = 2, unit = ''): string {
  if (num === null || num === undefined) return 'N/A';
  return `${num.toFixed(decimals)}${unit}`;
}

function formatDelta(delta: number, decimals = 2, unit = ''): string {
  if (delta === null || delta === undefined) return 'N/A';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(decimals)}${unit}`;
}

function formatBillions(num: number): string {
  return `$${(num / 1000).toFixed(2)}T`;
}

function getAlertIcon(level: string): string {
  switch (level) {
    case 'critical': return '🔴';
    case 'warning': return '🟡';
    case 'ok': return '✅';
    default: return '⚪';
  }
}

function getRiskEmoji(risk: string): string {
  switch (risk) {
    case 'normale': return '🟢';
    case 'elevato': return '🟡';
    case 'alto': return '🔴';
    default: return '⚪';
  }
}

// ============================================================================
// SECTION BUILDERS
// ============================================================================

function buildHeader(date: string): Content {
  return [
    {
      text: 'QUANTITAIZER | Fed Liquidity Daily Report',
      style: 'header',
      alignment: 'center'
    },
    {
      text: `${new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })} - 18:00 UTC`,
      style: 'subheader',
      alignment: 'center',
      margin: [0, 5, 0, 20]
    }
  ];
}

function buildExecutiveSummary(scenario: ScenarioState): Content {
  return {
    stack: [
      {
        text: '📈 EXECUTIVE SUMMARY',
        style: 'sectionHeader'
      },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            [
              { text: 'Scenario:', bold: true },
              { text: scenario.scenario.toUpperCase().replace('_', ' '), color: '#1a73e8' }
            ],
            [
              { text: 'Context:', bold: true },
              { text: scenario.context.replace('_', ' ') }
            ],
            [
              { text: 'Risk Level:', bold: true },
              { text: `${getRiskEmoji(scenario.risk_level)} ${scenario.risk_level.toUpperCase()}` }
            ],
            [
              { text: 'Sustainability:', bold: true },
              { text: scenario.sustainability.toUpperCase() }
            ],
            [
              { text: 'Confidence:', bold: true },
              { text: scenario.confidence.toUpperCase() }
            ]
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 15]
      }
    ]
  };
}

function buildAlertsSection(alerts: Alert[]): Content {
  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  const warningAlerts = alerts.filter(a => a.level === 'warning');
  const okAlerts = alerts.filter(a => a.level === 'ok');

  const alertRows: any[] = [
    [
      { text: 'Level', bold: true, fillColor: '#f0f0f0' },
      { text: 'Metric', bold: true, fillColor: '#f0f0f0' },
      { text: 'Message', bold: true, fillColor: '#f0f0f0' }
    ]
  ];

  // Critical first
  criticalAlerts.forEach(a => {
    alertRows.push([
      { text: getAlertIcon(a.level), alignment: 'center' },
      { text: a.metric, bold: true, color: '#d32f2f' },
      { text: a.message, color: '#d32f2f' }
    ]);
  });

  // Then warnings
  warningAlerts.forEach(a => {
    alertRows.push([
      { text: getAlertIcon(a.level), alignment: 'center' },
      { text: a.metric, bold: true, color: '#f57c00' },
      { text: a.message, color: '#f57c00' }
    ]);
  });

  // OK status last (limit to most important)
  okAlerts.slice(0, 3).forEach(a => {
    alertRows.push([
      { text: getAlertIcon(a.level), alignment: 'center' },
      { text: a.metric },
      { text: a.message, color: '#388e3c' }
    ]);
  });

  return {
    stack: [
      {
        text: '⚠️  ALERTS & MONITORING',
        style: 'sectionHeader'
      },
      {
        table: {
          widths: ['8%', '22%', '70%'],
          body: alertRows
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 15]
      }
    ]
  };
}

function buildMetricsTable(metrics: any, deltas: Deltas): Content {
  return {
    stack: [
      {
        text: '📊 KEY METRICS',
        style: 'sectionHeader'
      },
      {
        table: {
          widths: ['20%', '15%', '12%', '12%', '12%', '29%'],
          body: [
            [
              { text: 'Metric', bold: true, fillColor: '#f0f0f0' },
              { text: 'Current', bold: true, fillColor: '#f0f0f0', alignment: 'right' },
              { text: 'Δ 1d', bold: true, fillColor: '#f0f0f0', alignment: 'right' },
              { text: 'Δ 4w', bold: true, fillColor: '#f0f0f0', alignment: 'right' },
              { text: 'Δ 3m', bold: true, fillColor: '#f0f0f0', alignment: 'right' },
              { text: '90d Range', bold: true, fillColor: '#f0f0f0', alignment: 'right' }
            ],
            // Balance Sheet
            [
              'Balance Sheet',
              { text: formatBillions(metrics.walcl), alignment: 'right' },
              { text: formatDelta(deltas.walcl_1d / 1000, 1, 'B'), alignment: 'right' },
              { text: formatDelta(deltas.walcl_4w / 1000, 0, 'B'), alignment: 'right' },
              { text: formatDelta(deltas.walcl_3m / 1000, 0, 'B'), alignment: 'right' },
              { text: `${formatBillions(deltas.walcl_range_90d[0])}-${formatBillions(deltas.walcl_range_90d[1])}`, alignment: 'right', fontSize: 8 }
            ],
            // RRP
            [
              'RRP',
              { text: `$${(metrics.rrpon / 1000).toFixed(0)}B`, alignment: 'right' },
              { text: formatDelta(deltas.rrpon_1d / 1000, 1, 'B'), alignment: 'right' },
              { text: formatDelta(deltas.rrpon_4w / 1000, 0, 'B'), alignment: 'right' },
              { text: formatDelta(deltas.rrpon_3m / 1000, 0, 'B'), alignment: 'right' },
              { text: `$${(deltas.rrpon_range_90d[0] / 1000).toFixed(0)}B-$${(deltas.rrpon_range_90d[1] / 1000).toFixed(0)}B`, alignment: 'right', fontSize: 8 }
            ],
            // Reserves
            [
              'Reserves',
              { text: formatBillions(metrics.wresbal), alignment: 'right' },
              { text: formatDelta(deltas.wresbal_1d / 1000, 1, 'B'), alignment: 'right' },
              { text: formatDelta(deltas.wresbal_4w / 1000, 0, 'B'), alignment: 'right' },
              { text: formatDelta(deltas.wresbal_3m / 1000, 0, 'B'), alignment: 'right' },
              { text: `${formatBillions(deltas.wresbal_range_90d[0])}-${formatBillions(deltas.wresbal_range_90d[1])}`, alignment: 'right', fontSize: 8 }
            ],
            // VIX
            [
              'VIX',
              { text: formatNumber(metrics.vix, 1), alignment: 'right' },
              { text: formatDelta(deltas.vix_1d, 1), alignment: 'right' },
              { text: formatDelta(deltas.vix_4w, 1), alignment: 'right' },
              { text: formatDelta(deltas.vix_3m, 1), alignment: 'right' },
              { text: `${formatNumber(deltas.vix_range_90d[0], 1)}-${formatNumber(deltas.vix_range_90d[1], 1)}`, alignment: 'right', fontSize: 8 }
            ],
            // SOFR-EFFR
            [
              'SOFR-EFFR',
              { text: formatNumber(deltas.sofr_effr_spread * 100, 1, 'bps'), alignment: 'right' },
              { text: formatDelta(deltas.sofr_effr_1d * 100, 1, 'bps'), alignment: 'right' },
              { text: '-', alignment: 'right' },
              { text: '-', alignment: 'right' },
              { text: '-', alignment: 'right' }
            ],
            // HY OAS
            [
              'HY OAS',
              { text: formatNumber(metrics.hy_oas, 2, '%'), alignment: 'right' },
              { text: formatDelta(deltas.hy_oas_1d * 100, 0, 'bp'), alignment: 'right' },
              { text: formatDelta(deltas.hy_oas_4w * 100, 0, 'bp'), alignment: 'right' },
              { text: formatDelta(deltas.hy_oas_3m * 100, 0, 'bp'), alignment: 'right' },
              { text: `${formatNumber(deltas.hy_oas_range_90d[0], 2, '%')}-${formatNumber(deltas.hy_oas_range_90d[1], 2, '%')}`, alignment: 'right', fontSize: 8 }
            ],
            // T10Y3M
            [
              'T10Y3M',
              { text: formatNumber(metrics.t10y3m, 2, '%'), alignment: 'right' },
              { text: formatDelta(deltas.t10y3m_1d * 100, 0, 'bp'), alignment: 'right' },
              { text: formatDelta(deltas.t10y3m_4w * 100, 0, 'bp'), alignment: 'right' },
              { text: formatDelta(deltas.t10y3m_3m * 100, 0, 'bp'), alignment: 'right' },
              { text: `${formatNumber(deltas.t10y3m_range_90d[0], 2, '%')}-${formatNumber(deltas.t10y3m_range_90d[1], 2, '%')}`, alignment: 'right', fontSize: 8 }
            ],
            // DXY
            [
              'DXY Broad',
              { text: formatNumber(metrics.dxy_broad, 1), alignment: 'right' },
              { text: formatDelta(deltas.dxy_1d, 1), alignment: 'right' },
              { text: formatDelta(deltas.dxy_4w, 1), alignment: 'right' },
              { text: formatDelta(deltas.dxy_3m, 1), alignment: 'right' },
              { text: `${formatNumber(deltas.dxy_range_90d[0], 1)}-${formatNumber(deltas.dxy_range_90d[1], 1)}`, alignment: 'right', fontSize: 8 }
            ]
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 15],
        fontSize: 9
      }
    ]
  };
}

function buildDriversSection(scenario: ScenarioState): Content {
  const driversList = scenario.drivers.map(d => ({ text: `• ${d}`, margin: [0, 2, 0, 2] }));
  
  return {
    stack: [
      {
        text: '🔍 ACTIVE DRIVERS',
        style: 'sectionHeader'
      },
      {
        stack: driversList.length > 0 ? driversList : [{ text: '• No significant drivers detected', italics: true }],
        margin: [10, 5, 0, 15]
      }
    ]
  };
}

function buildWatchList(alerts: Alert[], metrics: any, deltas: Deltas): Content {
  const watchItems: any[] = [];

  // RRP near threshold
  if (metrics.rrpon < 300000) {
    watchItems.push({ 
      text: `• RRP: Se scende <$250B → fine buffer liquidità (current: $${(metrics.rrpon/1000).toFixed(0)}B)`, 
      margin: [0, 2, 0, 2] 
    });
  }

  // VIX near warning
  if (metrics.vix > 16 && metrics.vix < 18) {
    watchItems.push({ 
      text: `• VIX: Rottura 18 → shift risk-off possibile (current: ${metrics.vix.toFixed(1)})`, 
      margin: [0, 2, 0, 2] 
    });
  }

  // SOFR spread
  const spread_bps = deltas.sofr_effr_spread * 100;
  if (spread_bps > 3 && spread_bps < 5) {
    watchItems.push({ 
      text: `• SOFR spread: >5bps → primi segnali tensione (current: ${spread_bps.toFixed(1)}bps)`, 
      margin: [0, 2, 0, 2] 
    });
  }

  // Balance Sheet acceleration
  if (deltas.walcl_4w < -50000 && deltas.walcl_4w > -60000) {
    watchItems.push({ 
      text: `• Balance Sheet: Accelerazione QT? Watch -$60B/4w (current: ${formatDelta(deltas.walcl_4w/1000, 0, 'B')}/4w)`, 
      margin: [0, 2, 0, 2] 
    });
  }

  // Default message if nothing to watch
  if (watchItems.length === 0) {
    watchItems.push({ 
      text: '• No critical thresholds approaching - continue routine monitoring', 
      italics: true, 
      margin: [0, 2, 0, 2] 
    });
  }

  return {
    stack: [
      {
        text: '💡 COSA GUARDARE DOMANI',
        style: 'sectionHeader'
      },
      {
        stack: watchItems,
        margin: [10, 5, 0, 15]
      }
    ]
  };
}

function buildContextSection(scenario: ScenarioState): Content {
  const contextText = getContextDescription(scenario.scenario);
  
  return {
    stack: [
      {
        text: `📚 CONTEXT: ${scenario.scenario.toUpperCase().replace('_', ' ')}`,
        style: 'sectionHeader'
      },
      {
        text: contextText,
        margin: [10, 5, 0, 15],
        alignment: 'justify'
      }
    ]
  };
}

function getContextDescription(scenario: string): string {
  switch (scenario) {
    case 'stealth_qe':
      return 'Fed sta iniettando liquidità nascosta via RRP drenaggio mentre Balance Sheet rallenta contrazione. Mercati beneficiano di liquidità senza annunci QE formali. Scenario sostenibile finché VIX <18 e spread rimangono stretti.';
    case 'qe':
      return 'Fed in modalità Quantitative Easing attivo: acquisti massicci Treasury/MBS espandono bilancio. Liquidità flood sistema, tassi scendono, asset prices supportati. Massimo supporto Fed ai mercati.';
    case 'qt':
      return 'Fed in modalità Quantitative Tightening: lascia scadere titoli senza reinvestirli, drenando liquidità dal sistema. Riserve bancarie scendono, pressure su asset prices. Monitorare velocità contrazione e spread per segnali stress.';
    case 'neutral':
      return 'Fed in modalità wait-and-see: policy neutrale, né espansione né contrazione attiva. Balance Sheet stabile, mercato in attesa di prossime mosse Fed. Tipico di fasi transition.';
    default:
      return 'Scenario non classificato - monitorare evoluzione metriche.';
  }
}

function buildFooter(date: string): Content {
  return [
    {
      text: '_'.repeat(100),
      margin: [0, 20, 0, 5],
      fontSize: 8
    },
    {
      columns: [
        { 
          text: `Generated: ${new Date().toISOString()}`, 
          fontSize: 8, 
          color: '#666' 
        },
        { 
          text: 'Data Source: FRED API', 
          fontSize: 8, 
          color: '#666', 
          alignment: 'right' 
        }
      ],
      margin: [0, 0, 0, 5]
    },
    {
      text: 'Disclaimer: Educational purposes only. Not financial advice. Do your own research.',
      fontSize: 8,
      italics: true,
      color: '#999',
      alignment: 'center'
    }
  ];
}

// ============================================================================
// MAIN PDF GENERATOR
// ============================================================================

export async function generatePDF(data: ReportData): Promise<Uint8Array> {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    
    content: [
      buildHeader(data.date),
      buildExecutiveSummary(data.scenario),
      buildAlertsSection(data.alerts),
      buildMetricsTable(data.metrics, data.deltas),
      buildDriversSection(data.scenario),
      buildWatchList(data.alerts, data.metrics, data.deltas),
      buildContextSection(data.scenario),
      buildFooter(data.date)
    ],
    
    styles: {
      header: {
        fontSize: 20,
        bold: true,
        color: '#1a73e8'
      },
      subheader: {
        fontSize: 12,
        color: '#666'
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
        color: '#1a73e8'
      }
    },
    
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      lineHeight: 1.3
    }
  };

  // Create PDF using pdfmake
  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  
  // Collect chunks into buffer
  const chunks: Uint8Array[] = [];
  
  return new Promise((resolve, reject) => {
    pdfDoc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(result);
    });
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}









