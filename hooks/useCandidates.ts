import { useState, useEffect, useCallback } from 'react';
import { db } from '@/database/db';
import { Candidate } from '@/types';
import { historyService } from '@/services/historyService';
import { applicationService } from '@/services/applicationService';

export function useCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.listCandidates();
      setCandidates(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (error) {
      console.error("Failed to fetch candidates", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const addCandidate = async (data: Omit<Candidate, "id" | "createdAt" | "updatedAt">) => {
    const fresh = await db.createCandidate(data);
    await historyService.logCandidateCreation(fresh.id, data.origin);
    
    // Recalculate if candidate has any application (though here it's unlikely since it's just created)
    await applicationService.recalculateAllForCandidate(fresh.id);
    
    fetchCandidates();
    return fresh;
  };

  const updateCandidate = async (id: string, data: Partial<Candidate>) => {
    const updated = await db.updateCandidate(id, data);
    await historyService.logCandidateEdit(id);
    
    // If experiences or observations changed, recalculate all compatibility
    if (data.experiences || data.observations || data.name || data.id) {
      await applicationService.recalculateAllForCandidate(id);
    }
    
    fetchCandidates();
    return updated;
  };

  const deleteCandidate = async (id: string) => {
    await db.deleteCandidate(id);
    await fetchCandidates();
  };

  const bulkDeleteCandidates = async (ids: string[]) => {
    setLoading(true);
    try {
      await db.bulkDeleteCandidates(ids);
      await fetchCandidates();
    } finally {
      setLoading(false);
    }
  };

  const anonymizeCandidate = async (id: string) => {
    const updated = await db.updateCandidate(id, {
      name: "Anonimizado",
      normalizedName: "ANONIMIZADO",
      email: "anon@anon.com",
      phone: "00000000000",
      whatsapp: "00000000000",
      isAnonymous: true
    });
    await historyService.log({
      candidateId: id,
      type: "Anonimização",
      description: "Candidato anonimizado",
    });
    await fetchCandidates();
    return updated;
  };

  return {
    candidates,
    loading,
    refresh: fetchCandidates,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    bulkDeleteCandidates,
    anonymizeCandidate
  };
}
