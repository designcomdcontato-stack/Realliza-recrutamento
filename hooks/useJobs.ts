import { useState, useEffect, useCallback } from 'react';
import { db } from '@/database/db';
import { Job } from '@/types';
import { applicationService } from '@/services/applicationService';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.listJobs();
      setJobs(data);
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const addJob = async (data: Omit<Job, "id" | "createdAt">) => {
    const fresh = await db.createJob(data);
    fetchJobs();
    return fresh;
  };

  const updateJob = async (id: string, data: Partial<Job>) => {
    const updated = await db.updateJob(id, data);
    
    // Automatic recalculation of applications for this job
    if (data.compatibilityKeywords || data.title || data.description || data.requirements) {
      await applicationService.recalculateAllForJob(id);
    }
    
    fetchJobs();
    return updated;
  };

  const deleteJob = async (id: string) => {
    await db.deleteJob(id);
    fetchJobs();
  };

  return {
    jobs,
    loading,
    refresh: fetchJobs,
    addJob,
    updateJob,
    deleteJob
  };
}
