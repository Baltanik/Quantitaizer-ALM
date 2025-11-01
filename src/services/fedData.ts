import { supabase } from "@/integrations/supabase/client";

export interface FedData {
  id: number;
  date: string;
  sofr: number | null;
  iorb: number | null;
  sofr_iorb_spread: number | null;
  walcl: number | null;
  wresbal: number | null;
  rrpontsyd: number | null;
  rpontsyd: number | null;
  rponttld: number | null;
  dtb3: number | null;
  dtb1yr: number | null;
  us10y: number | null;
  scenario: string | null;
  created_at: string;
  updated_at: string;
}

export interface Signal {
  id: number;
  date: string;
  signal_type: string | null;
  description: string | null;
  confidence: number | null;
  created_at: string;
}

export async function fetchLatestFedData(): Promise<FedData | null> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('fed_data')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      )
    ]) as any;

    if (error) {
      console.error('Error fetching latest Fed data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Timeout or error fetching latest Fed data:', error);
    return null;
  }
}

export async function fetchHistoricalFedData(limit: number = 90): Promise<FedData[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('fed_data')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      )
    ]) as any;

    if (error) {
      console.error('Error fetching historical Fed data:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Timeout or error fetching historical Fed data:', error);
    return [];
  }
}

export async function fetchRecentSignals(limit: number = 10): Promise<Signal[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('signals')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000)
      )
    ]) as any;

    if (error) {
      console.error('Error fetching signals:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Timeout or error fetching signals:', error);
    return [];
  }
}

export async function triggerFedDataFetch(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Triggering Fed data fetch...');
    
    const { data, error } = await Promise.race([
      supabase.functions.invoke('fetch-fed-data'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Edge function timeout (60s)')), 60000)
      )
    ]) as any;
    
    if (error) {
      console.error('❌ Error triggering Fed data fetch:', error);
      
      // Gestione errori specifici
      if (error.message?.includes('FRED_API_KEY')) {
        return { success: false, error: 'FRED API Key non configurata in Supabase' };
      }
      if (error.message?.includes('rate limit')) {
        return { success: false, error: 'Rate limit FRED API raggiunto. Riprova tra 1 ora.' };
      }
      
      return { success: false, error: error.message || 'Errore sconosciuto' };
    }

    console.log('✅ Fed data fetch completed successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Timeout or error triggering Fed data fetch:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Timeout o errore di rete' 
    };
  }
}

export function subscribeToFedData(callback: (payload: any) => void) {
  return supabase
    .channel('fed-data-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'fed_data'
      },
      callback
    )
    .subscribe();
}