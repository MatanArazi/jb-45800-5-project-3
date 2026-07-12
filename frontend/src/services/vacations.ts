import axios from 'axios';
import { Stats, Vacation } from '../types';

const API_BASE = 'http://localhost:5000/api';

export interface VacationsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  limit: number;
  data: Vacation[];
}

export interface StatsResponse {
  success: boolean;
  stats: Stats;
}

interface ReportRow {
  destination: string;
  likes: number;
}

export interface ReportResponse {
  success: boolean;
  data: ReportRow[];
  error?: string;
}

class VacationsService {
  async getVacations(params: Record<string, string | number>): Promise<VacationsResponse> {
    const { data } = await axios.get<VacationsResponse>(`${API_BASE}/vacations`, { params });
    return data;
  }

  async getStats(): Promise<StatsResponse> {
    const { data } = await axios.get<StatsResponse>(`${API_BASE}/stats`);
    return data;
  }

  async addLike(userId: number, vacationId: number): Promise<void> {
    await axios.post(`${API_BASE}/likes`, { user_id: userId, vacation_id: vacationId });
  }

  async removeLike(userId: number, vacationId: number): Promise<void> {
    await axios.delete(`${API_BASE}/likes/${userId}/${vacationId}`);
  }

  async createVacation(form: FormData, userId?: number): Promise<void> {
    await axios.post(`${API_BASE}/vacations`, form, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(userId ? { 'x-user-id': String(userId) } : {}),
      },
    });
  }

  async updateVacation(vacationId: number, form: FormData, userId?: number): Promise<void> {
    await axios.put(`${API_BASE}/vacations/${vacationId}`, form, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(userId ? { 'x-user-id': String(userId) } : {}),
      },
    });
  }

  async deleteVacation(vacationId: number, userId?: number): Promise<void> {
    await axios.delete(`${API_BASE}/vacations/${vacationId}`, {
      headers: userId ? { 'x-user-id': String(userId) } : {},
    });
  }

  async getLikesReport(): Promise<ReportResponse> {
    const { data } = await axios.get<ReportResponse>(`${API_BASE}/reports/vacation-likes`);
    return data;
  }

  async getLikesReportCsv(): Promise<Blob> {
    const { data } = await axios.get<Blob>(`${API_BASE}/reports/vacation-likes.csv`, { responseType: 'blob' });
    return data;
  }
}

const vacationsService = new VacationsService();
export default vacationsService;
