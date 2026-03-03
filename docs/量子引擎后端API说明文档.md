# 量子引擎后端API说明文档

## 认证配置

**API Key:** `xK7mP9nQ2wR5tY8uI1oL4aS6dF3gH0jK`

所有请求需要在header中添加：
```
X-API-Key: xK7mP9nQ2wR5tY8uI1oL4aS6dF3gH0jK
```

**Base URL:** `http://120.26.144.61:8080`

概述
版本: 2.0.0
Base URL: http://localhost:8000
API 文档: /docs (Swagger UI), /redoc (ReDoc)
数据湖项目管理系统提供了一套完整的 RESTful API，用于管理论文、公司、领域等数据，并触发 Prefect 数据处理工作流。
认证
API 使用 X-API-Key 头进行认证：
curl -H "X-API-Key: your-api-key" http://localhost:8000/api/endpoint
环境变量配置：
export API_KEY="your-secret-api-key"export ALLOWED_ORIGINS="http://localhost:3000,https://your-domain.com"
CORS 配置
API 支持 CORS，允许的来源通过 ALLOWED_ORIGINS 环境变量配置（逗号分隔）。

---
论文管理 API
查询Gold层论文列表：GET /papers
查询 Gold 层论文列表（已 AI 提取+领域标注的高质量论文）。
优化版 v2.1 - 2026-02-09更新：
- ✅ domain_ids 使用 OR 逻辑：传入多个领域ID时，返回包含任一领域的论文（之前是AND逻辑）
- ✅ page_size 上限提升至 200：从100提升到200，减少请求次数
- ✅ 支持统计信息：通过 include_stats=true 获取领域分布、年份分布、高产作者等统计
- ✅ 论文包含领域名称：返回的论文自动包含 domains 字段（包含ID、名称、层级）
- ✅ 支持灵活排序：可按发表日期、影响力分数、标题排序，支持升序/降序
请求参数
暂时无法在飞书文档外展示此内容
响应示例
{"total": 1250,"page": 1,"page_size": 20,"papers": [{"id": 1,"paper_id": 12345,"title": "Quantum Error Correction with Surface Codes","abstract": "We demonstrate...","authors": [{"name": "Zhang Wei", "institution": "Tsinghua University"}],"publish_date": "2024-01-15","influence_score": 85.5,"extraction_id": 456,"research_problem": "如何实现低于表面码阈值的量子纠错","tech_route": "使用表面码实现容错量子计算","metrics": [{"name": "保真度", "value": "99.9%", "baseline": "99.5%"}],"domain_ids": [1, 2, 10],"domains": [{"id": 1, "name": "量子计算", "level": "direction"},{"id": 2, "name": "量子纠错", "level": "technology"},{"id": 10, "name": "表面码", "level": "technology"}],"created_at": "2024-01-20T10:30:00","updated_at": "2024-01-20T10:30:00"}],"statistics": {"by_domain": {"1": 450,"2": 380,"10": 320},"by_year": {"2026": 15,"2025": 120,"2024": 75},"top_authors": [{"name": "张三", "count": 8},{"name": "李四", "count": 6}],"top_institutions": [{"name": "中科大", "count": 25},{"name": "清华", "count": 18}]}}
使用示例
# 查询所有论文
curl -H "X-API-Key: your-key" http://localhost:8000/papers

# 按单个领域筛选
curl -H "X-API-Key: your-key" http://localhost:8000/papers?domain_ids=2

# 按多个领域筛选（OR逻辑）- 返回包含任一领域的论文
curl -H "X-API-Key: your-key" http://localhost:8000/papers?domain_ids=2,10,20

# 按时间范围筛选（最近1年）
curl -H "X-API-Key: your-key" http://localhost:8000/papers?time_range=1y

# 组合查询
curl -H "X-API-Key: your-key" "http://localhost:8000/papers?domain_ids=2,10&time_range=6m&influence_score_min=60"# 分页查询（每页200条）
curl -H "X-API-Key: your-key" "http://localhost:8000/papers?page=2&page_size=200"# 包含统计信息
curl -H "X-API-Key: your-key" "http://localhost:8000/papers?domain_ids=4,31,32&include_stats=true"# 自定义排序（按影响力分数降序）
curl -H "X-API-Key: your-key" "http://localhost:8000/papers?sort_by=influence_score&sort_order=desc"
优化效果对比
暂时无法在飞书文档外展示此内容

