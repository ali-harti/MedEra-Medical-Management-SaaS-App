// ─── AUTH ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;                    // UUID
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'MEDECIN' | 'SECRETAIRE' | 'PATIENT';
  phone?: string;
  phone_number?: string;
  avatar?: string | null;
  is_active: boolean;
  created_at: string;            // ISO 8601
  last_login?: string;           // ISO 8601
  health_profile_complete?: boolean;  // PATIENT only
  specialization?: string;           // MEDECIN only
  specialty?: string;
  blood_group?: string;
  allergies?: string[];
  medical_history?: string;
  insurance_provider?: string;
}

// ─── PATIENT ─────────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  internal_id: string;           // e.g. "PAT-20260508-0001"
  first_name: string;
  last_name: string;
  // ⚠️ ACTUAL FIELD from investigation: birth_date (NOT date_of_birth)
  birth_date: string;
  // ⚠️ ACTUAL VALUES: 'M' | 'F' (NOT 'Male' | 'Female')
  gender: 'M' | 'F';
  blood_group?: string;
  blood_type?: string;
  allergies?: string[];
  medical_history?: string;
  insurance?: string;            // 'CNSS' | 'CNOPS' | 'RMA' | etc.
  phone?: string;
  health_profile_complete: boolean;
  is_archived: boolean;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

// ─── APPOINTMENT ─────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  patient_name: string;          // ⚠️ Denormalized field from API
  doctor_name: string;           // ⚠️ Denormalized field from API
  patient?: string;              // patient ID
  doctor?: string;               // doctor ID
  // ⚠️ ACTUAL FIELDS: start_datetime + end_datetime (NOT date + time)
  start_datetime: string;        // ISO 8601
  end_datetime: string;          // ISO 8601
  // ⚠️ ACTUAL STATUS VALUES from investigation:
  // 'PLANNED' | 'CONFIRMED' | 'DONE' | 'CANCELLED' | 'NO_SHOW'
  status: 'PLANNED' | 'CONFIRMED' | 'DONE' | 'CANCELLED' | 'NO_SHOW' | string;
  motive: string;                // ⚠️ ACTUAL FIELD: motive (NOT reason)
  consultation_type: 'IN_PERSON' | 'VIDEO';
  room?: string;
  duration_minutes?: number;
}

// ─── CONSULTATION ─────────────────────────────────────────────────────────────

export interface ConsultationVitals {
  heart_rate?: number;
  temperature?: number;
  blood_pressure?: string;
  bmi?: number;
}

export interface Consultation {
  id: string;
  patient: string;               // patient ID
  patient_name?: string;
  patient_details?: any;
  doctor: string;                // doctor ID
  doctor_name?: string;
  appointment?: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'FINALIZED';
  consultation_type: 'IN_PERSON' | 'VIDEO';
  vitals?: ConsultationVitals;
  anamnesis?: string;
  clinical_exam?: string;
  diagnosis: string;
  clinical_notes?: string;
  ai_used: boolean;
  ai_suggestions?: any;          // JSON — only visible to MEDECIN
  created_at: string;
  updated_at: string;
}

// ─── PRESCRIPTION ─────────────────────────────────────────────────────────────

export interface MedicationLine {
  id?: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patient: string;
  patient_name?: string;
  doctor: string;
  doctor_name?: string;
  consultation?: string;
  // ⚠️ ACTUAL FIELD: is_valid (NOT status)
  is_valid: boolean;
  medications?: MedicationLine[];
  medication_lines?: MedicationLine[];
  notes?: string;
  issued_at: string;
}

// ─── BILLING ─────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  invoice_number: string;        // e.g. "FAC-20260508-0001"
  patient: string;
  patient_name?: string;
  consultation?: string;
  amount: string;                // ⚠️ Decimal as string from DRF
  amount_paid?: string;          // ⚠️ Added for partial payments
  // ⚠️ ACTUAL STATUS VALUES: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE'
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
  payment_method?: 'CASH' | 'CARD' | 'INSURANCE' | 'ONLINE';
  paid_at?: string;
  notes?: string;
  created_at: string;
}

// ─── MESSAGING ───────────────────────────────────────────────────────────────

export interface MessageThreadParticipant {
  id: string;
  name: string;
  role: 'PATIENT' | 'MEDECIN' | 'SECRETAIRE' | 'ADMIN';
}

export interface MessageThread {
  id: string;
  subject: string;
  participants: MessageThreadParticipant[];
  other_party_name?: string;
  thread_type?: 'CLINICAL' | 'INTERNAL';
  last_message?: string;
  last_message_at?: string;
  is_read: boolean;
  unread_count?: number;
}

export interface Message {
  id: string;
  thread: string;
  sender: string;
  sender_name?: string;
  content: string;
  sent_at: string;
  is_read: boolean;
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────

export interface DoctorApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialty: string;
  license_number: string;
  years_experience?: number;
  cv?: string; // URL
  cv_file?: string;
  diploma_file?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_user?: string;
}

export interface AuditEntry {
  id: string;
  action: 'CREATION' | 'MODIFICATION' | 'FINALIZED' | 'LOCKOUT' | 'APPROVED' | 'REJECTED' | 'READ';
  model_name: string;
  object_id?: string;
  object_repr?: string;
  user_email?: string;
  ip_address?: string;
  timestamp: string;
  changes?: Record<string, any>;
}
export interface AdminDashboardStats {
  total_users: number;
  new_users_week: number;
  active_doctors: number;
  active_secretaries: number;
  active_patients: number;
  pending_applications: number;
  new_apps_week: number;
  role_breakdown: Record<string, number>;
  system_health: {
    status: string;
    uptime: string;
    database: string;
    last_backup: string;
  };
  recent_activity: any[];
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

// ⚠️ ACTUAL PAGINATION from investigation: standard DRF
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
