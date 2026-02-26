export type UserRole = 'municipal_admin' | 'citizen_admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Problem {
  id: string;
  user_id: number;
  title: string;
  description: string;
  category: 'Water' | 'Roads' | 'Garbage' | 'Electricity' | 'Other';
  location: string;
  image_url?: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  created_at: string;
  resolved_at?: string;
  // AI fields
  sentiment_score: number;
  sentiment_label: string;
  priority_score: number;
  is_urgent: boolean;
  cluster_id?: number;
  // Joined fields
  citizen_name?: string;
}

export interface ResolvedComment {
  id: string;
  problem_id: string;
  citizen_id: number;
  rating: 'Good' | 'Bad';
  comment: string;
  time_taken: number; // in seconds
  created_at: string;
}

export interface Cluster {
  id: number;
  cluster_name: string;
  area: string;
  problem_count: number;
  avg_sentiment: number;
  summary?: string;
  last_updated: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  problem_id?: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
  sender?: { name: string, role: string };
  receiver?: { name: string, role: string };
  problem?: { title: string };
}

export interface Stats {
  totalProblems: number;
  activeProblems: number;
  resolvedProblems: number;
  avgSentiment: number;
  activeClusters: number;
  urgentAlerts: number;
  trends?: { date: string, active: number, resolved: number }[];
  resolutionTimes?: { category: string, avg_time: number }[];
}