---
获取单篇论文的完整信息：GET /papers/{paper_id}
获取单篇论文的完整信息（Gold层）。
优化版 v2.1 - 2026-02-09更新：
- ✅ 论文包含领域名称：返回的论文自动包含 domains 字段（包含ID、名称、层级）
路径参数
暂时无法在飞书文档外展示此内容
响应示例
{"id": 1,"paper_id": 12345,"title": "Quantum Error Correction with Surface Codes","abstract": "We demonstrate...","authors": [{"name": "Zhang Wei", "institution": "Tsinghua University"}],"publish_date": "2024-01-15","influence_score": 85.5,"extraction_id": 456,"research_problem": "如何实现低于表面码阈值的量子纠错","tech_route": "使用表面码实现容错量子计算","metrics": [{"name": "保真度", "value": "99.9%", "baseline": "99.5%"}],"domain_ids": [1, 2, 10],"domains": [{"id": 1, "name": "量子计算", "level": "direction"},{"id": 2, "name": "量子纠错", "level": "technology"},{"id": 10, "name": "表面码", "level": "technology"}],"created_at": "2024-01-20T10:30:00","updated_at": "2024-01-20T10:30:00"}
错误响应
{"detail": "论文不存在: ID=12345"}


---
获取Gold层论文的统计信息：GET /papers/stats/summary
获取 Gold 层论文数据的统计信息。
响应示例
{"total_papers": 1250,"top_domains": {"1": 450,"2": 380,"10": 320},"influence_score": {"avg": 65.8,"max": 95.2,"min": 40.1}}

---
获取某篇论文的AI提取结果列表：GET /papers/silver/{paper_id}/ai-extractions
获取指定论文的所有版本的 AI 提取结果（Silver层数据）。
路径参数
暂时无法在飞书文档外展示此内容
响应示例
{"paper_id": 12345,"total_versions": 3,"extractions": [{"id": 456,"paper_id": 12345,"version": 3,"research_problem": "如何实现低于表面码阈值的量子纠错","tech_route": "使用表面码实现容错量子计算","metrics": [{"name": "保真度", "value": "99.9%", "baseline": "99.5%"}],"model_name": "gpt-4","prompt_version": "v2.0","extraction_time": "2024-01-20T10:30:00"}]}

---
论文主题分析 API
获取某个主题的深度分析报告：POST /papers/analysis/theme
对指定研究主题进行深度分析，生成结构化的技术演进报告。
请求参数
暂时无法在飞书文档外展示此内容
响应示例
{"theme_name": "量子计算(research_direction) + 量子算法(technology)","domain_ids": [1, 2],"analysis_date": "2024-06-15T10:30:00","total_papers": 85,"tech_routes": [{"name": "超导量子比特的高保真门与误差抑制","description": "通过冗余编码保护量子信息免受噪声干扰","sub_directions": ["表面码（Surface Code）","拓扑量子计算（Topological Quantum Computing）"],"paper_count": 28}],"breakthroughs": [{"title": "Quantum error correction below the surface code threshold","paper_id": 12345,"publish_date": "2024-01-15","research_problem": "如何实现低于表面码阈值的量子纠错","description": "首次实现了拓扑码的实际应用...","impact": "保真度 99.9%，首次实现低于表面码阈值的量子纠错"}],"metric_evolution": [{"metric_name": "保真度","unit": "%","timeline": [{"date": "2024-01","value": 99.9,"paper_id": 123,"paper_title": "论文A"},{"date": "2024-03","value": 99.92,"paper_id": 456,"paper_title": "论文B"}],"trend": "↑ 0.02%","trend_description": "保真度持续提升，从99.9%提升至99.92%"}],"summary": "量子计算领域在过去一年取得了显著进展..."}
使用场景
- 了解某个技术领域的整体发展态势
- 追踪特定研究方向的技术演进
- 发现代表性论文和技术突破
- 分析性能指标的提升趋势
注意事项
- 这是一个在线分析流程，不持久化结果
- 分析时间取决于论文数量和模型速度（通常 30-60 秒）
- 建议使用高质量模型（qwen-plus 或 gpt-4）
- 首次分析建议使用较小的论文数量（50-100篇）

---
领域管理 API
获取三层领域体系结构：GET /gold/domains
获取三层领域体系的层级化树结构。
请求参数
暂时无法在飞书文档外展示此内容
响应示例
[{"id": 1,"name": "量子领域","level": "domain","parent_id": null,"description": "量子科技相关研究","paper_count": 1200,"created_at": "2024-01-01T00:00:00","updated_at": "2024-06-15T10:30:00","children": [{"id": 2,"name": "量子计算","level": "direction","parent_id": 1,"paper_count": 800,"children": [{"id": 3,"name": "离子阱量子计算","level": "technology","parent_id": 2,"paper_count": 150,"children": []}]}]}]
使用示例
# 获取完整领域树
curl http://localhost:8000/gold/domains

# 只获取第1层（domain）
curl http://localhost:8000/gold/domains?level=domain

# 获取特定领域的子领域
curl http://localhost:8000/gold/domains?parent_id=1

