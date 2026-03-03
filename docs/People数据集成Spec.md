# 量子科技研究人员数据集成 Spec

## 一、数据现状

| 机构 | 文件 | 记录数 | 特点 |
|------|------|--------|------|
| 北京量子院 | baqis_result.parquet | 120 | 数据完整 |
| 粤港澳大湾区量子中心 | qscgba_result.parquet | 106 | department字段多为空 |
| 清华大学 | tsinghua_result.parquet | 51 | email全部为空 |
| 中科大 | ustc_result.parquet | 168 | 数据量最大 |
| 浙江大学 | zju_result.parquet | 52 | URL有重复 |

**总计：497条研究人员记录**

---

## 二、集成策略

由于 Parquet 格式无法被前端直接解析，且后期将迁移到后端 API，采用**适配器模式 + 预转换脚本**策略：

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Parquet文件   │ ──→ │  预转换脚本(.py)  │ ──→ │  people.json    │
│   (5个文件)     │     │  生成静态JSON     │     │  (前端直接读取)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ↓
                       ┌──────────────────┐
                       │  后期：后端API    │
                       │  接口格式保持一致 │
                       └──────────────────┘
```

---

## 三、数据类型定义

### 3.1 核心类型 (`src/types/people.ts`)

```typescript
// 研究人员基础信息
export interface Researcher {
  id: string;                    // 唯一标识：institution_name (如: ustc_潘建伟)
  name: string;                  // 姓名
  nameEn?: string;               // 英文名（从biography解析）
  url: string;                   // 个人主页
  title: string;                 // 职称
  titleNormalized: TitleLevel;   // 标准化职称（见下文）
  email: string;                 // 邮箱（可能为空）

  // 机构信息
  institution: Institution;      // 所属机构（枚举）
  institutionRaw: string;        // 原始机构名称
  department?: string;           // 部门（可能为空）

  // 研究方向
  researchDirection?: string;    // 研究方向原始文本
  researchTags: string[];        // 提取的研究标签（AI/规则提取）

  // 详细信息
  biography: string;             // 完整简介
  education?: Education[];       // 教育背景（从biography解析）
  career?: Career[];             // 工作经历（从biography解析）

  // 关联信息（后期填充）
  paperCount?: number;           // 关联论文数量
  companyLinks?: CompanyLink[];  // 关联公司（创业/任职）
}

// 标准化职称层级
export type TitleLevel =
  | 'pi'           // 首席科学家/PI/院士/院长
  | 'professor'    // 教授/研究员/博导
  | 'associate'    // 副教授/副研究员
  | 'postdoc'      // 博士后/助理研究员
  | 'phd'          // 博士生
  | 'other';       // 其他/未知

// 机构枚举
export type Institution =
  | 'baqis'        // 北京量子院
  | 'qscgba'       // 粤港澳量子中心
  | 'tsinghua'     // 清华
  | 'ustc'         // 中科大
  | 'zju';         // 浙大

// 教育背景
export interface Education {
  year?: string;
  degree?: string;
  school?: string;
  field?: string;
}

// 工作经历
export interface Career {
  period?: string;
  position?: string;
  organization?: string;
}

// 公司关联
export interface CompanyLink {
  companyId: string;
  companyName: string;
  role: 'founder' | 'advisor' | 'employee' | 'unknown';
  joinDate?: string;
}

