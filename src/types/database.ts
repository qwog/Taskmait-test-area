export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          stripe_customer_id: string | null;
          subscription_status: "active" | "trialing" | "past_due" | "canceled" | "none";
          subscription_plan: "basic" | "premium" | "none";
          max_elders: number;
        };
        Insert: Omit<Database["public"]["Tables"]["families"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["families"]["Insert"]>;
      };
      family_members: {
        Row: {
          id: string;
          created_at: string;
          family_id: string;
          user_id: string;
          role: "admin" | "member";
          full_name: string;
          email: string;
          phone: string | null;
          receive_escalation_alerts: boolean;
          receive_daily_summary: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["family_members"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["family_members"]["Insert"]>;
      };
      elders: {
        Row: {
          id: string;
          created_at: string;
          family_id: string;
          preferred_name: string;
          full_name_encrypted: string;
          phone_encrypted: string;
          phone_hash: string;
          timezone: string;
          preferred_check_in_time: string;
          check_in_frequency: "daily" | "twice_daily" | "weekly";
          medical_notes_encrypted: string | null;
          medications_encrypted: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone_encrypted: string | null;
          is_active: boolean;
          last_check_in_at: string | null;
          mood_trend: "improving" | "stable" | "declining" | "unknown";
        };
        Insert: Omit<Database["public"]["Tables"]["elders"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["elders"]["Insert"]>;
      };
      check_in_sessions: {
        Row: {
          id: string;
          created_at: string;
          family_id: string;
          elder_id: string;
          status: "scheduled" | "in_progress" | "completed" | "missed" | "escalated";
          scheduled_at: string;
          started_at: string | null;
          completed_at: string | null;
          turn_count: number;
          mood_score: number | null;
          ai_summary: string | null;
          escalation_triggered: boolean;
          escalation_reason: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["check_in_sessions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["check_in_sessions"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          created_at: string;
          family_id: string;
          session_id: string;
          elder_id: string;
          direction: "inbound" | "outbound";
          body: string;
          ai_classification: "positive" | "neutral" | "concerning" | "escalation" | null;
          ai_confidence: number | null;
          twilio_sid: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      escalations: {
        Row: {
          id: string;
          created_at: string;
          family_id: string;
          elder_id: string;
          session_id: string | null;
          type: "keyword" | "ai_detected" | "missed_check_in" | "mood_decline";
          severity: "low" | "medium" | "high" | "critical";
          description: string;
          status: "open" | "acknowledged" | "resolved";
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          notes: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["escalations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["escalations"]["Insert"]>;
      };
      notification_log: {
        Row: {
          id: string;
          created_at: string;
          family_id: string;
          type: "sms" | "email" | "push";
          recipient: string;
          subject: string | null;
          body: string;
          status: "sent" | "failed";
          related_escalation_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["notification_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notification_log"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Family = Database["public"]["Tables"]["families"]["Row"];
export type FamilyMember = Database["public"]["Tables"]["family_members"]["Row"];
export type Elder = Database["public"]["Tables"]["elders"]["Row"];
export type CheckInSession = Database["public"]["Tables"]["check_in_sessions"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Escalation = Database["public"]["Tables"]["escalations"]["Row"];
export type NotificationLog = Database["public"]["Tables"]["notification_log"]["Row"];
