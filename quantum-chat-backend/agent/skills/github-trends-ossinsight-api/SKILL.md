---
name: github-trends-ossinsight-api
description: 使用 OSS Insight API 查询 GitHub 热门趋势项目，获取 trending repos 数据并分析技术赛道信号
license: internal
compatibility: 量子认知助手 deepagent（生成于 2026-03-03）
allowed_tools: tavily_search write_todos
---

# github-trends-ossinsight-api

## When to Use
- 用户需要查询 GitHub 热门/趋势项目时
- 需要分析某技术赛道的开源生态成熟度
- 需要发现早期高增长潜力的开源项目
- 需要对比多个同类项目的社区热度
- 需要追踪某技术领域的最新动向

## Instructions
## 使用方法

### 1. API 调用
```bash
curl -L -X GET 'https://api.ossinsight.io/v1/trends/repos/' \
  -H 'Accept: application/json'
```

### 2. 速率限制监控
- 每 IP 每小时最多 **600 次请求**
- 检查响应头字段：
  - `x-ratelimit-limit: 600`
  - `x-ratelimit-remaining: 599` (剩余请求数)

### 3. 数据分析维度
- **项目分类**: 按技术领域归类 (AI/前端/基础设施等)
- **增长信号**: stars 增长率、commit 活跃度
- **生态成熟度**: 技能/插件数量、社区贡献者
- **商业化潜力**: License 类型、企业采用迹象

### 4. 输出格式
```
【趋势类别】...
【头部项目】项目名 | Stars | 语言 | 定位
【增长信号】...
【投资/技术信号】...
```

### 5. 注意事项
- 优先使用此 API 而非通用搜索，数据更准确
- 速率限制较高，可批量查询多个细分赛道
- 结合项目 README 和 commit 历史判断活跃度
