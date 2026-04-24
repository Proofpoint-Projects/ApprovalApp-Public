export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: 'APPROVER' | 'ADMIN';
}

export interface QuarantineItem {
  id: string;
  recipientEmail: string;
  sender: string;
  subject: string;
  policyName: string;
  policyReason: string;
  receivedAt: string;
  previewText: string;
}

export interface ApprovalAction {
  id: string;
  action: string;
  comment?: string | null;
  createdAt: string;
  metadataJson?: Record<string, unknown>;
}

export interface EndpointApprovalGrant {
  id: string;
  ruleId: string;
  predicateId: string;
  username: string;
  controlUsername: string;
  durationHours: number;
  justification?: string | null;
  expiresAt?: string | null;
  removeAfterAt?: string | null;
  removedAt?: string | null;
  status?: string | null;
  lastError?: string | null;
}

export interface ApprovalPreview {
  summary?: string | null;
  occurredAt?: string | null;
  mergeKey?: string | null;
  user?: Record<string, unknown>;
  incident?: Record<string, unknown>;
  ruleDetails?: Record<string, unknown>;
  indicators?: Record<string, unknown>[];
  resources?: Record<string, unknown>[];
  endpoint?: Record<string, unknown>;
  actionTypeLabels?: string[];
  policies?: Record<string, unknown>;
}

export interface ApprovalItem {
  id: string;
  source: 'ENDPOINT_ITM' | 'DLP' | 'EMAIL_QUARANTINE';
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'PROCESSING' | 'ERROR';
  requesterEmail: string;
  requesterName?: string;
  requesterExternalId?: string;
  deviceHostname?: string;
  policyName: string;
  policyReason: string;
  previewJson?: ApprovalPreview;
  payloadJson?: Record<string, unknown>;
  createdAt: string;
  decidedAt?: string;
  messageSubject?: string | null;
  messageSender?: string | null;
  approverId?: string | null;
  actions?: ApprovalAction[];
  endpointGrant?: EndpointApprovalGrant | null;
}

export interface AuditLog {
  id: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  metadataJson?: Record<string, unknown>;
}

export interface ProofpointTokenRecord {
  id: string;
  integrationKey: string;
  displayName: string;
  baseUrl: string;
  enabled: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  maskedToken: string;
  fingerprintSha256: string;
  keyVersion: string;
  notes?: string;
  updatedAt: string;
}
