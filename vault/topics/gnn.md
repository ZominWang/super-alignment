---
id: "gnn"
name: "图神经网络"
name_en: "Graph Neural Networks"
type: "topic"
level: 3
area: "foundations"
direction: "deep_learning"
prerequisites: ["neural_network_basics", "linear_algebra"]
difficulty: 4
importance: 2
status: "unknown"
tags: ["gnn", "graph", "message-passing", "gcn", "gat", "graphsage"]
---

图神经网络（GNN）是处理非欧几里得结构数据（社交网络、分子、知识图谱）的深度学习范式，核心在于消息传递（Message Passing）：每个节点通过聚合邻居节点的特征来更新自身表示。GCN（图卷积网络）将谱域图卷积简化为邻域均值聚合的一阶近似，奠定了基础框架；GraphSAGE 提出归纳式学习，通过对邻居采样和可学习聚合函数（Mean/LSTM/Pool）泛化到未见节点；GAT（图注意力网络）引入自注意力机制加权邻居，使模型自动学习不同邻居的重要性；GIN（图同构网络）证明了 sum 聚合与多层 MLP 的组合能达到与 Weisfeiler-Lehman 图同构测试同等的表达能力，是理论上最强的 GNN。GNN 的核心应用包括分子性质预测（将原子视为节点、化学键视为边）、推荐系统（用户-商品二部图上的链接预测）、知识图谱推理（实体关系补全），以及社交网络影响传播和交通预测。

## Quiz

### Q1
**问题**: GCN 的核心更新公式中，节点 v 的新表示是通过什么方式计算的？

- A. 只使用节点 v 自身的前一层表示进行线性变换
- B. 对节点 v 所有邻居（含自环）的表示求加权平均后做线性变换，权重基于节点度数归一化 ✓
- C. 使用 RNN 对邻居序列进行编码
- D. 对邻居表示做 max-pooling 后直接作为新表示

**解析**: GCN 层传播公式 H^(l+1) = σ(D̃^(-1/2) Ã D̃^(-1/2) H^(l) W^(l))，其中 Ã = A + I（添加自环），D̃ 是度矩阵。本质上是将每个节点与邻居做归一化加权平均（度数大的节点其邻居贡献被稀释），再通过可学习的权重矩阵 W 做线性变换。这个"平均"操作源自谱域图卷积的一阶切比雪夫多项式近似，假设所有邻居同等重要——这正是后续 GAT 用注意力改进的动机。

### Q2
**问题**: GraphSAGE 的"归纳式学习"（Inductive Learning）与 GCN 的"直推式学习"（Transductive Learning）的核心区别是什么？

- A. GraphSAGE 可以处理有向图，GCN 只能处理无向图
- B. GraphSAGE 学习的是一个聚合函数而非固定节点的嵌入，因此能对训练时未出现的节点生成表示；GCN 需要全图结构参与训练，新节点加入需重新训练 ✓
- C. GraphSAGE 不需要邻居信息，直接通过节点特征预测
- D. 归纳式学习比直推式学习总是准确率更高

**解析**: GCN 训练时依赖全图的邻接矩阵 A，每个节点的表示与其他所有节点耦合——新增节点意味着图结构改变，必须重新训练。GraphSAGE 学习的是"如何聚合邻居"的函数（如 Mean Aggregator: h_v ← σ(W · MEAN({h_v} ∪ {h_u, ∀u ∈ N(v)}))），而非记住每个节点的嵌入向量。推理时给定新节点的特征和邻域，直接用已训练的聚合函数计算出表示。这在推荐系统等动态图场景中至关重要。

### Q3
**问题**: GIN（Graph Isomorphism Network）为什么要使用 sum 聚合而非 mean 或 max 聚合？

- A. sum 聚合计算速度最快
- B. sum 聚合能完整保留邻居集合的多重集（multiset）信息，mean 和 max 会丢失结构差异，导致 WL 同构测试失败 ✓
- C. sum 聚合天然支持注意力权重
- D. mean 和 max 聚合会导致梯度消失

**解析**: 考虑两个不同图：图 A 中节点 v 有两个邻居分别包含特征 [1,1]，图 B 中节点 v 有一个邻居包含特征 [2,2]。mean 聚合下两者结果相同（都是 [1,1]），max 聚合也相同（都是 [1,1]），但 sum 聚合能区分（[2,2] vs [2,2]...等等。具体例子：图 A 有两个邻居分别有特征 a 和 b，图 B 有四个邻居分别为 a、a、b、b。mean 聚合结果两图相同（都是 (a+b)/2），但 sum 不同（a+b vs 2a+2b）。GIN 用 sum + MLP: h_v = MLP((1+ε)·h_v + Σ_{u∈N(v)} h_u)，这种形式在可数函数空间中等价于 WL 同构测试，因此 GIN 的表达能力达到理论上限。

## 参考资料

### 论文
- **[Semi-Supervised Classification with Graph Convolutional Networks]** (Kipf & Welling, 2017) — 将谱域图卷积简化为邻域均值聚合的一阶近似，奠定了 GCN 的基础框架。https://arxiv.org/abs/1609.02907
- **[Inductive Representation Learning on Large Graphs]** (Hamilton et al., 2017) — 提出 GraphSAGE，通过对邻居采样和可学习聚合函数实现归纳式学习，泛化到未见节点。https://arxiv.org/abs/1706.02216
- **[Graph Attention Networks]** (Veličković et al., 2018) — 引入自注意力机制加权邻居，使模型自动学习不同邻居的重要性差异。https://arxiv.org/abs/1710.10903
