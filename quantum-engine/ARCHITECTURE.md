# 量子引擎前端架构文档

## 📁 项目结构

```
src/
├── api/                    # API服务层
│   ├── client.ts          # API客户端配置（axios/fetch封装）
│   ├── signals.ts         # 信号相关API
│   ├── papers.ts          # 论文相关API
│   ├── domains.ts         # 领域/知识地图API
│   ├── companies.ts       # 公司相关API
│   └── chat.ts            # Chat/LLM相关API
│
├── components/            # UI组件
│   ├── common/           # 通用组件
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Select.tsx
│   │   └── Badge.tsx
│   ├── layout/           # 布局组件
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── signal/           # 信号相关组件
│   │   ├── SignalCard.tsx
│   │   ├── SignalDetailModal.tsx
│   │   ├── SignalFilters.tsx
│   │   └── SignalList.tsx
│   ├── knowledge/        # 知识地图组件
│   │   ├── TechTree.tsx
│   │   ├── TechNodeDetail.tsx
│   │   └── TechNodeCard.tsx
│   ├── candidate/        # 候选标的组件
│   │   ├── CandidateCard.tsx
│   │   └── CandidateFilters.tsx
│   └── chat/             # Chat组件
│       ├── ChatDrawer.tsx
│       ├── ChatMessage.tsx
│       └── ChatInput.tsx
│
├── hooks/                # 自定义Hooks
│   ├── useSignals.ts     # 信号数据管理
│   ├── useDomains.ts     # 领域数据管理
│   ├── useChat.ts        # Chat状态管理
│   └── useModal.ts       # 模态框状态管理
│
├── pages/                # 页面组件
│   ├── SignalFeed.tsx
│   ├── KnowledgeMap.tsx
│   ├── Candidates.tsx
│   ├── MyFocus.tsx
│   └── MyNotes.tsx
│
├── types/                # TypeScript类型定义
│   ├── index.ts          # 导出所有类型
│   ├── signal.ts         # 信号相关类型
│   ├── domain.ts         # 领域相关类型
│   ├── company.ts        # 公司相关类型
│   └── api.ts            # API响应类型
│
├── utils/                # 工具函数
│   ├── date.ts           # 日期处理
│   ├── format.ts         # 格式化函数
│   └── constants.ts      # 常量定义
│
├── store/                # 状态管理（可选：Zustand/Redux）
│   ├── signalStore.ts
│   └── uiStore.ts
│
└── mock/                 # Mock数据（开发阶段）
    ├── signals.ts
    ├── domains.ts
    └── companies.ts
```

## 🏗️ 架构设计原则

### 1. 分层架构

```
┌─────────────────────────────────────┐
│         Pages (页面层)               │  ← 路由、页面级状态
├─────────────────────────────────────┤
│      Components (组件层)             │  ← UI展示、用户交互
├─────────────────────────────────────┤
│        Hooks (逻辑层)                │  ← 业务逻辑、状态管理
├─────────────────────────────────────┤
│         API (服务层)                 │  ← 数据获取、API调用
├─────────────────────────────────────┤
│      Types (类型层)                  │  ← 类型定义、接口约束
└─────────────────────────────────────┘
```

### 2. 数据流

```
API Layer → Hooks → Components → Pages
   ↓
Mock Data (开发阶段)
   ↓
Real API (生产阶段)
```

### 3. 组件设计原则

- **单一职责**：每个组件只做一件事
- **可复用性**：通用组件放在common目录
- **可测试性**：组件逻辑与UI分离
- **类型安全**：所有props和state都有类型定义

## 🔌 API服务层设计

### API Client 配置

```typescript
// src/api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://120.26.144.61:8080';
const API_KEY = import.meta.env.VITE_API_KEY || 'xK7mP9nQ2wR5tY8uI1oL4aS6dF3gH0jK';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use((config) => {
  // 可以在这里添加loading状态
  return config;
});

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 统一错误处理
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
```

### API服务示例

