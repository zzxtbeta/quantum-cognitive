---
name: github-trends-ossinsight-api
description: 通过 OSS Insight API 查询 GitHub 热门趋势项目，分析开源生态成熟度和技术赛道信号。当用户询问 GitHub 热门项目、某技术领域的开源生态活跃度、高增长开源项目发现、量子计算开源工具对比、某方向有没有代表性开源库时主动使用——API 无需认证，可直接查询。
---

# github-trends-ossinsight-api — GitHub趋势项目分析技能

## 使命
通过 OSS Insight API 获取 GitHub 热门趋势项目数据，分析开源生态成熟度和技术赛道信号。

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
