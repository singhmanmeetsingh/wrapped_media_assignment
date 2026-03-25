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
