import { Request } from 'express';

// User Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UserRow {
  id: string;
  email_encrypted: Buffer;
  email_hash: string;
  password_hash: string;
  name_encrypted: Buffer | null;
  created_at: Date;
  updated_at: Date;
}

// Emotion Types
export interface Emotion {
  id: string;
  userId: string;
  emotions: string[];
  intensity: number;
  bodySensations: string;
  context: string;
  accepted: boolean;
  createdAt: Date;
}

export interface EmotionRow {
  id: string;
  user_id: string;
  emotions_encrypted: Buffer;
  intensity: number;
  body_sensations_encrypted: Buffer;
  context_encrypted: Buffer;
  accepted: boolean;
  created_at: Date;
}

// Value Types
export interface Value {
  id: string;
  userId: string;
  category: string;
  customValue: string | null;
  importance: number;
  alignment: number;
  createdAt: Date;
}

export interface ValueRow {
  id: string;
  user_id: string;
  category_encrypted: Buffer;
  custom_value_encrypted: Buffer | null;
  importance: number;
  alignment: number;
  created_at: Date;
}

// Action Types
export interface Action {
  id: string;
  userId: string;
  value: string;
  action: string;
  completed: boolean;
  microSteps: string[];
  completedSteps: number[];
  commitment?: number;
  feeling?: string;
  createdAt: Date;
}

export interface ActionRow {
  id: string;
  user_id: string;
  value_encrypted: Buffer;
  action_encrypted: Buffer;
  completed: boolean;
  micro_steps_encrypted: Buffer;
  completed_steps_encrypted: Buffer | null;
  commitment: number | null;
  feeling_encrypted: Buffer | null;
  created_at: Date;
}

// Boundary Practice Types
export interface BoundaryPractice {
  id: string;
  userId: string;
  scenario: string;
  boundaryType: string;
  response: string;
  confidence: number;
  outcome: string | null;
  createdAt: Date;
}

export interface BoundaryPracticeRow {
  id: string;
  user_id: string;
  scenario_encrypted: Buffer;
  boundary_type: string;
  response_encrypted: Buffer;
  confidence: number;
  outcome_encrypted: Buffer | null;
  created_at: Date;
}

// Message Types
export interface Message {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface MessageRow {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content_encrypted: Buffer;
  created_at: Date;
}

// Session Types
export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

// Request Types
export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// DTO Types
export interface CreateEmotionDTO {
  emotions: string[];
  intensity: number;
  bodySensations: string;
  context: string;
  accepted?: boolean;
}

export interface UpdateEmotionDTO {
  emotions?: string[];
  intensity?: number;
  bodySensations?: string;
  context?: string;
  accepted?: boolean;
}

export interface CreateValueDTO {
  category: string;
  customValue?: string;
  importance: number;
  alignment: number;
}

export interface UpdateValueDTO {
  category?: string;
  customValue?: string;
  importance?: number;
  alignment?: number;
}

export interface CreateActionDTO {
  value: string;
  action: string;
  microSteps?: string[];
  commitment?: number;
  feeling?: string;
}

export interface UpdateActionDTO {
  value?: string;
  action?: string;
  completed?: boolean;
  microSteps?: string[];
  completedSteps?: number[];
  commitment?: number;
  feeling?: string;
}

export interface CreateBoundaryDTO {
  scenario: string;
  boundaryType: string;
  response: string;
  confidence: number;
  outcome?: string;
}

export interface UpdateBoundaryDTO {
  scenario?: string;
  boundaryType?: string;
  response?: string;
  confidence?: number;
  outcome?: string;
}

export interface CreateMessageDTO {
  content: string;
}

// Claude API Types
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeChatRequest {
  message: string;
  conversationHistory?: ClaudeMessage[];
}

export interface ClaudeMicroStepsRequest {
  action: string;
  context?: string;
}

export interface ClaudeBoundaryAnalysisRequest {
  scenario: string;
  boundaryType: string;
}
