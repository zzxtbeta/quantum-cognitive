export interface SkillItem {
  name: string;
  description: string;
  scope: 'chat-agent' | 'deep-research' | 'unknown';
  agent: string;
  version: string;
  allowed_tools: string[];
  body_preview: string;
  full_path: string;
}

export interface SkillsResponse {
  skills: SkillItem[];
  total: number;
  scopes: Record<string, number>;
}
