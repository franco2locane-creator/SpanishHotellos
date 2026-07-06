import { supabase } from '@/lib/supabase';
import type { PlacementLevel } from '@/types';

type PlacementResult = {
  level: PlacementLevel;
  justification: string;
};

export async function assessPlacement(
  transcripts: [string, string, string],
): Promise<PlacementResult> {
  const { data, error } = await supabase.functions.invoke<PlacementResult>(
    'placement',
    { body: { transcripts } },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Empty response from placement function');
  return data;
}
