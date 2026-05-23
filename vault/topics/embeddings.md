---
id: "embeddings"
name: "嵌入向量与语义搜索"
name_en: "Embeddings & Semantic Search"
type: "topic"
level: 3
area: "application"
direction: "rag"
prerequisites: ["pretrained_lm"]
difficulty: 2
importance: 5
status: "unknown"
tags: ["rag", "embeddings", "semantic-search", "similarity", "dense-retrieval"]
---

嵌入向量将文本映射为高维向量空间中的点，语义相似的文本在向量空间中距离更近。句子嵌入模型（如 text-embedding-ada-002、BGE、E5）是 RAG 系统的基础，余弦相似度是最常用的语义相似度度量。

## Quiz

### Q1
**问题**: 余弦相似度相比欧几里得距离在文本嵌入检索中更常用的原因是？

- A. 余弦相似度计算更快
- B. 余弦相似度度量向量方向而非距离，对向量模长（文本长度）不敏感，更适合语义比较  ✓
- C. 欧氏距离在高维空间中无效
- D. 余弦相似度可以处理负向量

**解析**: 同一文本的长版本和短版本（增加重复内容）语义相同，但嵌入向量的欧氏距离会因模长不同而变大。余弦相似度 cos(θ) = (A·B)/(|A||B|) 只看方向，对长度归一化，因此"今天天气很好"和它的重复版本余弦相似度为1。

### Q2
**问题**: 双编码器（Bi-encoder）和交叉编码器（Cross-encoder）在语义搜索中各自的适用场景是？

- A. 双编码器用于精确匹配，交叉编码器用于模糊搜索
- B. 双编码器预计算文档嵌入适合大规模检索（高速），交叉编码器同时编码查询和文档适合精确重排序（高精度）  ✓
- C. 交叉编码器在所有场景下都优于双编码器
- D. 两者适用场景完全相同

**解析**: 双编码器将查询和文档独立编码，可预计算并用 ANN（近似最近邻）快速检索，适合从百万文档中召回 Top-K。但独立编码不能捕捉细粒度的词级交互。交叉编码器将[query, doc]拼接后一起编码，精度更高但需要对每对(query, doc)单独运行，不可预计算，只适合对少量候选重排序。

### Q3
**问题**: 文本分块（Chunking）策略对嵌入检索质量的影响是什么？

- A. 分块越小，检索质量越高
- B. 分块需要平衡：太小丢失上下文，太大稀释关键信息，且块大小应与嵌入模型的训练方式匹配  ✓
- C. 分块大小只影响索引构建速度，不影响检索质量
- D. 按句子分块总是最优的

**解析**: 小块（如 128 tokens）语义集中，检索精准但上下文不足；大块（如 1024 tokens）上下文丰富但检索时会引入噪音。常见策略：重叠分块（chunk_overlap=50）保留块间连续性，父文档检索（小块检索+大块返回），语义分块（按自然段落或主题边界）。块大小还受限于嵌入模型的最大输入长度（如 512 tokens）。

## 参考资料

### 论文
- **[Efficient Estimation of Word Representations in Vector Space]** (Mikolov et al., 2013) —— Word2Vec 开创性论文，提出 CBOW 和 Skip-gram 模型学习稠密词向量。https://arxiv.org/abs/1301.3781
- **[Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks]** (Reimers & Gurevych, 2019) —— 提出 Sentence-BERT，通过孪生网络生成语义句子嵌入，大幅提升检索效率。https://arxiv.org/abs/1908.10084

### 博文/教程
- **[MTEB Leaderboard]** —— Massive Text Embedding Benchmark，衡量嵌入模型在分类、检索、聚类等任务上的表现。https://huggingface.co/spaces/mteb/leaderboard

### 课程
- **[Understanding and Applying Text Embeddings]** — Google Cloud / DeepLearning.AI（免费）。涵盖文本嵌入原理、语义相似度计算、分类与聚类应用，含 Vertex AI 实操 notebook，是嵌入向量应用的标准入门课。https://www.deeplearning.ai/short-courses/google-cloud-vertex-ai/
- **[LangChain: Chat with Your Data]** — Harrison Chase / DeepLearning.AI（免费）。在构建 RAG 系统的过程中深度实践嵌入向量的生成、存储与检索，是理解嵌入实际用途的最佳配套课程。https://www.deeplearning.ai/short-courses/langchain-chat-with-your-data/
- **[HuggingFace NLP Course — 第6/7章]** — Hugging Face（免费）。系统讲解 Sentence Transformers 与 Dense Embedding 模型的训练、微调与评估，含在 HuggingFace Hub 部署嵌入模型的完整 notebook，是嵌入模型工程化的权威来源。https://huggingface.co/learn/nlp-course/
