---
id: "semantic_search_advanced"
name: "语义搜索技术进阶"
name_en: "Advanced Semantic Search"
type: "topic"
level: 3
area: "application"
direction: "rag"
prerequisites: ["embeddings", "vector_databases", "rag_basics"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["semantic-search", "hybrid-search", "rerank", "fusion", "relevance"]
---

简单向量余弦相似度检索在复杂场景下存在词项匹配盲区、语义漂移等问题，需要更高级的技术组合。混合搜索(Hybrid Search)融合稀疏检索（BM25/TF-IDF，擅长精确词项匹配如专有名词、编码、数字）与稠密检索（Embedding，擅长语义泛化理解），两种检索结果通过融合策略合并。RRF(Reciprocal Rank Fusion)是最主流融合算法：score=∑1/(k+rank_i)，自动调和不同尺度的分数，无需校准。Rerank重排序用Cross-Encoder模型（如Cohere Rerank、BGE-Reranker）对初检Top-K（如200条）逐对精细打分后重排返回Top-N（如10条），用精度换速度。多阶段检索管道(Multi-Stage Retrieval)：粗排（ANN向量检索+KNN）→精排（Cross-Encoder重排序）→重排（业务规则兜底），每阶段候选集逐级缩小。查询重写技术包括：Query Expansion（自动扩展同义词/相关词提升召回）、HyDE（用LLM先生成假设性文档再用该文档嵌入代替原查询嵌入）。MMR(Maximal Marginal Relevance)平衡检索结果的相关性与多样性。

## Quiz

### Q1
**问题**: 混合搜索中RRF(Reciprocal Rank Fusion)优于直接对分数加权求和的原因是什么？

- A. RRF计算更简单
- B. BM25分数（基于TF-IDF的统计值，范围不定）和Embedding余弦相似度分数（-1到1）尺度完全不同，直接加权求和需大量校准；RRF只依赖排名位置而非原始分数值，天然解决了分数归一化问题  ✓
- C. RRF不需要设置权重
- D. 直接加权求和总是不如RRF

**解析**: RRF公式：score(d)=∑_{i∈searches} 1/(k+rank_i(d))，其中k通常取60。核心优势：(1) 分数无关性——不管BM25返回分数是3.2还是250.7，只看排名第1还是第5；(2) 鲁棒性——k=60缓冲了排名靠后文档的差异，避免个位数排名倒数的极端值；(3) 零调参——不需要估计BM25和Embedding分数的相对权重（这是直接加权的主要痛苦点）。RRF的局限是丢失了原始分数的"置信度"信息——一个勉强第一的文档和稳居第一的文档在RRF中权重相同。

### Q2
**问题**: HyDE(Hypothetical Document Embeddings)查询重写策略的工作原理与适用场景是什么？

- A. 直接使用用户的原始查询
- B. 先用LLM对用户查询生成一篇假设性回答文档，再用这篇文档的嵌入向量去检索；因为文档嵌入与知识库中文档嵌入在向量空间中更"对齐"（同是文章风格），能缩小查询-文档的语义鸿沟  ✓
- C. 用查询的翻译版本检索
- D. 只适用于短查询

**解析**: HyDE的核心洞察：用户查询（如"怎么快速减重"）是短文本，与知识库中的长文档（如"健康减重指南：合理饮食与运动结合的科学方法"）在嵌入空间中存在分布偏移（短问句 vs 长文章）。HyDE解决：LLM生成假设文档→"减重需要从饮食控制和有氧运动两方面入手，每日摄入热量应低于消耗..."→用该文档的嵌入替代原始查询嵌入去检索。生成文档的风格/长度更接近知识库中的真实文档，因此检索效果更好。风险：如果LLM生成的假设文档包含错误事实，可能将检索引导至错误方向。适用场景：知识库文档长而查询短的问答系统。

### Q3
**问题**: MMR(Maximal Marginal Relevance)的核心目标及其公式中各部分的作用是？

- A. 只最大化相关性
- B. MMR公式：`MMR=argmax[λ·Sim(D_i, Q) - (1-λ)·max Sim(D_i, D_j)]`，其中第一项保证相关性，第二项惩罚与已选结果相似度高的文档（取负号最大化即最小化冗余），λ控制多样性权重  ✓
- C. MMR只最小化冗余
- D. MMR与标准检索完全相同

**解析**: MMR在第i步选择文档时：(1) 计算候选文档D_i与查询Q的相似度（相关性项）；(2) 计算候选D_i与已选文档集合中每个文档的最大相似度（冗余惩罚项）；(3) 加权相减后选最大值。当λ=1时，MMR退化为标准相关度排序；当λ=0时，只追求多样性忽略相关性（每篇文档尽量与已选文档不同）。典型设置λ=0.5-0.7。应用场景：如搜索"机器学习"时，Top-5结果可能全是不同角度的概述文章，MMR能确保返回的5个结果分别涵盖：监督学习、无监督学习、深度学习、强化学习、应用案例——用户能获得更完整的知识覆盖而非5篇相似文章。

## 参考资料

### 论文
- **[Dense Passage Retrieval for Open-Domain Question Answering]** (Karpukhin et al., 2020) — 提出 DPR，用双编码器架构将问题与文档分别编码为稠密向量进行检索，是现代语义搜索的奠基性工作。https://arxiv.org/abs/2004.04906
- **[ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT]** (Khattab & Zaharia, 2020) — 提出 ColBERT 后期交互模型，在保持效率的同时实现了比双编码器更细粒度的语义匹配。https://arxiv.org/abs/2004.12832
- **[BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models]** (Thakur et al., 2021) — 提出 BEIR 基准，在 18 个多样化信息检索数据集上零样本评估稠密与稀疏检索模型，揭示了不同检索策略的泛化能力差异。https://arxiv.org/abs/2104.08663

