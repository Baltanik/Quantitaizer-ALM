# QUANTITAIZER ALM - Analisi Liquidità Monetaria

🚀 **Dashboard professionale per analisi liquidità Federal Reserve in tempo reale**

Monitora SOFR, IORB, bilancio Fed e scenari QE/QT. Strumento essenziale per trader, investitori e analisti finanziari.

**Live Demo**: https://www.quantitaizeralm.com/

## 🎯 Caratteristiche

- **Dati Real-Time**: Aggiornamento quotidiano via FRED API
- **Scenario Detection**: Rilevamento automatico QE/Stealth QE/QT/Neutral
- **Metriche Chiave**: SOFR, IORB, spread, bilancio Fed, riserve bancarie
- **Design Professionale**: UI moderna con effetti neurali
- **Mobile Optimized**: Perfetto su tutti i dispositivi
- **SEO Ottimizzato**: Meta tag completi per condivisioni social

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **Data Source**: FRED API (Federal Reserve Economic Data)
- **UI Components**: shadcn/ui, Lucide React
- **Charts**: Recharts
- **Deployment**: Vercel/Netlify compatible

## 🚀 Quick Start

1. **Clone repository**
   ```bash
   git clone https://github.com/Baltanik/fed-watch.git
   cd fed-watch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Add your FRED API key
   VITE_FRED_API_KEY=your_fred_api_key_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 📊 Metriche Monitorate

- **SOFR**: Secured Overnight Financing Rate
- **IORB**: Interest on Reserve Balances  
- **Spread SOFR-IORB**: Indicatore stress liquidità
- **Bilancio Fed (WALCL)**: Total Assets Federal Reserve
- **Riserve Bancarie (WRESBAL)**: Reserve Balances
- **Reverse Repo (RRPONTSYD)**: Overnight Reverse Repo
- **Treasury Bills**: 3M, 1Y, 10Y rates

## 🎯 Scenari Rilevati

- **Stealth QE**: Espansione bilancio con spread bassi
- **QE**: Quantitative Easing ufficiale
- **QT**: Quantitative Tightening
- **Neutral**: Condizioni monetarie stabili

## 📱 Supporto

Per supporto tecnico contatta: [@baltanikz](https://t.me/baltanikz)

## 📄 License

MIT License - Vedi [LICENSE](LICENSE) per dettagli.

---

**Made with ❤️ for the trading community**