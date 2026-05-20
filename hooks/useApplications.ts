import { useState, useEffect, useCallback } from 'react';
import { db } from '@/database/db';
import { Application } from '@/types';
import { historyService } from '@/services/historyService';
import { applicationService } from '@/services/applicationService';

export function useApplications(candidateId?: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = candidateId 
        ? await db.getApplicationsByCandidate(candidateId)
        : await db.listApplications();
      setApplications(data);
    } catch (error) {
      console.error("Failed to fetch applications", error);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const addApplication = async (data: Omit<Application, "id" | "createdAt" | "updatedAt">) => {
    const fresh = await db.createApplication(data);
    await historyService.log({
      candidateId: data.candidateId,
      applicationId: fresh.id,
      type: "Criação",
      description: "Nova inscrição criada"
    });
    
    // Initial calculation
    await applicationService.recalculateAndSaveCompatibility(fresh.id);
    
    fetchApplications();
    return fresh;
  };

  const updateApplication = async (id: string, data: Partial<Application>) => {
    const existing = await db.getApplication(id);
    const updated = await db.updateApplication(id, data);
    
    if (existing) {
      if (data.currentPhase && data.currentPhase !== existing.currentPhase) {
        await historyService.logPhaseChange(existing.candidateId, existing.currentPhase, data.currentPhase, id);
      }
      if (data.currentStatus && data.currentStatus !== existing.currentStatus) {
        await historyService.logStatusChange(existing.candidateId, id, existing.currentStatus, data.currentStatus);
      }
      // If jobId changed, recalculate
      if (data.jobId && data.jobId !== existing.jobId) {
        await applicationService.recalculateAndSaveCompatibility(id);
      }
    }
    
    fetchApplications();
    return updated;
  };

  const deleteApplication = async (id: string) => {
    await db.deleteApplication(id);
    await fetchApplications();
  };

  return {
    applications,
    loading,
    refresh: fetchApplications,
    addApplication,
    updateApplication,
    deleteApplication
  };
}
