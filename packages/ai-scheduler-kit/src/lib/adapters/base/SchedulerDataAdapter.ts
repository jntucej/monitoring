// Base scheduler data adapter abstract class
export abstract class SchedulerDataAdapter {
  abstract fetchJobs(params?: any): Promise<any[]>;
  abstract fetchJob(id: string): Promise<any>;
  abstract createJob(data: any): Promise<any>;
  abstract updateJob(id: string, data: any): Promise<any>;
  abstract deleteJob(id: string): Promise<void>;
  abstract fetchConflicts(params?: any): Promise<any[]>;
  abstract fetchResources(params?: any): Promise<any[]>;
}
