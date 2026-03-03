# 开发者指南

## 🚀 快速开始

### 安装依赖

```bash
cd quantum-engine
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
npm run build
```

## 📖 核心概念

### 1. 分层架构

我们的应用采用清晰的分层架构：

```
Pages (页面) 
  ↓ 使用
Hooks (业务逻辑)
  ↓ 调用
API (数据服务)
  ↓ 返回
Types (类型定义)
```

### 2. 数据流

```
用户操作 → 组件事件 → Hook更新 → API调用 → 数据更新 → UI重渲染
```

## 🛠️ 开发工作流

### 添加新功能的标准流程

#### 步骤1：定义类型

在 `src/types/` 中定义数据结构：

```typescript
// src/types/paper.ts
export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
}

export interface PaperListResponse {
  total: number;
  papers: Paper[];
}
```

#### 步骤2：创建Mock数据

在 `src/mock/` 中创建测试数据：

```typescript
// src/mock/papers.ts
import { Paper } from '../types';

export const mockPapers: Paper[] = [
  {
    id: '1',
    title: 'Quantum Computing Breakthrough',
    abstract: 'We demonstrate...',
    authors: ['Zhang Wei', 'Li Ming'],
  },
];
```

#### 步骤3：实现API服务

在 `src/api/` 中实现API调用：

```typescript
// src/api/papers.ts
import { apiClient, useMock } from './client';
import { Paper, PaperListResponse } from '../types';
import { mockPapers } from '../mock/papers';

export const paperApi = {
  getPapers: async (): Promise<PaperListResponse> => {
    if (useMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { total: mockPapers.length, papers: mockPapers };
    }
    return apiClient.get<PaperListResponse>('/papers');
  },

  getPaperById: async (id: string): Promise<Paper> => {
    if (useMock) {
      const paper = mockPapers.find(p => p.id === id);
      if (!paper) throw new Error(`Paper not found: ${id}`);
      return paper;
    }
    return apiClient.get<Paper>(`/papers/${id}`);
  },
};
```

#### 步骤4：创建Hook

在 `src/hooks/` 中封装业务逻辑：

```typescript
// src/hooks/usePapers.ts
import { useState, useEffect } from 'react';
import { paperApi } from '../api/papers';
import { Paper } from '../types';

export const usePapers = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPapers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await paperApi.getPapers();
        setPapers(response.papers);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    fetchPapers();
  }, []);

  return { papers, loading, error };
};
```

#### 步骤5：创建组件

在 `src/components/` 中创建UI组件：

```typescript
// src/components/paper/PaperCard.tsx
import { Paper } from '../../types';

interface PaperCardProps {
  paper: Paper;
  onClick?: () => void;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onClick }) => {
  return (
    <div onClick={onClick} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 cursor-pointer hover:border-orange-600 transition-colors">
      <h3 className="font-bold text-lg mb-2">{paper.title}</h3>
      <p className="text-neutral-400 text-sm mb-2">{paper.abstract}</p>
      <div className="text-xs text-neutral-500">
        作者：{paper.authors.join(', ')}
      </div>
    </div>
  );
};
```

#### 步骤6：创建页面

在 `src/pages/` 中组装完整页面：

```typescript
// src/pages/Papers.tsx
import { usePapers } from '../hooks/usePapers';
import { PaperCard } from '../components/paper/PaperCard';

export default function Papers() {
  const { papers, loading, error } = usePapers();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1 className="font-display text-5xl text-orange-600 mb-8">PAPERS</h1>
      <div className="space-y-4">
        {papers.map(paper => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </div>
  );
}
```

## 🔍 常见任务

### 切换Mock/真实API

修改 `.env.development`：

```env
# 使用Mock数据
VITE_USE_MOCK=true

# 使用真实API
VITE_USE_MOCK=false
```

### 添加新的筛选条件

1. 更新类型定义：
```typescript
// src/types/signal.ts
export interface SignalFilters {
  type?: SignalType;
  priority?: SignalPriority;
  dateRange?: string; // 新增
}
```

2. 更新API调用：
```typescript
// src/api/signals.ts
getSignals: async (filters?: SignalFilters) => {
  // 处理新的筛选条件
}
```