// 筛选参数
export interface ResearcherFilters {
  institution?: Institution[];
  titleLevel?: TitleLevel[];
  researchTag?: string[];
  hasEmail?: boolean;
  hasBiography?: boolean;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

// 响应类型
export interface ResearcherListResponse {
  total: number;
  page: number;
  pageSize: number;
  researchers: Researcher[];
}
```

---

## 四、前端架构设计

### 4.1 目录结构

```
src/
├── types/
│   └── people.ts              # 人员类型定义
├── api/
│   └── researchers.ts         # API封装（先读JSON，后切API）
├── hooks/
│   └── useResearchers.ts      # 数据获取Hook
├── adapters/
│   └── researcherAdapter.ts   # 数据清洗适配器
├── components/
│   ├── researcher/
│   │   ├── ResearcherCard.tsx      # 人员卡片
│   │   ├── ResearcherDetail.tsx    # 详情弹窗
│   │   ├── InstitutionBadge.tsx    # 机构标识
│   │   └── ResearchTagCloud.tsx    # 研究方向标签云
│   └── shared/
│       └── ParquetLoader.tsx       # 文件上传组件（后期用）
├── pages/
│   └── Researchers.tsx         # 人才库主页面
├── data/
│   └── people.json            # 预转换的JSON数据
└── utils/
    └── researcherParser.ts    # 文本解析工具
```

### 4.2 关键实现

#### A. 数据适配器 (`src/adapters/researcherAdapter.ts`)

```typescript
// 原始Parquet数据 → 标准化Researcher
export function adaptRawToResearcher(raw: RawPeopleData): Researcher {
  return {
    id: generateId(raw.institution, raw.name),
    name: extractName(raw.name),
    nameEn: extractEnglishName(raw.name),
    url: raw.url,
    title: raw.title,
    titleNormalized: normalizeTitle(raw.title),
    email: raw.email,
    institution: normalizeInstitution(raw.institution),
    institutionRaw: raw.institution,
    department: raw.department || undefined,
    researchDirection: raw.research_direction || undefined,
    researchTags: extractResearchTags(raw.research_direction, raw.biography),
    biography: raw.biography,
    education: parseEducation(raw.biography),
    career: parseCareer(raw.biography),
  };
}

// 职称标准化
function normalizeTitle(title: string): TitleLevel {
  const t = title.toLowerCase();
  if (/首席|院士|院长|pi|professor.*director/i.test(t)) return 'pi';
  if (/教授|研究员|博导|professor/i.test(t)) return 'professor';
  if (/副教授|副研究员|associate/i.test(t)) return 'associate';
  if (/博士后|助理研究员|postdoc/i.test(t)) return 'postdoc';
  if (/博士|phd/i.test(t)) return 'phd';
  return 'other';
}

// 机构标准化
function normalizeInstitution(name: string): Institution {
  if (/北京量子|baqis/i.test(name)) return 'baqis';
  if (/粤港澳|大湾区|qscgba/i.test(name)) return 'qscgba';
  if (/清华|tsinghua/i.test(name)) return 'tsinghua';
  if (/中科大|ustc|科学技术大学/i.test(name)) return 'ustc';
  if (/浙大|zju/i.test(name)) return 'zju';
  throw new Error(`Unknown institution: ${name}`);
}
```

#### B. Hook (`src/hooks/useResearchers.ts`)

```typescript
export const useResearchers = (filters?: ResearcherFilters) => {
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // V1: 从JSON文件加载
    fetch('/data/people.json')
      .then(r => r.json())
      .then(data => {
        const adapted = data.map(adaptRawToResearcher);
        setResearchers(filterResearchers(adapted, filters));
      });
  }, [filters]);

  return { researchers, loading };
};
```

---

## 五、UI 设计

### 5.1 新增页面：人才库 (`/researchers`)

```
┌──────────────────────────────────────────────────────────────┐
│  QUANTUM TALENT POOL                              [搜索框]  │
│  量子科技领域研究人员 · 497人                                  │
├──────────────────────────────────────────────────────────────┤
│ 筛选栏                                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [机构▼] [职称▼] [研究方向▼] [有邮箱☑] [有简介☑]         │ │
│ │ 中科大(168) 北京量子院(120) 粤港澳(106) 浙大(52) 清华(51) │ │
│ └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ 人员卡片网格                                                   │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ [USTC]          │ │ [BAQIS]         │ │ [清华]          │ │
│ │ 潘建伟           │ │ 某某研究员       │ │ 姚期智          │ │
│ │ ─────────────── │ │ ─────────────── │ │ ─────────────── │ │
│ │ 首席科学家       │ │ 教授            │ │ 院长, 教授      │ │
│ │ 量子计算...      │ │ 超导量子...      │ │ 算法,密码学...  │ │
│ │ ─────────────── │ │ ─────────────── │ │ ─────────────── │ │
│ │ 📧 ✓  📄 详细    │ │ 📧 ✗  📄 详细   │ │ 📧 ✗  📄 详细   │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 人员卡片组件

```typescript
interface ResearcherCardProps {
  researcher: Researcher;
  onClick?: () => void;
  onSendToChat?: () => void;  // 拖拽到Chat功能
}
```

### 5.3 与其他模块的关联

| 模块 | 集成点 |
|------|--------|
| **信号流** | 论文信号的作者 → 关联到人才库 |
| **候选标的** | 公司创始人 → 关联到人才库 |
| **知识地图** | 技术路线的核心作者 → 展示Top研究人员 |
| **Chat** | 可拖拽人员到Chat询问背景 |

---

## 六、实施步骤

### Phase 1: 数据准备（1-2天）
1. 编写 Python 脚本将 5 个 Parquet 合并并转换为 `people.json`
2. 清洗数据：URL去重、空值处理、研究方向标签提取
3. 将 JSON 放入 `public/data/people.json`

### Phase 2: 基础功能（2-3天）
1. 定义 TypeScript 类型
2. 实现数据适配器
3. 创建 `useResearchers` hook
4. 实现研究人员列表页面
5. 实现人员详情弹窗

### Phase 3: 关联集成（1-2天）
1. 在信号详情页，论文作者可点击 → 跳转人才库
2. 在候选标的页，创始人可点击 → 跳转人才库
3. 支持拖拽人员到 Chat

---

## 七、发现的现有 Bug（建议一并修复）

| Bug | 位置 | 问题 | 修复建议 |
|-----|------|------|----------|
| **1** | `SignalDetailModal.tsx:44-45` | 相关信号使用 `realWorldSignals` mock 数据 | 应从 API 获取真实相关信号 |
| **2** | `SignalDetailModal.tsx:59-64` | 公司名称提取逻辑太简陋，容易误判 | 使用正则或从 structuredInfo 中提取 |
| **3** | `signals.ts:136-148` | `getSignalById` 找不到 paper 时直接报错 | 返回友好错误状态或 fallback 到 mock |
| **4** | `Layout.tsx:92` | Sidebar toggle 按钮位置计算在折叠时可能有视觉偏移 | 添加 `left: 8px` 边距避免贴边 |
| **5** | `KnowledgeMap.tsx:156-184` | `useEffect` 依赖数组可能触发不必要的重选 | 拆分为两个 effect，分别处理初始化逻辑 |
| **6** | `SignalCard.tsx:108-113` | "Chat" 按钮点击无响应 | 绑定打开 Chat 抽屉的事件 |

---

## 八、数据保留建议

建议保留 Parquet 文件作为原始数据源，同时提供转换后的 JSON。当后端 API 完成后，只需修改 `useResearchers` hook 的请求逻辑，**数据格式保持不变**。
