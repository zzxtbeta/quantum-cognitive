/**
 * 研究人员数据适配器
 * 将原始 Parquet 数据转换为标准化的 Researcher 类型
 */

import { Researcher, RawPeopleData, TitleLevel, Institution } from '../types/people';

/**
 * 生成唯一 ID
 */
function generateId(institution: string, name: string): string {
  const cleanName = name.split('（')[0].trim();
  return `${institution}_${cleanName}`;
}

/**
 * 提取英文名（从括号中）
 */
function extractEnglishName(name: string): string | undefined {
  if (name.includes('（') && name.includes('）')) {
    const match = name.match(/（([^）]+)）/);
    if (match) return match[1].trim();
  }
  if (name.includes('(') && name.includes(')')) {
    const match = name.match(/\(([^)]+)\)/);
    if (match) return match[1].trim();
  }
  return undefined;
}

/**
 * 清理姓名（去除括号内容）
 */
function cleanName(name: string): string {
  return name.split('（')[0].split('(')[0].trim();
}

/**
 * 标准化职称
 */
function normalizeTitle(title: string): TitleLevel {
  const t = title.toLowerCase();

  // PI/首席/院士级别
  if (/首席|院士|院长|主任/.test(title)) return 'pi';
  if (/\bpi\b/i.test(t)) return 'pi';
  if (/professor.*director/i.test(t)) return 'pi';

  // 教授/研究员级别
  if (/教授|研究员|博导|博士生导师/.test(title)) return 'professor';
  if (/(?<!(副|助理))教授/.test(title)) return 'professor';  // 正教授
  if (/\bprofessor\b/i.test(t) && !/associate/i.test(t)) return 'professor';

  // 副教授级别
  if (/副教授|副研究员/.test(title)) return 'associate';
  if (/associate.*professor/i.test(t)) return 'associate';

  // 博士后/助理级别
  if (/博士后|助理研究员|助理教授/.test(title)) return 'postdoc';
  if (/\bpostdoc\b/i.test(t)) return 'postdoc';

  // 博士生
  if (/博士|phd|博士研究生/.test(title)) return 'phd';

  return 'other';
}

/**
 * 标准化机构
 */
function normalizeInstitution(name: string): Institution {
  const n = name.toLowerCase();

  if (/北京量子|baqis/i.test(n)) return 'baqis';
  if (/粤港澳|大湾区|qscgba|广州量子/i.test(n)) return 'qscgba';
  if (/清华|tsinghua/i.test(n)) return 'tsinghua';
  if (/中科大|ustc|中国科学技术大学/i.test(n)) return 'ustc';
  if (/浙大|zju/i.test(n)) return 'zju';

  return 'other';
}

/**
 * 提取研究标签
 */
function extractResearchTags(direction: string | undefined, biography: string): string[] {
  const tags: Set<string> = new Set();
  const text = `${direction || ''} ${biography || ''}`.toLowerCase();

  // 量子领域关键词映射
  const keywordMap: Record<string, string[]> = {
    '量子计算': ['量子计算', 'quantum computing', 'quantum computation'],
    '超导量子': ['超导', 'superconducting', 'superconductivity'],
    '离子阱': ['离子阱', 'ion trap', 'trapped ion', 'iontrap'],
    '光量子': ['光量子', '光子', 'photonic', 'photon', 'optical quantum'],
    '中性原子': ['中性原子', 'neutral atom'],
    '量子通信': ['量子通信', 'quantum communication', 'qkd'],
    '量子纠错': ['量子纠错', 'quantum error correction', 'surface code', '拓扑码'],
    '量子算法': ['量子算法', 'quantum algorithm', 'quantum machine learning'],
    '量子模拟': ['量子模拟', 'quantum simulation', '量子仿真'],
    '量子网络': ['量子网络', 'quantum network', '量子中继'],
    '量子密码': ['量子密码', 'quantum cryptography', '量子密钥'],
    '量子传感': ['量子传感', '量子测量', 'quantum sensing', '精密测量'],
    '拓扑量子': ['拓扑量子', 'topological', 'majorana'],
    'NV色心': ['nv', 'nv center', '色心', 'diamond'],
    '量子材料': ['量子材料', 'quantum material'],
    '量子芯片': ['量子芯片', 'quantum chip', 'qubit'],
    '量子人工智能': ['量子人工智能', 'quantum ai', 'quantum machine learning'],
  };

  for (const [tag, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      tags.add(tag);
    }
  }

  return Array.from(tags).slice(0, 6);
}

