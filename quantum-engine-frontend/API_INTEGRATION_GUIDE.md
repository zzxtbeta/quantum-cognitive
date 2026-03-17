# API集成指南

## 📋 概述

本文档说明如何从Mock数据切换到真实API，以及如何添加新的API端点。

## 🔄 从Mock切换到真实API

### 方法1：环境变量切换（推荐）

1. 修改 `.env.development` 或 `.env.production`：
```env
VITE_USE_MOCK=false
```

2. 重启开发服务器：
```bash
npm run dev
```

### 方法2：代码级切换

修改 `src/api/client.ts`：
```typescript
const USE_MOCK = false; // 改为 false
```

## 📝 API端点映射

### 信号相关API

| 功能 | Mock方法 | 真实API端点 | 状态 |
|------|---------|------------|------|
| 获取信号列表 | `signalApi.getSignals()` | `GET /signals` | ⏳ 待对接 |
| 获取信号详情 | `signalApi.getSignalById()` | `GET /signals/{id}` | ⏳ 待对接 |

### 领域/知识地图API

| 功能 | Mock方法 | 真实API端点 | 状态 |
|------|---------|------------|------|
| 获取领域树 | `domainApi.getDomainTree()` | `GET /gold/domains` | ✅ 已对接 |
| 获取领域详情 | `domainApi.getDomainDetail()` | `GET /gold/domains/{id}` | ✅ 已对接 |

### 公司/候选标的API

| 功能 | Mock方法 | 真实API端点 | 状态 |
|------|---------|------------|------|
| 获取候选列表 | `companyApi.getCandidates()` | `GET /candidates` | ⏳ 待对接 |
| 获取公司详情 | `companyApi.getCompanyById()` | `GET /companies/{id}` | ⏳ 待对接 |

### Chat/LLM API

| 功能 | Mock方法 | 真实API端点 | 状态 |
|------|---------|------------|------|
| 发送消息 | `chatApi.sendMessage()` | `POST /chat` | ⏳ 待对接 |

## 🔌 添加新API端点

### 步骤1：定义类型

在 `src/types/` 中定义请求和响应类型：

```typescript
// src/types/paper.ts
export interface Paper {
  id: string;
  title: string;
  abstract: string;
  // ...
}

export interface PaperListResponse {
  total: number;
  papers: Paper[];
}
```

### 步骤2：创建API服务

在 `src/api/` 中创建API服务文件：

```typescript
// src/api/papers.ts
import { apiClient, useMock } from './client';
import { Paper, PaperListResponse } from '../types';
import { mockPapers } from '../mock/papers';

export const paperApi = {
  getPapers: async (): Promise<PaperListResponse> => {
    if (useMock) {
      return { total: mockPapers.length, papers: mockPapers };
    }
    return apiClient.get<PaperListResponse>('/papers');
  },
};
```

### 步骤3：创建Mock数据

在 `src/mock/` 中创建Mock数据：

```typescript
// src/mock/papers.ts
import { Paper } from '../types';

export const mockPapers: Paper[] = [
  {
    id: '1',
    title: 'Sample Paper',
    abstract: 'This is a sample paper...',
  },
];
```

### 步骤4：创建Hook

在 `src/hooks/` 中创建自定义Hook：

```typescript
// src/hooks/usePapers.ts
import { useState, useEffect } from 'react';
import { paperApi } from '../api/papers';
import { Paper } from '../types';

export const usePapers = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPapers = async () => {
      setLoading(true);
      try {
        const response = await paperApi.getPapers();
        setPapers(response.papers);
      } finally {
        setLoading(false);
      }
    };
    fetchPapers();
  }, []);

  return { papers, loading };
};
```

### 步骤5：在组件中使用

```typescript
// src/pages/Papers.tsx
import { usePapers } from '../hooks/usePapers';

export default function Papers() {
  const { papers, loading } = usePapers();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {papers.map(paper => (
        <div key={paper.id}>{paper.title}</div>
      ))}
    </div>
  );
}
```

## 🐛 调试技巧

### 查看API请求

在浏览器开发者工具的Network标签中查看API请求。

### 添加日志

在API客户端中添加日志：

```typescript
// src/api/client.ts
async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  console.log('API Request:', endpoint, options); // 添加日志
  // ...
}
```

### 模拟API错误

在Mock实现中模拟错误：

```typescript
if (useMock) {
  // 模拟错误
  throw new Error('Simulated API error');
}
```

## 📊 API响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

## 🔐 认证

所有API请求都需要在Header中包含API Key：

```
X-API-Key: your-api-key-here
```

这在 `src/api/client.ts` 中自动处理。

## ⚠️ 注意事项

1. **类型安全**：确保API响应类型与TypeScript定义一致
2. **错误处理**：所有API调用都应该有错误处理
3. **加载状态**：使用loading状态提供用户反馈
4. **缓存策略**：考虑使用React Query等库进行数据缓存
5. **环境变量**：不要将API Key提交到版本控制

## 📚 相关文档

- [架构文档](./ARCHITECTURE.md)
- [后端API文档](../docs/量子引擎后端API说明文档.md)
- [项目总结](./PROJECT_SUMMARY.md)
