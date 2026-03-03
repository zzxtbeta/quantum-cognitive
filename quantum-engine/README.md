# 量子引擎 - 认知投资系统

一个专为量子科技投资设计的认知引擎系统，帮助投资经理快速识别、分析和跟踪投资机会。

## 🎨 设计理念

**美学定位：科技编辑部 × 瑞士现代主义**

- ✅ 黑白灰 + 琥珀橙红强调色（避免蓝紫色 AI 味）
- ✅ Bebas Neue（大标题）+ Source Sans 3（正文）
- ✅ 左侧色条优先级系统（红/琥珀/灰）
- ✅ 硬朗边框 + 高信息密度
- ✅ 专业严谨的投资工具感

## 🚀 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **路由**: React Router v6
- **图标**: Lucide React
- **字体**: Google Fonts (Bebas Neue + Source Sans 3)

## 📦 安装

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 🏗️ 项目结构

```
quantum-engine/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Layout.tsx       # 主布局
│   │   ├── Navbar.tsx       # 顶部导航
│   │   ├── Sidebar.tsx      # 侧边栏
│   │   ├── ChatDrawer.tsx   # Chat 抽屉
│   │   └── SignalCard.tsx   # 信号卡片
│   ├── pages/               # 页面组件
│   │   ├── SignalFeed.tsx   # 信号流
│   │   ├── KnowledgeMap.tsx # 知识地图
│   │   ├── Candidates.tsx   # 候选标的
│   │   ├── MyFocus.tsx      # 我的关注
│   │   └── MyNotes.tsx      # 我的笔记
│   ├── types/               # TypeScript 类型定义
│   ├── data/                # Mock 数据
│   ├── App.tsx              # 应用入口
│   ├── main.tsx             # React 入口
│   └── index.css            # 全局样式
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🎯 核心功能

### 1. 信号流（US01-03）
- 多类别信号聚合展示（论文/融资/工商/人员/政策）
- 优先级排序和筛选
- 左侧色条快速识别优先级
- 信号详情查看

### 2. Chat 认知中枢（US04）
- 右侧抽屉式交互
- 上下文感知对话
- 引用来源可追溯
- 支持继续探索

### 3. 知识地图（US12）
- 技术板块树形展示
- 技术成熟度可视化
- 趋势分析（上升/稳定/下降）
- 关联公司和信号

### 4. 候选标的发现（US11）
- 基于信号的标的推荐
- 地区和技术路线筛选
- 推荐原因说明
- 一键加入关注

### 5. 我的关注 & 笔记（US05）
- 关注列表管理
- 笔记记录和管理
- 认知轨迹追踪

## 🎨 配色方案

```css
--color-signal-high: #DC2626    /* 红色 - 高优先级 */
--color-signal-mid: #F59E0B     /* 琥珀色 - 中优先级 */
--color-signal-low: #6B7280     /* 灰色 - 低优先级 */
--color-accent: #EA580C         /* 橙色 - 强调色 */
--color-bg: #0A0A0A             /* 深黑背景 */
--color-surface: #171717        /* 表面色 */
--color-border: #262626         /* 边框色 */
--color-text: #FAFAFA           /* 主文字 */
--color-text-muted: #A3A3A3     /* 次要文字 */
```

## 🔧 开发说明

### 添加新页面
1. 在 `src/pages/` 创建新组件
2. 在 `src/App.tsx` 添加路由
3. 在 `src/components/Sidebar.tsx` 添加导航项

### 添加新数据类型
1. 在 `src/types/index.ts` 定义类型
2. 在 `src/data/mockData.ts` 添加 mock 数据

### 样式规范
- 使用 Tailwind CSS 工具类
- 遵循现有的配色方案
- 保持组件的响应式设计
- 所有交互元素添加 hover 状态

## ♿ 可访问性

- ✅ 高对比度文字（WCAG AA）
- ✅ 支持 prefers-reduced-motion
- ✅ 键盘导航友好
- ✅ 语义化 HTML 结构

## 📝 待办事项

- [ ] 接入真实后端 API
- [ ] 实现 Chat 功能（LLM 集成）
- [ ] 完善笔记系统
- [ ] 添加信号详情模态框
- [ ] 实现搜索功能
- [ ] 添加数据可视化图表
- [ ] 移动端响应式优化
- [ ] 添加用户认证

## 📄 License

MIT
