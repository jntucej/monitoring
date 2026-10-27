import { SchedulerDataAdapter } from './base/SchedulerDataAdapter';

export class MockAdapter extends SchedulerDataAdapter {
  async fetchJobs(_params?: any): Promise<any[]> {
    // Mock implementation for development/testing
    return [
      {
        id: 'job-1',
        name: 'Generate Reports',
        schedule: '0 8 * * *', // 8 AM daily
        status: 'active',
        priority: 'high',
        lastRun: '2024-01-15T08:00:00Z',
        nextRun: '2024-01-16T08:00:00Z',
        confidence: 0.95,
        hints: [
          'Suggested optimization: run during off-peak hours',
          'Recommended resources: server-cluster-2'
        ]
      },
      {
        id: 'job-2',
        name: 'Backup Database',
        schedule: '0 */6 * * *', // Every 6 hours
        status: 'pending',
        priority: 'critical',
        lastRun: '2024-01-15T14:00:00Z',
        nextRun: '2024-01-15T20:00:00Z',
        confidence: 0.98,
        hints: [
          'Recommended retention: 30 days',
          'Suggested storage: S3 bucket with lifecycle policies'
        ]
      }
    ];
  }

  async fetchJob(id: string): Promise<any> {
    const jobs = await this.fetchJobs();
    const job = jobs.find(j => j.id === id);
    if (!job) throw new Error(`Job not found: ${id}`);
    return job;
  }

  async createJob(data: any): Promise<any> {
    // Mock creation - return data with generated ID
    return { ...data, id: `job-${Date.now()}`, createdAt: new Date().toISOString() };
  }

  async updateJob(id: string, data: any): Promise<any> {
    return { ...data, id, updatedAt: new Date().toISOString() };
  }

  async deleteJob(_id: string): Promise<void> {
    // Mock deletion - always succeeds
    return Promise.resolve();
  }

  async fetchConflicts(_params?: any): Promise<any[]> {
    return [
      {
        id: 'conflict-1',
        jobIds: ['job-1', 'job-2'],
        type: 'resource_overlap',
        severity: 'medium',
        description: 'Both jobs require the same server resource during overlapping time'
      }
    ];
  }

  async fetchResources(_params?: any): Promise<any[]> {
    return [
      {
        id: 'resource-1',
        name: 'server-cluster-1',
        type: 'compute',
        available: true,
        capacity: 100,
        utilization: 45,
        locations: ['us-east-1', 'eu-west-1']
      },
      {
        id: 'resource-2',
        name: 'database-cluster-1',
        type: 'storage',
        available: true,
        capacity: 1000,
        utilization: 78,
        locations: ['us-east-1']
      },
      {
        id: 'resource-3',
        name: 'cache-cluster-1',
        type: 'cache',
        available: false,
        capacity: 500,
        utilization: 95,
        locations: ['us-east-1', 'eu-west-1', 'ap-southeast-1']
      }
    ];
  }
}
