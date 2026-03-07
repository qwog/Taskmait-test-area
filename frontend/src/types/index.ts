export interface User {
  id: string;
  username: string;
  email: string;
  avatar_color: string;
  total_points: number;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
  members?: HouseholdMember[];
}

export interface HouseholdMember {
  id: string;
  username: string;
  avatar_color: string;
  total_points: number;
  household_points: number;
}

export type TaskFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once';

export interface Task {
  id: string;
  household_id: string;
  created_by: string;
  created_by_username: string;
  title: string;
  description: string | null;
  base_points: number;
  frequency: TaskFrequency;
  time_deadline: string | null;
  time_bonus_points: number;
  assigned_to: string | null;
  assigned_to_username: string | null;
  assigned_to_color: string | null;
  is_active: number;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  task_title: string;
  user_id: string;
  username: string;
  avatar_color: string;
  household_id: string;
  points_earned: number;
  base_points: number;
  bonus_points: number;
  streak_bonus: number;
  completed_at: string;
  notes: string | null;
  frequency: TaskFrequency;
}

export interface Streak {
  user_id: string;
  task_id: string;
  title: string;
  frequency: TaskFrequency;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

export interface CompletionResult {
  message: string;
  points_earned: number;
  base_points: number;
  bonus_points: number;
  streak_bonus: number;
  new_streak: number;
  completion_id: string;
}

export interface UserStats {
  totalCompletions: number;
  totalPoints: number;
  longestStreak: number;
  todayCompletions: number;
}
