import { useState, useEffect, useMemo, useCallback } from 'react';
import { dashboardService } from '@/services/dashboardService';
import { Application, Candidate, Job, Interview } from '@/types';
import { DashboardFilters, DashboardMetrics } from '@/types/dashboard';

export function useDashboard() {
  const [data, setData] = useState<{
    applications: Application[];
    candidates: Candidate[];
    jobs: Job[];
    interviews: Interview[];
    settings?: any;
  }>({
    applications: [],
    candidates: [],
    jobs: [],
    interviews: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardData = await dashboardService.getDashboardData();
      setData(dashboardData);
    } catch (err: any) {
      console.error("Dashboard failed to load", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        fullError: err
      });
      
      let errorMsg = "Não foi possível carregar o dashboard.";
      if (err?.code === '42P01') errorMsg = "Tabela não encontrada no Supabase.";
      if (err?.code === 'PGRST301') errorMsg = "Erro de autenticação ou RLS no Supabase.";
      
      setError({
        message: errorMsg,
        details: err?.details || err?.message,
        hint: err?.hint,
        code: err?.code
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    
    const handleUpdate = () => refresh();
    window.addEventListener('settings-updated', handleUpdate);
    return () => window.removeEventListener('settings-updated', handleUpdate);
  }, [refresh]);

  const enrichedApps = useMemo(() => {
    return data.applications.map(app => ({
      ...app,
      candidate: data.candidates.find(c => c.id === app.candidateId),
      job: data.jobs.find(j => j.id === app.jobId)
    }));
  }, [data]);

  const filteredApps = useMemo(() => {
    return dashboardService.applyFilters(enrichedApps, filters, data.settings?.leaders);
  }, [enrichedApps, filters, data.settings?.leaders]);

  const metrics = useMemo(() => {
    return dashboardService.calculateMetrics(filteredApps, data.interviews, data.candidates);
  }, [filteredApps, data.interviews, data.candidates]);

  const applyFilter = (key: keyof DashboardFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleFilter = (key: keyof DashboardFilters, value: any) => {
    setFilters(prev => {
      if (prev[key] === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  const removeFilter = (key: keyof DashboardFilters) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearFilters = () => setFilters({});

  return {
    raw: data,
    filteredApps,
    metrics,
    filters,
    loading,
    refresh,
    error,
    applyFilter,
    toggleFilter,
    removeFilter,
    clearFilters
  };
}
