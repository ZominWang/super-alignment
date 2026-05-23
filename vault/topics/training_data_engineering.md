---
id: "training_data_engineering"
name: "训练数据工程"
name_en: "Training Data Engineering"
type: "topic"
level: 3
area: "llm"
direction: "llm_training"
prerequisites: ["llm_pretraining", "tokenization"]
difficulty: 3
importance: 5
status: "unknown"
tags: ["data-engineering", "data-curation", "data-cleaning", "dedup", "quality-filtering"]
---

训练数据工程是 LLM 预训练中最关键且最被低估的环节，"数据质量决定模型质量"已成为行业共识。完整数据管线包括：数据采集（Common Crawl 等公开语料、书籍、代码仓库、学术论文、高质量对话数据、Wikipedia 等精选源）→ 数据清洗（HTML 标签解析/正文提取如 trafilatura/Readability、语言识别过滤如 FastText、困惑度质量控制）→ 去重（精确字符串匹配去重、MinHash LSH 模糊去重消除近似重复、句子级/文档级去重策略）→ 质量过滤（基于模型评分如 "文本是否具有教育价值"、规则过滤如长度/乱码/重复度阈值）→ 毒性/PII/敏感内容过滤 → 数据配比混合（不同领域数据的采样比例，受 Data Mixing Laws 指导）。数据版本管理与可复现性是工程实践中的硬骨头——每次数据变更需可追溯，不同实验间的数据差异需量化。关键论文：Penedo et al. 2023 "The RefinedWeb Dataset", Rae et al. 2021 "Scaling Language Models", Soldaini et al. 2024 "Dolma"。

## Quiz

### Q1
**问题**: 在大规模数据去重中，MinHash + LSH（Locality-Sensitive Hashing）的应用场景是什么？

- A. 精确比对数十亿文档的每一对是否完全一致
- B. 高效近似发现"高度相似但不完全相同"的文档对——如网页互相引用相同段落 ✓
- C. 检测文本中的毒性内容
- D. 评估每位文档的语言分类

**解析**: 精确去重（如 MD5/sha256 哈希）只能识别完全相同的文档，互联网上大量近似重复（同一新闻被多家转载、SEO 农场批量生成变体）无法被捕获。MinHash 通过对文档的 n-gram 集合做多重哈希，用 Jaccard 相似度近似文档相似度；LSH 则将 MinHash 签名分桶，仅在同一桶内比较，避免 O(N²) 的全量比对。Dolma 数据集去重管线就使用了 MinHash LSH 来消除近似重复文档。

### Q2
**问题**: RefinedWeb 项目验证的最重要发现是什么？

- A. 数据量越大模型越好，质量不重要
- B. 通过严格的数据清洗和过滤，仅用 Common Crawl 数据（无需精选源如 Wikipedia）就能训练出匹配甚至超越当时闭源模型的 LLM ✓
- C. 去重对模型性能无明显影响
- D. HTML 标签可以不做清洗直接训练

**解析**: RefinedWeb（Falcon 的训练数据）证明了"只要有足够精心的数据过滤管线，开放的 Common Crawl 数据本身就足够"。他们的管线包括：URL 过滤、文本提取（trafilatura）、语言过滤（fastText）、质量评分（KenLM 困惑度阈值）、重复去除、PII 移除，最终从 300TB 原始数据中保留 5TB 高质量训练数据（保留率约 2%）。Falcon-40B 在 HellaSwag 等评测上达到当时最佳开源水平，验证了"数据精心而非数据量大"的哲学。

### Q3
**问题**: LLM 训练中的"Data Mixing Laws"主要解决什么问题？

- A. 如何将不同语言混合为一种统一表示
- B. 在总训练预算固定的前提下，如何确定不同领域数据的最优采样比例，以最大化多领域下游表现 ✓
- C. 如何让模型忘记有害数据
- D. 如何在训练中动态调整学习率

**解析**: 典型 LLM 训练数据可能包含 50% Common Crawl、20% 代码、10% 书籍、5% 学术论文、5% Wikipedia、10% 其他。每类数据对模型不同能力（推理、知识、代码、对话）的贡献不同，且存在边际收益递减——过度训练某领域会导致其他领域能力被"覆盖"或遗忘。Data Mixing Laws 通过在小规模代理实验中拟合性能随各领域数据比例变化的函数，预测大规模训练时的最优混合比，本质是在多目标优化中寻找帕累托前沿。

## 参考资料

### 论文
- **[The RefinedWeb Dataset for Falcon LLM: Outperforming Curated Corpora with Web Data Only]** (Penedo, Malartic, Hesslow, 2023) — 证明仅用精心过滤的 Common Crawl 数据即可训练出顶级 LLM，Falcon 数据集管线。https://arxiv.org/abs/2306.01116
- **[Dolma: an Open Corpus of Three Trillion Tokens for Language Model Pretraining Research]** (Soldaini et al., AI2, 2024) — 三万亿 Token 开放预训练语料，详述数据去重/过滤/混合的全流程工具链。https://arxiv.org/abs/2402.00159
- **[CCNet: Extracting High Quality Monolingual Datasets from Web Crawl Data]** (Wenzek, Lachaux, Conneau, 2020) — 从 Common Crawl 大规模提取高质量单语数据的经典管线，Perplexity 过滤方法。https://arxiv.org/abs/1911.00359
- **[Scaling Language Models: Methods, Analysis & Insights from Training Gopher]** (Rae et al., DeepMind, 2021) — 详述 Gopher 训练的数据质量过滤策略与 Scaling Law 在数据层面的分析。https://arxiv.org/abs/2112.11446
- **[Deduplicating Training Data Makes Language Models Better]** (Lee et al., Google, 2022) — 系统研究数据去重对语言模型质量的影响，精确+模糊去重。https://arxiv.org/abs/2107.06499

### 博文/教程
- **[LLM 训练数据工程全景指南]** — Hugging Face Data is Better Together 系列。https://huggingface.co/spaces/HuggingFaceFW/blogpost-fineweb-v1
- **[Dolma 数据处理管线详解]** — AI2 Blog。https://blog.allenai.org/dolma/

### 开源项目
- **[datatrove]** — Hugging Face 大规模数据处理库，支持去重/过滤/PII 移除全流程。https://github.com/huggingface/datatrove
- **[text-dedup]** — 文本去重工具集，MinHash LSH/Suffix Array 等算法实现。https://github.com/ChenghaoMou/text-dedup
