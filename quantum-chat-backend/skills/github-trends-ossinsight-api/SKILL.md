---
name: tracking-github-trends
description: 当需要查询 GitHub 热门/趋势项目、分析量子计算开源生态成熟度、发现高增长早期开源项目时使用。通过 OSS Insight 公开 API（无需认证）获取数据。
license: MIT
---

# github-trends-ossinsight-api — GitHub趋势项目分析技能

## 使命
通过 OSS Insight API 获取 GitHub 热门趋势项目数据，分析开源生态成熟度和技术赛道信号。

---

## 适用场景
- 用户需要查询 GitHub 热门/趋势项目时
- 需要分析某技术赛道的开源生态成熟度
- 需要发现早期高增长潜力的开源项目
- 需要对比多个同类项目的社区热度
- 需要追踪某技术领域的最新动向

---

## 使用方法

### 1. API 调用
```bash
curl -L -X GET 'https://api.ossinsight.io/v1/trends/repos/' \
  -H 'Accept: application/json'
```

### 2. 速率限制
- 每 IP 每小时最多 **600 次请求**
- 响应头：`x-ratelimit-remaining` 查看剩余配额

### 3. 数据分析维度
- **项目分类**: 按技术领域归类
- **增长信号**: stars 增长率、commit 活跃度
- **生态成熟度**: 贡献者数量、PR 合并率
- **商业化潜力**: License 类型、企业采用迹象

📖 **API 完整参数和响应字段见** [`./references/api.md`](./references/api.md)

### 4. 输出格式
```
【趋势类别】...
【头部项目】项目名 | Stars | 语言 | 定位
【增长信号】...
【技术/投资信号】...
```

### 5. 注意事项
- 优先使用此 API 而非通用搜索，数据更准确
- 结合项目 README 和 commit 历史判断活跃度
