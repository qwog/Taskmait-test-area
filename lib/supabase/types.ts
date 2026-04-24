// Minimal typed shapes for the rows we read in API routes.
// For full generated types, run `supabase gen types typescript`.

import type { CementType, ExposureClass, JobType, Severity } from "@/lib/rules/types";

export interface OrganizationRow {
  id: string;
  name: string;
  owner_user_id: string;
  subscription_tier: string;
  subscription_status: string;
  pours_this_period: number;
  logo_url: string | null;
  stripe_customer_id: string | null;
}

export interface JobRow {
  id: string;
  org_id: string;
  client_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  job_type: JobType;
  exposure_class: ExposureClass;
  sqft: number | null;
  thickness_in: number | null;
}

export interface MixDesignRow {
  id: string;
  org_id: string;
  supplier_id: string | null;
  name: string;
  cement_type: CementType;
  design_strength_psi: number;
  wc_ratio: number;
  aggregate_top_size_in: number | null;
  target_air_pct_min: number | null;
  target_air_pct_max: number | null;
  target_slump_in_min: number;
  target_slump_in_max: number;
  admixtures: Array<{ name: string; type?: string }>;
}

export interface PourRow {
  id: string;
  org_id: string;
  job_id: string;
  scheduled_at: string;
  mix_design_id: string | null;
  supplier_id: string | null;
  status: string;
  pre_pour_risk_level: Severity | null;
  override_reason: string | null;
  override_user_id: string | null;
  pdf_url: string | null;
}

export interface BatchTicketRow {
  id: string;
  pour_id: string;
  ticket_number: string | null;
  batched_at: string | null;
  delivered_at: string | null;
  truck_number: string | null;
  photo_url: string | null;
  admixtures: Array<{ name: string; type?: string }> | null;
}
