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
  const { data, error } = await supabase
    .from('fed_data')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching latest Fed data:', error);
    return null;
  }

  return data;
}

export async function fetchHistoricalFedData(limit: number = 90): Promise<FedData[]> {
  const { data, error } = await supabase
    .from('fed_data')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching historical Fed data:', error);
    return [];
  }

  return data || [];
}

export async function fetchRecentSignals(limit: number = 10): Promise<Signal[]> {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching signals:', error);
    return [];
  }

  return data || [];
}

export async function triggerFedDataFetch(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-fed-data');
    
    if (error) {
      console.error('Error triggering Fed data fetch:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error triggering Fed data fetch:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
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