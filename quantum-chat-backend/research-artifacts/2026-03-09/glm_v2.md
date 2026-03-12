我来帮你全面了解量子计算云平台及操作系统的技术发展和商业化情况。这需要从技术论文和市场动态两个维度并行调研。根据技术论文和市场情报的综合调研，以下是量子计算云平台及操作系统领域的全面分析：

---

## 现状摘要

量子计算云平台及操作系统整体处于**早期商业化探索阶段**。技术层面，量子编译器、错误缓解等核心模块TRL仅为4-5级，量子操作系统内核尚处于TRL 2-3的理论探索期；顶刊论文中该领域占比不足2%，表明技术成熟度仍低。商业化方面，全球以IBM Quantum为领跑者（累计收入10亿美元、60万用户），中国以本源量子为龙头（2024年营收9938万元、估值69亿元、拟科创板IPO），但整体仍以科研调用为主，付费商业化规模有限。竞争焦点正从"比特数量"转向"平台实用性与工程化能力"。

---

## 核心数据表

| 指标 | 数据 | 来源 |
|-----|------|------|
| **技术成熟度（量子编译器）** | TRL 4-5 | 论文分析[1] |
| **技术成熟度（量子操作系统内核）** | TRL 2-3 | 论文分析[1] |
| **技术成熟度（量子虚拟化）** | TRL 2 | 论文分析[1] |
| **IBM量子云用户规模** | 60万 | 光子盒[1] |
| **IBM量子业务累计收入** | 10亿美元 | 腾讯网[3] |
| **本源量子2024年营收** | 9938.49万元，毛利率58% | 新浪财经[13] |
| **本源量子2025年Q1营收** | 2858万元，同比+134% | 新浪财经[13] |
| **本源量子估值** | 约69亿元 | 智东西[9] |
| **本源悟空全球访问量** | 超4000万次（主要为科研调用） | QTNEA[10] |
| **本源量子云任务量** | 超76万个（主要为科研调用） | QTNEA[10] |
| **天衍量子云访问量** | 超1.2亿次（主要为科研调用） | 光子盒[16] |
| **2025-2026年中国量子融资总额** | 25.16亿元（25起事件） | 财联社[25] |
| **全球量子云市场规模预测** | 2035年约280-720亿美元 | 麦肯锡 |
| **中国量子计算市场规模** | 2025年约115.6亿元 | 中国信通院 |

---

## 关键玩家

### 国际玩家

| 公司 | 国家 | 技术路线 | 核心产品/平台 | 融资阶段 | 典型客户 |
|-----|------|---------|-------------|---------|---------|
| **IBM** | 美国 | 超导 | IBM Quantum、Qiskit | 上市公司 | 近300家《财富》500强企业 |
| **Amazon** | 美国 | 聚合平台 | AWS Braket | 上市公司 | 企业开发者 |
| **Google** | 美国 | 超导 | Cirq、Willow处理器 | 上市公司 | 科研机构 |
| **Microsoft** | 美国 | 聚合平台 | Azure Quantum、Majorana 1芯片 | 上市公司 | 企业客户 |
| **IonQ** | 美国 | 离子阱 | IonQ Cloud | 上市公司（SPAC） | 金融、化工 |
| **PsiQuantum** | 美国 | 光量子 | 硅光子量子计算 | 估值70亿美元 | — |

### 中国玩家

| 公司 | 技术路线 | 核心产品 | 融资阶段 | 估值 | 典型客户 |
|-----|---------|---------|---------|------|---------|
| **本源量子** | 超导 | 本源悟空（72比特）、本源司南OS、本源量子云 | Pre-IPO（拟科创板） | 69亿元 | 77所高校、恒瑞医药、中国商飞 |
| **国盾量子** | 超导 | 国盾量子云、祖冲之号接入 | 上市公司（科创板） | — | 政企、金融 |
| **玻色量子** | 光量子 | 1000比特相干光量子计算机、Kaiwu SDK | A++轮 | — | 太平金科、光大科技、平安银行 |
| **图灵量子** | 光量子 | 光量子芯片、光量子计算机 | B轮 | 近70亿元 | 科研机构 |
| **中电信量子集团** | 超导 | 天衍量子云平台 | 央企（中国电信注资30亿） | — | 政企客户 |
| **华翊量子** | 离子阱 | 离子阱量子计算机 | — | — | — |
| **中科酷原** | 中性原子 | 中性原子量子计算 | 战略融资（近亿元） | — | — |

---

## 技术突破（近一年顶刊论文）

| 技术方向 | 突破内容 | 论文来源 |
|---------|---------|---------|
| **浅层电路优化** | 常数深度测量驱动方案，突破Lieb-Robinson光锥限制实现全局纠缠 | [P1] Chenfeng Cao, "Measurement-driven quantum advantages in shallow circuits", PRL, 2026 |
| **混合态量子相稳定性** | 提出Markov长度作为混合态量子相稳定性判据，为量子云平台错误诊断提供理论基础 | [P2] Shengqi Sang等, "Stability of Mixed-State Quantum Phases via Finite Markov Length", PRL, 2025 |
| **镶嵌编码框架** | 基于二维常曲率曲面正则镶嵌的量子编码，逻辑门由几何旋转直接诱导 | [P3] Yixu Wang等, "Tessellation Codes: Encoded Quantum Gates by Geometric Rotation", PRL, 2025 |
| **可验证量子优势** | 首次在样本复杂度模型实现量子与经典算法指数级分离（1 vs Θ(N)） | [P4] Marcello Benedetti等, "Provable and Verifiable Quantum Advantage in Sample Complexity", PRL, 2025 |

