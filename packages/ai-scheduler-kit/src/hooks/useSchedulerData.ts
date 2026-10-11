// Custom hook for fetching and managing scheduler data
import { useState, useEffect, useCallback } from 'react';
import { SchedulerDataAdapter } from '../lib/adapters/base/SchedulerDataAdapter';
import { SchedulerFormatter } from '../lib/formatters/SchedulerFormatter';

export interface UseSchedulerDataOptions {
  adapter?: SchedulerDataAdapter;
  autoFetch?: boolean;
  refreshInterval?: number;
  cache?: boolean;
  filter?: (job: any) => boolean;
}

export interface UseSchedulerDataResult {
  jobs: any[];
  resources: any[];
  conflicts: any[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  createJob: (data: any) => Promise<any>;
  updateJob: (id: string, data: any) => Promise<any>;
  deleteJob: (id: string) => Promise<void>;
  setAdapter: (adapter: SchedulerDataAdapter) => void;
}

export function useSchedulerData(options: UseSchedulerDataOptions = {}): UseSchedulerDataResult {
  const {
    adapter,
    autoFetch = true,
    refreshInterval = 30000, // 30 seconds default
    cache = true,
    filter
  } = options;

  const [jobs, setJobs] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [adapterInstance, setAdapterInstance] = useState<SchedulerDataAdapter | undefined>(adapter);

  const fetchData = useCallback(async () => {
    if (!adapterInstance) return;

    setLoading(true);
    setError(null);

    try {
      const [jobsData, resourcesData, conflictsData] = await Promise.all([
        adapterInstance.fetchJobs(),
        adapterInstance.fetchResources(),
        adapterInstance.fetchConflicts()
      ]);

      // Apply formatter and filter if provided
      const formattedJobs = SchedulerFormatter.formatJobs(jobsData);
      const formattedResources = SchedulerFormatter.formatResources(resourcesData);
      const formattedConflicts = SchedulerFormatter.formatConflicts(conflictsData);

      if (filter) {
        setJobs(formattedJobs.filter(filter));
      } else {
        setJobs(formattedJobs);
      }

      setResources(formattedResources);
      setConflicts(formattedConflicts);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch scheduler data';
      setError(message);
      console.error('Scheduler data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [adapterInstance, filter]);

  const createJob = useCallback(async (data: any) => {
    if (!adapterInstance) throw new Error('Adapter not initialized');

    try {
      const newJob = await adapterInstance.createJob(data);
      await fetchData(); // Refresh data to include new job
      return newJob;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create job';
      setError(message);
      throw err;
    }
  }, [adapterInstance, fetchData]);

  const updateJob = useCallback(async (id: string, data: any) => {
    if (!adapterInstance) throw new Error('Adapter not initialized');

    try {
      const updatedJob = await adapterInstance.updateJob(id, data);
      await fetchData(); // Refresh data to include updated job
      return updatedJob;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update job';
      setError(message);
      throw err;
    }
  }, [adapterInstance, fetchData]);

  const deleteJob = useCallback(async (id: string) => {
    if (!adapterInstance) throw new Error('Adapter not initialized');

    try {
      await adapterInstance.deleteJob(id);
      await fetchData(); // Refresh data to remove deleted job
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete job';
      setError(message);
      throw err;
    }
  }, [adapterInstance, fetchData]);

  const setAdapter = useCallback((newAdapter: SchedulerDataAdapter) => {
    setAdapterInstance(newAdapter);
    // Fetch initial data with new adapter
    fetchData();
  }, [fetchData]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (autoFetch && adapterInstance) {
      fetchData();

      if (refreshInterval > 0) {
        const interval = setInterval(fetchData, refreshInterval);
        return () => clearInterval(interval);
      }
    }
  }, [autoFetch, adapterInstance, refreshInterval, fetchData]);

  return {
    jobs,
    resources,
    conflicts,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
    createJob,
    updateJob,
    deleteJob,
    setAdapter
  };
}
