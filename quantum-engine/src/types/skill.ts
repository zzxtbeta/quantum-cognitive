export interface SkillItem {
  name: string;
  description: string;
  when_to_use: string;
  instructions_preview: string;
  created_at: string;
}

export interface SkillsResponse {
  skills: SkillItem[];
  total: number;
}