```typescript
// src/api/signals.ts
import { apiClient } from './client';
import { Signal, SignalListResponse } from '../types';

export const signalApi = {
  // 获取信号列表
  getSignals: async (params: {
    page?: number;
    page_size?: number;
    type?: string;
    priority?: string;
  }): Promise<SignalListResponse> => {
    return apiClient.get('/signals', { params });
  },

  // 获取单个信号详情
  getSignalById: async (id: string): Promise<Signal> => {
    return apiClient.get(`/signals/${id}`);
  },
};
```

## 🎣 Hooks设计

### useSignals Hook

```typescript
// src/hooks/useSignals.ts
import { useState, useEffect } from 'react';
import { signalApi } from '../api/signals';
import { Signal } from '../types';

export const useSignals = (filters?: {
  type?: string;
  priority?: string;
}) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSignals = async () => {
      setLoading(true);
      try {
        const data = await signalApi.getSignals(filters);
        setSignals(data.signals);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, [filters]);

  return { signals, loading, error };
};
```

## 🎨 组件设计规范

### 组件模板

```typescript
// src/components/signal/SignalCard.tsx
import { Signal } from '../../types';

interface SignalCardProps {
  signal: Signal;
  onClick?: (signal: Signal) => void;
  className?: string;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  onClick,
  className = '',
}) => {
  // 组件逻辑
  return (
    // JSX
  );
};
```

## 🔄 从Mock到真实API的迁移路径

### 阶段1：Mock数据（当前）
```typescript
// src/api/signals.ts
import { mockSignals } from '../mock/signals';

export const signalApi = {
  getSignals: async () => {
    return Promise.resolve({ signals: mockSignals });
  },
};
```

### 阶段2：真实API
```typescript
// src/api/signals.ts
import { apiClient } from './client';

export const signalApi = {
  getSignals: async (params) => {
    return apiClient.get('/signals', { params });
  },
};
```

**迁移时只需修改API层，Hooks和Components无需改动！**

## 📝 命名规范

### 文件命名
- 组件文件：PascalCase（SignalCard.tsx）
- Hook文件：camelCase（useSignals.ts）
- 工具文件：camelCase（formatDate.ts）
- 类型文件：camelCase（signal.ts）

### 变量命名
- 组件：PascalCase（SignalCard）
- Hook：camelCase + use前缀（useSignals）
- 常量：UPPER_SNAKE_CASE（API_BASE_URL）
- 函数：camelCase（fetchSignals）

## 🚀 开发流程

1. **定义类型**：在types目录定义数据结构
2. **创建Mock数据**：在mock目录创建测试数据
3. **实现API层**：在api目录实现API调用（先用mock）
4. **创建Hooks**：在hooks目录封装业务逻辑
5. **开发组件**：在components目录开发UI组件
6. **组装页面**：在pages目录组装完整页面
7. **接入真实API**：替换API层的mock实现

## 🔧 环境变量配置

```env
# .env.development
VITE_API_BASE_URL=http://localhost:8080
VITE_API_KEY=mock-api-key
VITE_USE_MOCK=true

# .env.production
VITE_API_BASE_URL=http://120.26.144.61:8080
VITE_API_KEY=xK7mP9nQ2wR5tY8uI1oL4aS6dF3gH0jK
VITE_USE_MOCK=false
```

## 📊 状态管理策略

### 本地状态（useState）
- UI状态（模态框开关、选中项等）
- 表单输入

### 服务端状态（Hooks + API）
- 信号列表
- 知识地图数据
- 候选标的

### 全局状态（可选：Zustand）
- 用户信息
- 全局配置
- Chat历史

## 🎯 下一步重构计划

1. ✅ 创建架构文档
2. 🔄 重构目录结构
3. 🔄 创建API服务层
4. 🔄 实现自定义Hooks
5. 🔄 重构现有组件
6. 🔄 添加环境变量配置
7. 🔄 编写组件文档

---

**这个架构设计确保了代码的可维护性、可扩展性和可测试性，为后续接入真实API打下坚实基础。**
