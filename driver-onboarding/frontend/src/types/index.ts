export interface DriverInput {
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_state: string;
  ref?: string;
}

export interface DriverResponse {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_state: string;
  campaign_id: string | null;
  created_at: string;
}

export interface VehicleInput {
  make: string;
  model: string;
  year: number;
  insurance_policy_number: string;
  insurance_expiry: string;
}

export interface VehicleResponse {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  insurance_policy_number: string;
  insurance_expiry: string;
  created_at: string;
}

export interface DriverDetailResponse extends DriverResponse {
  vehicles: VehicleResponse[];
}

export interface DailySignupCount {
  date: string;
  count: number;
}

export interface CampaignStats {
  id: string;
  campaign_id: string;
  name: string;
  source: string;
  total_signups: number;
  completed_signups: number;
  conversion_rate: number;
  signups_over_time: DailySignupCount[];
}

export interface CampaignListResponse {
  campaigns: CampaignStats[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string | { msg: string; loc: string[] }[];
}
