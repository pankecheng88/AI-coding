export interface CheckRequest {
  text?: string;
  url?: string;
}

export interface TaskResponse {
  task_id: string;
}

export interface ProgressInfo {
  step: string;
  message: string;
  percent: number;
}

export interface CredibilityRating {
  level: "trusted" | "dubious" | "fake";
  score: number;
  summary: string;
}

export interface VerdictClaim {
  id: number;
  text: string;
  verdict: "true" | "false" | "dubious";
  confidence: number;
  evidence: string;
  sources: string[];
}

export interface TimelineEvent {
  time: string;
  event: string;
  platform: string;
  url: string | null;
}

export interface EvidenceItem {
  url: string;
  explanation: string;
}

export interface EvidenceSummary {
  supporting: EvidenceItem[];
  opposing: EvidenceItem[];
  neutral: EvidenceItem[];
}

export interface NarrativeNode {
  description: string;
  sources: string[];
}

export interface NarrativeBranch {
  description: string;
  diff: string;
  sources: string[];
}

export interface NarrativeTree {
  root: NarrativeNode;
  branches: NarrativeBranch[];
}

export interface CheckResult {
  credibility_rating: CredibilityRating;
  claims: VerdictClaim[];
  timeline: TimelineEvent[];
  narrative_tree: NarrativeTree | null;
  evidence_summary: EvidenceSummary;
}

export interface TaskStatus {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  input_text: string | null;
  input_url: string | null;
  progress: ProgressInfo | null;
  result: CheckResult | null;
  error: string | null;
  created_at: string | null;
}
