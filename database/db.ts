import { Candidate, Job, Application, HistoryEvent, CandidateDocument, User, AppSettings, Interview } from "../types";

import { DatabaseAdapter } from "./dbInterface";
import { LocalDatabaseAdapter } from "./localAdapter";
import { SupabaseDatabaseAdapter } from "./supabaseAdapter";

export const localAdapter = new LocalDatabaseAdapter();
let supabaseAdapterInstance: SupabaseDatabaseAdapter | null = null;

try {
  const hasSupabaseConfig = 
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) && 
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

  if (hasSupabaseConfig) {
    supabaseAdapterInstance = new SupabaseDatabaseAdapter();
  }
} catch (e) {
  console.error("Erro ao inicializar SupabaseDatabaseAdapter:", e);
}

export const supabaseAdapter = supabaseAdapterInstance;

// Determine provider with fallback support
const getProvider = () => {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('database_provider_override');
    if (override === 'local') return 'local';
    if (override === 'supabase') return 'supabase';
  }
  return process.env.NEXT_PUBLIC_DATABASE_PROVIDER || process.env.VITE_DATABASE_PROVIDER || 'local';
};

const provider = getProvider();

export const db: DatabaseAdapter = (provider === 'supabase' && supabaseAdapter)
  ? supabaseAdapter
  : localAdapter;

export { type DatabaseAdapter };
