# 数据架构说明

## 概述

本项目采用优雅的数据层架构设计，确保Mock数据与真实API的无缝切换，同时保持代码的可维护性和可扩展性。

## 架构设计

### ⚠️ 重要说明

**当前Mock数据的schema仅用于前端开发，并非最终API的实际返回格式。**

真实API接入时需要：
1. 在`src/api/signals.ts`中添加数据适配层（Adapter）
2. 将后端API响应转换为前端使用的类型定义
3. 前端类型定义（`src/types/signal.ts`）保持不变，UI组件无需修改

### 1. 数据流向

```
UI Components → Hooks → API Layer → [Adapter] → Backend API
                                  ↓
                              Mock Data (开发环境)
```

**适配器模式（Adapter Pattern）**：
- Mock环境：直接返回前端类型数据
- API环境：通过Adapter将后端响应转换为前端类型

### 2. 核心文件

#### 数据源层
- `src/data/realWorldSignals.ts` - 真实量子科技行业信号数据（30+条）
  - 产业化进展（本源悟空、国盾量子等）
  - 融资事件（本源量子C轮、启科量子A+轮等）
  - 政策规划（国家量子信息科学研究中心等）
  - 技术发布（量子芯片、量子云平台等）
  - 人才组织（院士增选、研究中心成立等）
  - 论文（Nature、Science等顶刊）

#### API层
- `src/api/client.ts` - HTTP客户端封装
  - 支持GET/POST请求
  - 统一错误处理
  - 查询参数处理

- `src/api/signals.ts` - 信号API接口
  - `getSignals()` - 获取信号列表（支持筛选、分页）
  - `getSignalById()` - 获取信号详情
  - 根据`useMock`标志自动切换数据源

#### Hooks层
- `src/hooks/useSignals.ts` - 信号数据Hook
  - 封装数据获取逻辑
  - 提供loading/error状态
  - 支持筛选条件更新

### 3. 环境配置

通过环境变量控制数据源：

```env
# .env.development / .env.production
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK_DATA=true  # true使用Mock，false使用真实API
```

### 4. 切换数据源

#### 开发环境（使用Mock数据）
```bash
# .env.development
VITE_USE_MOCK_DATA=true
```

#### 生产环境（使用真实API）
```bash
# .env.production
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.yourdomain.com
```

## 数据特点

### 真实性
所有Mock数据基于真实量子科技行业信息：
- 本源量子"悟空"超导量子计算机（2025年1月上线）
- 国盾量子城域量子通信网络商用部署
- 中科大量子团队Nature/Science论文
- 真实的融资事件、政策规划、技术发布

### 时间跨度
- 2024年8月 - 2026年2月
- 覆盖近期和未来的量子科技发展动态

### 数据分类
- 产业化进展：4条
- 融资事件：3条
- 政策规划：3条
- 技术发布：4条
- 人才组织：3条
- 论文：8条

## 扩展指南

### 添加新的数据类型

1. 在`src/types/signal.ts`中扩展`SignalType`
2. 在`src/data/realWorldSignals.ts`中添加数据
3. 更新UI组件的类型筛选器

### 接入真实API

**重要：真实API的响应格式与当前Mock数据不同，需要添加适配层。**

#### 步骤1：创建API响应类型

在`src/types/api.ts`中定义后端API的实际响应格式：

```typescript
// 后端API的实际响应格式（示例）
export interface BackendSignalResponse {
  id: string;
  title: string;
  signal_type: string;  // 注意：后端可能用snake_case
  source_name: string;
  created_at: string;
  priority_level: number;  // 后端可能用数字表示优先级
  content: string;
  entities: {
    company_count: number;
    person_count: number;
    tech_count: number;
  };
}
```

#### 步骤2：创建数据适配器

在`src/api/adapters/signalAdapter.ts`中创建适配器：

