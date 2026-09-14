export interface Job {
  id: string;
  consumer_id: string;
  contractor_id: string | null;
  title: string;
  description: string | null;
  job_type: string;
  status: string;
  location_city: string | null;
  location_state: string | null;
  preferred_start_date: string | null;
  payment_amount: number | null;
  images: string[];
  created_at: string;
}

export interface Quote {
  id: string;
  job_id: string;
  contractor_id: string;
  amount: number;
  title: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  job_id: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
}
