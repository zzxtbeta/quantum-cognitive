---
name: market-intel
description: 用于量子赛道市场情报、融资新闻、商业化进展、新进入者扫描与中国生态全景梳理。强调近期性、可追溯链接、头部玩家与新玩家分层，以及 deal sourcing 视角下的弱信号补充。
metadata:
  scope: deep-research
---

# market-intel

## When to use

- 用户问近期融资、商业化进展、市场格局、竞争态势、产业化落地
- 用户问中国有哪些公司 / 机构 / 新玩家
- 用户想做赛道全景、deal sourcing、早期公司发现

## Core workflow

1. 先用时间窗工具定锚近期范围。
2. 先查结构化新闻库，再用 Web 搜索补充来源。
3. 对多角度问题优先并发检索，而不是串行补洞。
4. 输出时强制区分：
   - 头部玩家
   - 新进入者 / 早期团队
   - 待核实弱信号
5. 关键事实优先保留可点击 URL；无 URL 的事实不要混进已验证主表。

## China newcomer supplement

- 对中国市场全景、`新玩家`、`近三个月新公司`、`deal sourcing` 类问题，额外调用一次：
  - `GET /companies/internal/promotions/latest`
- 这个接口的角色是：
  - 补充“近三个月注册且近期被新闻报道”的公司信号
  - 发现还没进入头部名单、但值得跟踪的新增主体
- 使用方式：
  - 在主新闻扫描后再查一次
  - 结果优先进入 `新进入者 / 早期团队`
  - 若证据较弱，可降级到 `待核实弱信号`

## Output expectations

- 近期问题默认先看近 90 天；不足再放宽
- 最终报告必须给出来源链接，不要写笼统免责声明
- 赛道全景类问题必须覆盖：
  - 商业化阶段
  - 主要玩家
  - 中国公司 / 机构
  - 新玩家 / 弱信号

## Load on demand

- API 参数与示例见 `references/api.md`
- 中国玩家与新进入者判断可继续参考 `references/china-players.md`