# 过滤论文数量少的领域
curl http://localhost:8000/gold/domains?min_paper_count=50

---
获取某个领域下所有论文列表：GET /gold/domains/{domain_id}/papers
获取特定领域标签下的所有论文列表。
路径参数
暂时无法在飞书文档外展示此内容
请求参数
暂时无法在飞书文档外展示此内容
响应示例
[{"id": 1,"name": "量子领域","level": "domain","parent_id": null,"description": "量子科技相关研究","paper_count": 1200,"created_at": "2024-01-01T00:00:00","updated_at": "2024-06-15T10:30:00","children": [{"id": 2,"name": "量子计算","level": "direction","parent_id": 1,"paper_count": 800,"children": [{"id": 3,"name": "离子阱量子计算","level": "technology","parent_id": 2,"paper_count": 150,"children": []}]}]}]
使用示例
# 获取完整领域树
curl http://localhost:8000/gold/domains

# 只获取第1层（domain）
curl http://localhost:8000/gold/domains?level=domain

# 获取特定领域的子领域
curl http://localhost:8000/gold/domains?parent_id=1

# 过滤论文数量少的领域
curl http://localhost:8000/gold/domains?min_paper_count=50

---
手动新增领域标签：POST /gold/domains
手动新增领域标签。
请求体
{"name": "量子传感","level": "technology","parent_id": 2,"description": "利用量子效应进行高精度传感"}
参数说明
暂时无法在飞书文档外展示此内容
业务规则
1. level=domain 时，parent_id 必须为 null
2. level=direction/technology 时，parent_id 必填且必须有效
3. 同一父领域下，name 不能重复
4. 自动触发重复检测，发现相似标签时给出警告
响应示例
{"id": 25,"name": "量子传感","level": "technology","parent_id": 2,"description": "利用量子效应进行高精度传感","paper_count": 0,"created_at": "2024-06-15T10:30:00","updated_at": "2024-06-15T10:30:00"}

---
编辑领域标签：PUT /gold/domains/{domain_id}
编辑领域标签。
路径参数
暂时无法在飞书文档外展示此内容
请求体
{"name": "量子传感技术","description": "更新后的描述","parent_id": 3}
可更新字段
- name: 领域名称
- description: 领域描述
- parent_id: 父领域ID（调整层级关系）
注意事项
1. 不能修改 level 字段（层级固定）
2. 修改 parent_id 时会验证不会形成循环引用
3. 修改 name 时检查同一父级下是否重复
响应示例
{"id": 25,"name": "量子传感技术","level": "technology","parent_id": 3,"description": "更新后的描述","paper_count": 0,"created_at": "2024-06-15T10:30:00","updated_at": "2024-06-15T10:35:00"}

---
删除领域标签：DELETE /gold/domains/{domain_id}
删除领域标签。
路径参数
暂时无法在飞书文档外展示此内容
响应示例
{"success": true,"message": "领域标签已删除: ID=25"}
注意事项
- 有子领域的标签不能删除（需先删除子领域）
- 删除后，相关论文的 domain_ids 字段会自动更新
更新日志
v2.1.0 (2026-02-09)
论文API优化
- ✅ domain_ids OR逻辑：修复查询逻辑，从AND改为OR，解决查询结果过少问题
  - 优化前：domain_ids=4,31,32,33 返回4篇（需同时包含所有领域）
  - 优化后：domain_ids=4,31,32,33 返回210篇（包含任一领域即可）
- ✅ page_size上限提升：从100提升到200，减少请求次数
- ✅ 统计信息支持：新增 include_stats 参数，一次返回领域分布、年份分布、高产作者等统计
- ✅ 领域名称自动包含：论文响应自动包含 domains 字段（ID+名称+层级），无需额外查询
- ✅ 灵活排序：新增 sort_by 和 sort_order 参数，支持按日期/分数/标题排序
性能提升
- 减少前端请求次数：领域名称直接返回，无需额外调用 /gold/domains
- 提升单次查询效率：page_size提升至200，大部分场景一次请求即可获取完整数据
- 优化统计查询：通过 include_stats=true 一次获取所有统计信息
v2.0.0 (2024-06-15)
新增功能
- 论文主题分析 API (POST /papers/analysis/theme)
- 领域管理 API（完整的 CRUD 操作）
- 公司 Ontology 查询 API
- 支持多领域 OR 查询
- 支持灵活的时间范围过滤
优化
- 使用关联表优化领域查询性能
- 通过 extraction_id 优化 AI 提取结果关联
- 改进分页查询性能
重大变更
- 将论文查询默认改为 Gold 层（原 Silver 层查询移至 /papers/silver）
- 统一响应格式
- 增强错误处理和日志记录