```typescript
import { Signal } from '../../types';
import { BackendSignalResponse } from '../../types/api';

export function adaptSignal(backendSignal: BackendSignalResponse): Signal {
  return {
    id: backendSignal.id,
    title: backendSignal.title,
    type: mapSignalType(backendSignal.signal_type),
    source: backendSignal.source_name,
    timestamp: backendSignal.created_at,
    priority: mapPriority(backendSignal.priority_level),
    summary: backendSignal.content.substring(0, 200),
    relatedEntities: {
      companies: backendSignal.entities.company_count,
      people: backendSignal.entities.person_count,
      technologies: backendSignal.entities.tech_count,
    },
  };
}

function mapSignalType(backendType: string): SignalType {
  const typeMap: Record<string, SignalType> = {
    'paper': '论文',
    'policy': '政策规划',
    'funding': '融资事件',
    'industry': '产业化进展',
    'tech_release': '技术发布',
    'talent': '人才组织',
  };
  return typeMap[backendType] || '产业化进展';
}

function mapPriority(level: number): SignalPriority {
  if (level >= 8) return 'high';
  if (level >= 5) return 'mid';
  return 'low';
}
```

#### 步骤3：更新API层使用适配器

在`src/api/signals.ts`中：

```typescript
import { adaptSignal } from './adapters/signalAdapter';

export const signalApi = {
  getSignals: async (filters?: SignalFilters): Promise<SignalListResponse> => {
    if (useMock) {
      // Mock实现保持不变
      return mockImplementation();
    }

    // 真实API实现 - 使用适配器
    const response = await apiClient.get<BackendSignalListResponse>('/signals', {
      type: filters?.type,
      priority: filters?.priority,
      // ... 其他参数
    });

    // 适配后端响应为前端类型
    return {
      total: response.total_count,
      page: response.current_page,
      pageSize: response.page_size,
      signals: response.items.map(adaptSignal),  // 使用适配器转换
    };
  },
};
```

#### 步骤4：环境配置

```bash
# .env.production
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.yourdomain.com
```

## 最佳实践

1. **类型隔离** - 前端类型（`src/types/`）与后端API响应类型（`src/types/api.ts`）分离
2. **适配器模式** - 使用Adapter将后端响应转换为前端类型，UI组件无需关心后端格式
3. **环境隔离** - 开发用Mock，生产用API，通过环境变量控制
4. **数据真实性** - Mock数据应基于真实业务场景，便于测试和演示
5. **解耦设计** - UI组件只依赖前端类型定义，不直接依赖数据源
6. **渐进式迁移** - 先用Mock快速开发，后续通过Adapter无缝切换到真实API
7. **类型安全** - 前后端类型都用TypeScript定义，编译时发现问题

## 架构优势

### 为什么使用适配器模式？

1. **前端类型稳定** - UI组件使用的数据结构不会因后端API变化而改变
2. **易于维护** - 后端API调整时，只需修改Adapter，不影响UI代码
3. **开发效率** - 前端可以先用Mock数据快速开发，不依赖后端进度
4. **测试友好** - Mock数据和真实数据使用相同的前端类型，测试代码可复用
5. **团队协作** - 前后端可以并行开发，通过类型定义约定接口

### 数据流示意图

```
┌─────────────┐
│ UI Component│
└──────┬──────┘
       │ 使用前端类型 (Signal)
       ↓
┌──────────────┐
│   useSignals │
│     Hook     │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  signals.ts  │
│   API Layer  │
└──┬───────┬───┘
   │       │
   │       └─────────────┐
   │ Mock环境            │ API环境
   ↓                     ↓
┌──────────────┐    ┌──────────────┐
│realWorldSignals│  │ Adapter      │
│  (前端类型)   │    │ (类型转换)   │
└──────────────┘    └──────┬───────┘
                           │
                           ↓
                    ┌──────────────┐
                    │ Backend API  │
                    │ (后端类型)   │
                    └──────────────┘
```

## 注意事项

- Mock数据仅用于开发和演示，生产环境必须使用真实API
- 定期更新Mock数据以反映最新的行业动态
- API响应时间模拟（300ms）接近真实网络延迟，便于测试loading状态
- 所有时间戳使用ISO 8601格式（YYYY-MM-DD）