3. 更新Hook：
```typescript
// src/hooks/useSignals.ts
// Hook会自动支持新的筛选条件
```

4. 更新UI：
```typescript
// src/pages/SignalFeed.tsx
<select onChange={(e) => updateFilters({ dateRange: e.target.value })}>
  <option value="today">今天</option>
  <option value="week">本周</option>
</select>
```

### 添加Loading状态

所有Hooks都返回loading状态：

```typescript
const { data, loading, error } = useYourHook();

if (loading) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
```

### 处理错误

```typescript
const { data, loading, error } = useYourHook();

if (error) {
  return (
    <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
      <p className="text-red-500">错误：{error.message}</p>
    </div>
  );
}
```

## 🎨 样式规范

### Tailwind CSS类名顺序

推荐顺序：布局 → 尺寸 → 间距 → 颜色 → 文字 → 边框 → 效果

```typescript
className="flex items-center gap-4 px-4 py-2 bg-neutral-900 text-white border border-neutral-800 rounded-lg hover:border-orange-600 transition-colors"
```

### 颜色使用规范

- **主色**：`orange-600` (橙色)
- **强调色**：`red-600` (红色，用于高优先级)
- **中性色**：`neutral-*` (灰色系)
- **背景**：`neutral-900` (深灰)
- **边框**：`neutral-800` (中灰)
- **文字**：`neutral-200` (浅灰)

### 避免的颜色

❌ 不要使用蓝色和紫色（AI味太重）

## 🧪 调试技巧

### 查看API请求

打开浏览器开发者工具 → Network标签 → 查看XHR请求

### 添加调试日志

```typescript
// 在Hook中添加日志
useEffect(() => {
  console.log('Filters changed:', filters);
  fetchData();
}, [filters]);
```

### 使用React DevTools

安装React DevTools浏览器扩展，可以查看：
- 组件树
- Props和State
- Hook状态

## 📁 文件命名规范

- **组件**：PascalCase（`SignalCard.tsx`）
- **Hook**：camelCase + use前缀（`useSignals.ts`）
- **API**：camelCase（`signals.ts`）
- **类型**：camelCase（`signal.ts`）
- **工具**：camelCase（`formatDate.ts`）

## 🔗 相关文档

- [架构文档](./ARCHITECTURE.md) - 完整架构设计
- [重构总结](./REFACTORING_SUMMARY.md) - 重构说明
- [API集成指南](./API_INTEGRATION_GUIDE.md) - API对接指南
- [项目总结](./PROJECT_SUMMARY.md) - 功能总结

## 💡 最佳实践

### ✅ 推荐做法

1. **使用Hooks管理状态**
```typescript
const { data, loading } = useYourHook();
```

2. **类型优先开发**
```typescript
// 先定义类型
interface NewFeature { ... }
// 再实现功能
```

3. **组件保持简单**
```typescript
// 组件只负责UI渲染
// 业务逻辑放在Hook中
```

4. **使用环境变量**
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

### ❌ 避免做法

1. **不要在组件中直接调用API**
```typescript
// ❌ 避免
useEffect(() => {
  fetch('/api/data').then(...)
}, []);

// ✅ 使用Hook
const { data } = useData();
```

2. **不要硬编码配置**
```typescript
// ❌ 避免
const API_URL = 'http://localhost:8080';

// ✅ 使用环境变量
const API_URL = import.meta.env.VITE_API_BASE_URL;
```

3. **不要忽略TypeScript错误**
```typescript
// ❌ 避免
// @ts-ignore

// ✅ 修复类型问题
```

## 🆘 常见问题

### Q: 如何添加新的API端点？

A: 参考[API集成指南](./API_INTEGRATION_GUIDE.md)的"添加新API端点"章节。

### Q: Mock数据不生效？

A: 检查 `.env.development` 中 `VITE_USE_MOCK=true`，并重启开发服务器。

### Q: 类型错误如何解决？

A: 确保在 `src/types/` 中定义了完整的类型，并在 `index.ts` 中导出。

### Q: 如何调试Hook？

A: 使用 `console.log` 或 React DevTools 查看Hook状态。

---

**Happy Coding! 🚀**
