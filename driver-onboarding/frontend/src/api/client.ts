import {
  CampaignListResponse,
  DriverDetailResponse,
  DriverInput,
  DriverResponse,
  LoginInput,
  RegisterInput,
  TokenResponse,
  VehicleInput,
  VehicleResponse,
} from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw { status: response.status, detail: error.detail };
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function registerUser(data: RegisterInput): Promise<TokenResponse> {
  return request<TokenResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loginUser(data: LoginInput): Promise<TokenResponse> {
  return request<TokenResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createDriver(data: DriverInput): Promise<DriverResponse> {
  return request<DriverResponse>('/api/drivers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDriver(driverId: string): Promise<DriverDetailResponse> {
  return request<DriverDetailResponse>(`/api/drivers/${driverId}`);
}

export async function createVehicle(
  driverId: string,
  data: VehicleInput
): Promise<VehicleResponse> {
  return request<VehicleResponse>(`/api/drivers/${driverId}/vehicles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCampaignRefs(): Promise<{ campaigns: { campaign_id: string; name: string }[] }> {
  return request('/api/campaigns/refs');
}

export async function sendInvitation(data: { email: string; campaign_id: string }): Promise<any> {
  return request('/api/invitations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function validateInvitation(token: string): Promise<{
  email: string;
  campaign_id: string;
  campaign_ref: string | null;
  campaign_name: string | null;
}> {
  return request(`/api/invitations/${token}/validate`);
}

export async function declineInvitation(token: string): Promise<{ detail: string }> {
  return request(`/api/invitations/${token}/decline`, { method: 'POST' });
}

export async function getCampaigns(
  startDate?: string,
  endDate?: string
): Promise<CampaignListResponse> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<CampaignListResponse>(`/api/campaigns${query}`);
}