/**
 * 从简介中解析教育背景
 */
function parseEducation(biography: string): { year?: string; degree?: string; school?: string }[] {
  const education: { year?: string; degree?: string; school?: string }[] = [];
  if (!biography) return education;

  const lines = biography.split('\n');
  let inEducationSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测教育背景章节
    if (/教育背景|education|学历/i.test(trimmed) && trimmed.length < 20) {
      inEducationSection = true;
      continue;
    }

    // 检测章节结束
    if (inEducationSection && (/^【|^[\[【]|^工作经历|^研究|^获奖/i.test(trimmed))) {
      inEducationSection = false;
      continue;
    }

    if (inEducationSection && trimmed.length > 5) {
      const edu: { year?: string; degree?: string; school?: string } = {};

      // 提取年份
      const yearMatch = trimmed.match(/(\d{4})\s*年?/);
      if (yearMatch) edu.year = yearMatch[1];

      // 提取学位
      if (/博士|ph\.?d/i.test(trimmed)) edu.degree = '博士';
      else if (/硕士|master/i.test(trimmed)) edu.degree = '硕士';
      else if (/学士|本科|bachelor/i.test(trimmed)) edu.degree = '学士';

      // 提取学校（简单启发式）
      const universities = ['哈佛', 'mit', '麻省', '斯坦福', '清华', '北大', '中科大', '浙大'];
      for (const uni of universities) {
        if (trimmed.toLowerCase().includes(uni.toLowerCase())) {
          edu.school = uni;
          break;
        }
      }

      education.push(edu);
      if (education.length >= 3) break;
    }
  }

  return education;
}

/**
 * 从简介中解析工作经历
 */
function parseCareer(biography: string): { period?: string; position?: string; organization?: string; text?: string }[] {
  const career: { period?: string; position?: string; organization?: string; text?: string }[] = [];
  if (!biography) return career;

  const lines = biography.split('\n');
  let inCareerSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测工作经历章节
    if (/工作经历|work experience|职业经历|任职/i.test(trimmed) && trimmed.length < 20) {
      inCareerSection = true;
      continue;
    }

    // 检测章节结束
    if (inCareerSection && (/^【|^[\[【]|^教育|^研究|^获奖/i.test(trimmed))) {
      inCareerSection = false;
      continue;
    }

    if (inCareerSection && trimmed.length > 5) {
      career.push({ text: trimmed.substring(0, 200) });
      if (career.length >= 3) break;
    }
  }

  return career;
}

/**
 * 将原始数据转换为标准化的 Researcher
 */
export function adaptRawToResearcher(raw: RawPeopleData): Researcher {
  const institution = normalizeInstitution(raw.institution);
  const name = cleanName(raw.name);
  const nameEn = extractEnglishName(raw.name);

  return {
    id: generateId(institution, name),
    name,
    nameEn,
    url: raw.url || '',
    title: raw.title || '未知',
    titleNormalized: normalizeTitle(raw.title),
    email: raw.email || '',
    institution,
    institutionRaw: raw.institution || '未知机构',
    department: raw.department || undefined,
    researchDirection: raw.research_direction || undefined,
    researchTags: extractResearchTags(raw.research_direction, raw.biography),
    biography: raw.biography || '',
    education: parseEducation(raw.biography),
    career: parseCareer(raw.biography),
  };
}

/**
 * 批量转换数据
 */
export function adaptRawList(rawList: RawPeopleData[]): Researcher[] {
  return rawList.map(adaptRawToResearcher);
}

/**
 * 按职称排序
 */
export function sortByTitleLevel(a: Researcher, b: Researcher): number {
  const order = { pi: 0, professor: 1, associate: 2, postdoc: 3, phd: 4, other: 5 };
  return order[a.titleNormalized] - order[b.titleNormalized];
}
