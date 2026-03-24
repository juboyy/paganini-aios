"use client";

import { useState, useEffect } from "react";

interface AgentData {
  id: string;
  name: string;
  emoji: string;
  status: string;
  model: string;
  tasks_completed: number;
  avg_time: string;
  error_rate: number;
  total_cost: number;
  role: string;
  title: string;
}

interface TimelineEvent {
  title: string;
  description: string;
  type: string;
  agent_id: string;
  created_at: string;
}

interface CanvasData {
  agents: AgentData[];
  timeline: TimelineEvent[];
  loading: boolean;
  error: string | null;
}

export function useCanvasData(): CanvasData {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/canvas-data");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAgents(data.agents || []);
        setTimeline(data.timeline || []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // Refresh every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { agents, timeline, loading, error };
}
