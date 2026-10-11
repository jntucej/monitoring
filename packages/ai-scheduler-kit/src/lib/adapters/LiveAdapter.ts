// Live data adapter with real API integration
export class LiveAdapter extends SchedulerDataAdapter {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    super();
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async fetchJobs(params?: any): Promise<any[]> {
    const url = new URL(`${this.baseUrl}/jobs`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,\
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async fetchJob(id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/jobs/${id}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async createJob(data: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,\
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to create job: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async updateJob(id: string, data: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/jobs/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,\
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update job: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async deleteJob(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/jobs/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,\
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete job: ${response.status} ${response.statusText}`);
    }
  }

  async fetchConflicts(params?: any): Promise<any[]> {
    const url = new URL(`${this.baseUrl}/conflicts`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,\
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conflicts: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async fetchResources(params?: any): Promise<any[]> {
    const url = new URL(`${this.baseUrl}/resources`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,\
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch resources: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