---

## 参考来源

### 市场/融资/新闻

[1] [光子盒 — ICV发布《2025全球量子云平台测评报告》](https://mp.weixin.qq.com/s/EmC4Q59-NBM1ok_NDDCY3A) — 2025-10-21

[2] [QTNEA — IBM首席财务官：目前已有超过75台量子计算机处于量产阶段](https://mp.weixin.qq.com/s/KbS2RpaQQOfiBGkGyM6eag) — 2025-09-10

[3] [腾讯网 — 量子领域的常山赵子龙？IBM声称已累计获得10亿美元量子业务](https://news.qq.com/rain/a/20250206A08VIO00) — 2025-02-06

[4] [量子大观 — 量子计算不需要GPU？IBM和AMD股价应声大涨](https://mp.weixin.qq.com/s/S9NaRqnPgw7dM6NPf4D3xQ) — 2025-10-26

[5] [TradingKey — 什么是量子计算？量子计算概念股有哪些？](https://www.tradingkey.com/zh-hans/analysis/stocks/us-stock/251282787-what-is-quantum-computing-introduce-recommend-best-quantum-computing-stocks-tradingkey) — 2025-11-07

[8] [量子大观 — 本源量子IPO辅导备案！](https://mp.weixin.qq.com/s/lRM1qXVqzrFN24PO-pIY-Q) — 2025-09-16

[9] [智东西 — 安徽量子芯片龙头，启动IPO！](https://m.zhidx.com/p/504258.html) — 2025-09-16

[10] [QTNEA — 量子计算机"本源悟空"全球访问量突破4000万次！](https://mp.weixin.qq.com/s/9o2C9MtZGlSTI2Clzrof0w) — 2026-01-27

[11] [36Kr — 我国首款自主量子计算机操作系统"本源司南"开放线上下载](https://www.36kr.com/newsflashes/3696685269921664) — 2026-02-23

[13] [新浪财经 — 估值69亿量子计算商企冲刺A股备案](https://finance.sina.com.cn/stock/estate/2025-09-16/detail-infqsxmh0659712.d.html) — 2025-09-16

[14] [QTNEA — 我国自主量子计算机"本源悟空"已为77所高校提供教育支持！](https://mp.weixin.qq.com/s/Sp0jN_qN6UXbU7icY8mDBQ) — 2025-09-02

[16] [光子盒 — 从实验室到春晚，量子不再是概念！](https://mp.weixin.qq.com/s/60gBsbLDoSJ_LpL1Q98u8w) — 2026-02-17

[18] [QTNEA — 我国首个光量子计算机制造工厂，落地深圳！](https://mp.weixin.qq.com/s/tdYjPgsqUGe7thmL-sTz0Q) — 2025-08-28

[19] [QTNEA — 再次中标！玻色量子中标太平金科2025-2026年量子计算技术采购项目](https://mp.weixin.qq.com/s/0zT7HmZXtJhlte_TglPfpQ) — 2025-12-17

[22] [猎云网 — 图灵量子半年完成两轮数亿元融资](https://lieyunpro.com/t/%E5%9B%BE%E7%81%B5%E9%87%8F%E5%AD%90) — 2026-01

[25] [财联社 — 25起+超25亿！量子科技赛道加速升温](https://www.cls.cn/detail/2292570) — 2026-02-22

### 论文

[P1] Chenfeng Cao, "Measurement-driven quantum advantages in shallow circuits", Physical Review Letters, 2026. DOI: https://doi.org/10.1103/4b99-xmqn

[P2] Shengqi Sang, Timothy H. Hsieh, "Stability of Mixed-State Quantum Phases via Finite Markov Length", Physical Review Letters, 2025. DOI: https://doi.org/10.1103/physrevlett.134.070403

[P3] Yixu Wang, Yijia Xu, Zi-Wen Liu, "Tessellation Codes: Encoded Quantum Gates by Geometric Rotation", Physical Review Letters, 2025. DOI: https://doi.org/10.1103/tljb-f7tt

[P4] Marcello Benedetti等, "Provable and Verifiable Quantum Advantage in Sample Complexity", Physical Review Letters, 2025. DOI: https://doi.org/10.1103/q55v-wm7y

---

**总结**：量子计算云平台及操作系统领域技术尚处早期（TRL 2-5），商业化以IBM为标杆（10亿美元累计收入），中国以本源量子为龙头（拟科创板IPO、估值69亿元）。竞争焦点正从硬件参数转向平台生态与工程化能力，量子-经典混合计算成为主流模式。