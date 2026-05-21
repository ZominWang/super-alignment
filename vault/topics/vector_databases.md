---
id: "vector_databases"
name: "向量数据库"
name_en: "Vector Databases"
type: "topic"
level: 3
area: "application"
direction: "rag"
prerequisites: ["embeddings"]
difficulty: 2
importance: 4
status: "unknown"
tags: ["rag", "vector-db", "faiss", "pinecone", "chroma", "weaviate", "ANN"]
---

向量数据库专门用于存储和快速检索高维嵌入向量，是 RAG 系统的核心存储层。FAISS（Meta）提供高效的 ANN 算法，Chroma、Weaviate、Pinecone 是主流的向量数据库产品，HNSW 算法是目前最广泛使用的近似最近邻索引结构。

## Quiz

### Q1
**问题**: 为什么向量数据库使用"近似最近邻"（ANN）而非精确最近邻（KNN）搜索？

- A. ANN 结果更准确
- B. 在高维空间（如 1536 维）中，精确 KNN 需要对所有向量做线性扫描，时间复杂度 O(n)，ANN 以轻微精度损失换取亚线性检索时间  ✓
- C. ANN 内存消耗更少
- D. 精确 KNN 在高维空间中数学上无法定义

**解析**: 数据库有 100 万个向量，维度 1536，精确 KNN 需计算 100 万次点积（约 100 万×1536 次乘法）。ANN 索引（如 HNSW）通过图结构使搜索路径缩短为 O(log n) 左右，以 95%+ 的召回率换取约 10-100 倍的速度提升，对 RAG 应用完全可接受。

### Q2
**问题**: HNSW（Hierarchical Navigable Small World）索引的"层次结构"是什么概念？

- A. HNSW 将向量按维度分层存储
- B. HNSW 构建多层图，上层是稀疏长程连接，下层是密集短程连接，搜索时从上层快速定位再精细化  ✓
- C. HNSW 按向量模长分层
- D. HNSW 的层次对应不同的量化精度

**解析**: HNSW 类比地图：最高层只有少数"高速公路"节点，覆盖大范围；最低层包含所有节点的精细连接。查询从最高层入口点出发，贪婪地向查询向量靠近，逐层下探，到最底层找到最近邻。这种层次结构使时间复杂度约为 O(log n)。

### Q3
**问题**: 混合搜索（Hybrid Search）结合稀疏检索（BM25）和密集检索（向量搜索）的优势是什么？

- A. 混合搜索可以处理更大的数据量
- B. 稀疏检索擅长关键词精确匹配，密集检索擅长语义理解，混合结合两者优势覆盖更广的查询类型  ✓
- C. 混合搜索减少了向量数据库的存储需求
- D. 混合搜索只在处理中文时有优势

**解析**: 用户搜索"GPT-4 的上下文窗口长度"：BM25 能精确匹配"GPT-4"和"上下文窗口"等关键词；向量搜索能找到语义相关的"大模型输入长度限制"等描述。Reciprocal Rank Fusion（RRF）或加权融合将两种检索结果合并，通常比单一方式召回率高 5-15%。
