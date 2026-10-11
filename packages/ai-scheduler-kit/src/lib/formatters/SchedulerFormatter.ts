// Scheduler data formatting utilities
export class SchedulerFormatter {
  static formatJobs(jobs: any[]): any[] {
    return jobs.map(job => ({
      ...job,
      scheduledTime: job.schedule ? this.parseCron(job.schedule) : null,
      isActive: job.status === 'active',
      priority: job.priority || 'normal',
      confidence: job.confidence || 0.5,
      hintCount: job.hints?.length || 0,
      nextRunFormatted: job.nextRun ? this.formatTime(job.nextRun) : null,
      lastRunFormatted: job.lastRun ? this.formatTime(job.lastRun) : null
    }));
  }

  static formatResources(resources: any[]): any[] {
    return resources.map(resource => ({
      ...resource,
      availability: resource.available ? 'available' : 'unavailable',
      utilizationPercent: Math.round((resource.utilization / resource.capacity) * 100),
      isOverutilized: (resource.utilization / resource.capacity) > 0.9
    }));
  }

  static formatConflicts(conflicts: any[]): any[] {
    return conflicts.map(conflict => ({
      ...conflict,
      severity: conflict.severity || 'low',
      isResolved: conflict.resolved || false,
      estimatedImpact: this.calculateImpact(conflict)
    }));
  }

  private static parseCron(cron: string): Date | null {
    if (!cron) return null;
    // Simple cron parsing for demonstration
    // In production, use a proper cron parser
    const now = new Date();
    return now; // Placeholder
  }

  private static formatTime(isoString: string): string {
    return new Date(isoString).toLocaleString();
  }

  private static calculateImpact(conflict: any): number {
    const severityMultiplier = { low: 1, medium: 2.5, high: 5 }[conflict.severity] || 1;
    return conflict.affectedJobs?.length * 10 * severityMultiplier;
  }
}
