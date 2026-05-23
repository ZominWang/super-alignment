---
id: "word2vec_embeddings"
name: "词向量与词嵌入"
name_en: "Word Vectors and Word Embeddings"
type: "topic"
level: 3
area: "foundations"
direction: "deep_learning"
prerequisites: ["neural_network_basics"]
difficulty: 2
importance: 4
status: "unknown"
tags: ["word2vec", "embedding", "glove", "fasttext", "distributional-semantics", "nlp"]
---

词嵌入(Word Embedding)是NLP深度学习的基础，核心思想源于分布式语义假设(Distributional Hypothesis)：上下文相似的词语义相近。Word2Vec提供两种架构：Skip-gram（用中心词预测上下文词，对罕见词效果更好）和CBOW（用上下文词预测中心词，训练更快）。训练优化方面，负采样(Negative Sampling)将softmax转化为二分类问题，只更新少量负样本权重；Hierarchical Softmax使用Huffman树将计算复杂度从O(V)降至O(log V)。GloVe通过全局词共现矩阵分解结合了全局统计信息和局部上下文窗口的优势。FastText引入子词(Subword)嵌入，将词表示为字符n-gram的向量和，有效处理OOV词和罕见词。词向量的经典特性：语义类比推理（king - man + woman ≈ queen），向量空间中的线性语义运算。从静态词向量到上下文相关嵌入(ELMo→BERT)的演进，标志着NLP预训练范式的转变。

## Quiz

### Q1
**问题**: Word2Vec负采样(Negative Sampling)中，负样本数量k=5的含义是什么？

- A. 每次只计算5个正样本词的梯度
- B. 对中心词，从词汇表中随机选5个非上下文词作为负样本，与1个正样本一起更新权重  ✓
- C. 丢弃梯度小于阈值的样本，只保留5个
- D. 每5个训练样本组成一个mini-batch

**解析**: Skip-gram原始目标需要对整个词汇表V计算softmax（计算量巨大）。负采样将其简化为：对每个(target, context)正样本对，随机采样k个(通常5-20个)非上下文的"噪声词"作为负样本，训练一个二分类器区分正/负对。公式为 P(w|c) = σ(v_c·v_w) × ∏_{i=1}^k σ(-v_c·v_{ni})。由于只需更新1+k个词向量（而非全部V），训练速度大幅提升。k的选择：小数据集k=5-20，大数据集k=2-5。

### Q2
**问题**: GloVe相比Word2Vec在捕捉词义关系上的核心优势是什么？

- A. 训练速度更快
- B. 通过全局词共现矩阵分解，能更好地捕捉全局统计规律，而非仅依赖局部滑动窗口  ✓
- C. 能生成动态上下文相关的词向量
- D. 不需要大规模语料

**解析**: GloVe的核心公式：w_i·w_j + b_i + b_j = log(X_ij)，其中X_ij是词i和词j的共现次数。GloVe先用整个语料构建词共现矩阵X（全局信息），再通过加权最小二乘回归学习词向量，使向量内积重构共现计数的对数。这同时捕捉了：局部窗口中的共现模式（类似Word2Vec）和全局共现分布（LSA矩阵分解的优势）。实验表明GloVe在类比推理任务上表现更好，因为全局统计信息更稳定。

### Q3
**问题**: FastText能处理"unfriendliness"这类词的嵌入，而Word2Vec不能（若该词未出现在训练语料中），其根本原理是什么？

- A. FastText使用更大的词汇表
- B. FastText将一个词的嵌入表示为该词所有字符n-gram（如"<un","unf","fri","nd>"等）的向量之和，即使整词未见过，其子词仍有嵌入  ✓
- C. FastText会在推理时动态扩展词汇表
- D. FastText使用句法分析来推断词义

**解析**: FastText的嵌入公式：v_word = (1/|G|) ∑_{g∈G} z_g，其中G是该词的所有字符n-gram集合（如n=3,4,5,6），z_g是可学习的n-gram向量。每个词还被加上特殊的整词向量。以"unfriendliness"为例，其子词如"un","fri","end","ness"等在训练语料中可能出现在其他词中，因此能推断新词的语义。这天然适用语言中的词缀规律（如"un-"表示否定），同时对罕见词也能通过高频子词获得更稳定的表示。

## 参考资料

### 论文
- **[Efficient Estimation of Word Representations in Vector Space]** (Tomas Mikolov et al., 2013) — 提出 Word2Vec（Skip-gram 与 CBOW），负采样和层次化 Softmax，是词嵌入领域的奠基论文。https://arxiv.org/abs/1301.3781
- **[GloVe: Global Vectors for Word Representation]** (Jeffrey Pennington, Richard Socher & Christopher Manning, 2014) — 提出 GloVe，通过全局词共现矩阵分解学习词向量，在词类比和相似度任务上超过 Word2Vec。https://aclanthology.org/D14-1162/
- **[Enriching Word Vectors with Subword Information]** (Piotr Bojanowski et al., 2017) — 提出 FastText，将词表示为字符 n-gram 的向量和，有效处理未登录词（OOV）和形态丰富语言。https://arxiv.org/abs/1607.04606

