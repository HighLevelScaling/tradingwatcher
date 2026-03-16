/**
 * NAVIGATOR — AI-Powered Employee Onboarding Platform
 * Core type definitions for the 5 Agent Modes
 */

// ─── Agent Modes ─────────────────────────────────────────────────────────────

export type AgentMode = 'greeter' | 'compliance' | 'learning' | 'provisioner' | 'buddy'

export interface AgentModeDefinition {
  id: AgentMode
  name: string
  description: string
  systemPrompt: string
  /** Phases where this mode is primary */
  activeDuring: OnboardingPhase[]
  /** Tools this mode can invoke */
  allowedTools: AgentToolName[]
  /** Priority: lower = checked first for auto-switching */
  priority: number
}

// ─── Onboarding Phases ───────────────────────────────────────────────────────

export type OnboardingPhase =
  | 'pre_boarding'
  | 'day_one'
  | 'week_one'
  | 'month_one'
  | 'quarter_one'
  | 'completed'

// ─── Agent Tools ─────────────────────────────────────────────────────────────

export type AgentToolName =
  | 'send_document_for_signature'
  | 'check_compliance_status'
  | 'assign_learning_module'
  | 'schedule_meeting'
  | 'provision_account'
  | 'create_task'
  | 'send_notification'
  | 'assess_understanding'
  | 'escalate_to_human'
  | 'update_progress'

export interface AgentTool {
  name: AgentToolName
  description: string
  parameters: Record<string, ToolParameter>
  required: string[]
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array'
  description: string
  enum?: string[]
}

// ─── Conversation ────────────────────────────────────────────────────────────

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  mode?: AgentMode
  toolCalls?: ToolCall[]
  timestamp: Date
}

export interface ToolCall {
  id: string
  tool: AgentToolName
  input: Record<string, unknown>
  output?: Record<string, unknown>
  status: 'pending' | 'success' | 'error'
}

// ─── Employee Context ────────────────────────────────────────────────────────

export interface EmployeeContext {
  id: string
  email: string
  fullName: string
  roleTitle: string
  department: string
  startDate: Date
  managerId?: string
  managerName?: string
  buddyId?: string
  buddyName?: string
  currentPhase: OnboardingPhase
  dayNumber: number
  completedSteps: string[]
  pendingSteps: string[]
  complianceStatus: ComplianceStatus
}

export interface ComplianceStatus {
  totalRequired: number
  completed: number
  pending: string[]
  overdue: string[]
  nextDeadline?: Date
}

// ─── Onboarding Steps ────────────────────────────────────────────────────────

export type StepType = 'compliance' | 'learning' | 'provisioning' | 'social' | 'custom'
export type StepStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'blocked' | 'skipped'

export interface OnboardingStep {
  id: string
  journeyId: string
  stepType: StepType
  title: string
  description: string
  status: StepStatus
  dueDate?: Date
  completedAt?: Date
  metadata?: Record<string, unknown>
}

// ─── Mode Switch Decision ────────────────────────────────────────────────────

export interface ModeSwitchDecision {
  shouldSwitch: boolean
  targetMode: AgentMode
  reason: string
  confidence: number
}

// ─── Agent Response ──────────────────────────────────────────────────────────

export interface AgentResponse {
  message: string
  mode: AgentMode
  toolCalls: ToolCall[]
  modeSwitched: boolean
  previousMode?: AgentMode
  suggestedActions?: string[]
}
