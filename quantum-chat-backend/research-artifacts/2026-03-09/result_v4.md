---
## 量子计算云平台及操作系统：技术发展与商业化现状

### 一、现状摘要

量子计算云平台整体处于**TRL 4-6阶段**，超导路线最成熟（TRL 5-6），中性原子和离子阱紧随其后（TRL 4-5）[P1][P3]。商业化处于**NISQ时代早期应用探索阶段**，专用量子计算机已开始落地，云平台成为产业核心基础设施[1][2]。中国以本源量子、国盾量子为代表，在硬件规模上与国际差距约2-3年，但在操作系统（本源司南）和安全合规方面形成特色优势[3][17]。

---

### 二、核心数据表

| 指标 | 超导平台 | 中性原子平台 | 离子阱平台 | 来源 |
|-----|---------|------------|-----------|------|
| **TRL成熟度** | 5-6 | 4-5 | 4-5 | [P1][P3] |
| **物理比特数** | 1000+（IBM Condor） | 280+ | ~32 | [P1][P8] |
| **门保真度（双比特门）** | >99.5% | >99% | >99.9% | [P1] |
| **全球市场规模（2030年预测）** | 约200-220亿美元 | — | — | [5] |
| **中国市场规模（2025年预测）** | 约115亿元人民币 | — | — | [7] |

---

### 三、关键玩家

#### 中国公司

| 公司 | 融资阶段 | 核心产品/平台 | 技术路线 | 主要客户 |
|-----|---------|-------------|---------|---------|
| **本源量子** | IPO辅导中，估值约68.8亿元[10] | 本源悟空量子计算机、本源司南操作系统、本源量子云 | 超导 | 中信银行、恒瑞医药、中国商飞、国家电网 |
| **国盾量子** | 科创板上市（688027） | 国盾云平台、天衍量子计算云平台 | 超导 | 政务、金融、军工等高安全行业 |
| **玻色量子** | A++轮数亿元[11] | 1000量子比特相干光量子计算机、云服务平台 | 光量子（专用） | 广州国家实验室、晶泰科技、光大科技、成都超算 |
| **图灵量子** | B轮数亿元[12] | 光量子计算机、量子计算云平台 | 光量子 | 金融、生物医药、AI |
| **中科酷原** | 战略融资近亿元[16] | 汉原一号中性原子量子计算机、原子量子计算云平台 | 中性原子 | 中国移动、巴基斯坦（出口订单超4000万元） |

#### 国际公司

| 公司 | 核心产品/平台 | 技术路线 | 核心优势 |
|-----|-------------|---------|---------|
| **IBM** | IBM Quantum Experience | 超导 | 硬件资源最强（156比特Heron）；Qiskit生态60万用户；ICV测评93分[3] |
| **Google** | Google Cirq / Willow芯片 | 超导 | Willow芯片纠错突破；TensorFlow Quantum集成[3] |
| **Amazon** | Braket | 聚合平台 | 多硬件接入；排队时间<5分钟；定价透明[3] |
| **Microsoft** | Azure Quantum | 聚合平台 | 企业级云基础设施；多硬件接入灵活性[3] |
| **IonQ** | IonQ Cloud | 离子阱 | 高保真度（>99.9%）；全连通架构 |

---

### 四、参考来源

**论文来源：**
- [P1] Y.H. Zhang et al., "Quantum Many-Body Dynamics for Fermionic t-J Model Simulated with Atom Arrays", PRL, 2026. DOI: https://doi.org/10.1103/px63-dtc9
- [P3] Chenfeng Cao, "Measurement-driven quantum advantages in shallow circuits", PRL, 2026. DOI: https://doi.org/10.1103/4b99-xmqn
- [P8] Kazutaka Takahashi, Adolfo del Campo, "Krylov Subspace Methods for Quantum Dynamics with Time-Dependent Generators", PRL, 2025. DOI: https://doi.org/10.1103/physrevlett.134.030401

**市场来源：**
- [1] [QTNEA — 量子计算走向应用探索阶段](https://mp.weixin.qq.com/s/va0i3qPuDKSM4GX2tD8Pug) — 2025-02-25
- [2] [界面新闻/搜狐网 — 量子计算等待自己的"英伟达"](https://www.sohu.com/a/980842999_313745) — 2026-01-28
- [3] [光子盒 — ICV发布《2025全球量子云平台测评报告》](https://mp.weixin.qq.com/s/EmC4Q59-NBM1ok_NDDCY3A) — 2025-10-21
- [5] [光子盒 — 欧洲巨头新报告：量子计算死于软件，220亿市场卡在人才荒！](https://mp.weixin.qq.com/s/LwzppddfjUe5CkEXCTJp3Q) — 2025-06-17
- [7] [新浪财经 — 科创丨估值69亿本源量子将IPO](https://finance.sina.com.cn/roll/2025-11-04/doc-infwfyai1393321.shtml) — 2025-11-04
- [10] [QTNEA — 天阳科技间接投资中国首家量子计算公司](https://mp.weixin.qq.com/s/w58Qyva1dZgY-bfxPI_XfA) — 2025-12-15
- [11] [搜狐网 — 量子计算等待自己的"英伟达"](https://www.sohu.com/a/980842999_313745) — 2026-01-28
- [12] [光子盒 — 图灵量子半年完成两轮数亿元融资](https://mp.weixin.qq.com/s/lJcAkUg5TywW3TSWfZhBuA) — 2026-01-08
- [16] [光子盒 — 中科酷原获移动链长基金近亿元注资](https://mp.weixin.qq.com/s/wf3oX6OINd-rsaswKq2RqQ) — 2026-01-13
- [17] [新浪财经 — 我国自主量子计算机操作系统本源司南全球首发开放下载](https://cj.sina.cn/articles/view/1831650534/6d2cc4e604001kfv8) — 2026-02-26

---