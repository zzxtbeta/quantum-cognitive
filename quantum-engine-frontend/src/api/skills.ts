import type { SkillItem, SkillsResponse } from '../types/skill';

const BASE = '/chat-api';

export async function fetchSkills(): Promise<SkillsResponse> {
  const res = await fetch(`${BASE}/skills`);
  if (!res.ok) throw new Error(`GET /skills failed: ${res.status}`);
  return res.json();
}

export async function fetchSkill(name: string): Promise<SkillItem> {
  const res = await fetch(`${BASE}/skills/${name}`);
  if (!res.ok) throw new Error(`GET /skills/${name} failed: ${res.status}`);
  return res.json();
}
