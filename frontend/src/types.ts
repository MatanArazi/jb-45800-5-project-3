export interface Vacation {
  vacation_id: number;
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  price: string | number;
  max_participants: number;
  current_participants: number;
  image_url: string | null;
  displayImage?: string;
  total_likes: number;
  liked_by_current_user?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: number;
  role?: 'admin' | 'user';
  first_name: string;
  last_name: string;
  email: string;
}

export interface Stats {
  vacations: number;
  users: number;
  likes: number;
  bookings: number;
  reviews: number;
}
