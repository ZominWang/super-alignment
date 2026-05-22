---
id: "ensemble_feature"
name: "集成学习与特征工程"
name_en: "Ensemble Learning & Feature Engineering"
type: "topic"
level: 3
area: "foundations"
direction: "ml"
prerequisites: ["model_evaluation"]
difficulty: 3
importance: 1
status: "unknown"
tags: ["ml", "ensemble", "random-forest", "boosting", "feature-engineering"]
---

集成学习通过组合多个弱学习器构建强学习器，随机森林（Bagging）和 XGBoost/LightGBM（Boosting）是竞赛中最强的非深度学习方法。特征工程在数据驱动的业务场景中往往比模型选择更重要，决定着模型的性能上限。

## Quiz

### Q1
**问题**: Bagging（如随机森林）和 Boosting（如 AdaBoost/XGBoost）的核心区别是？

- A. Bagging 使用决策树，Boosting 使用线性模型
- B. Bagging 并行训练独立模型取平均，Boosting 串行训练模型使后续聚焦于前者的错误  ✓
- C. Boosting 总是比 Bagging 表现更好
- D. Bagging 需要更多数据

**解析**: Bagging 通过 Bootstrap 采样训练多个独立模型并取平均/投票，降低方差。Boosting 串行训练，每轮加大对错误样本的权重，使新模型专注于修正前模型的错误，降低偏差。两者组合可进一步提升（Stacking）。

### Q2
**问题**: 在特征工程中，One-Hot 编码对于高基数（High Cardinality）类别特征（如数百个城市）的主要问题是？

- A. One-Hot 编码无法处理类别特征
- B. 产生极稀疏高维向量，引入维度诅咒，且无法表达类别间的相似性  ✓
- C. One-Hot 编码只适用于线性模型
- D. 类别数量越多，One-Hot 编码越准确

**解析**: 100 个城市的 One-Hot 编码产生 100 维稀疏向量。替代方案包括：Target Encoding（用目标变量的均值替换类别）、Embedding（学习低维密集表示，LLM 的词嵌入本质也是这个思路）和频率编码。

### Q3
**问题**: XGBoost 中的"正则化"项在目标函数中的作用是什么？

- A. 加速梯度计算
- B. 控制每棵树的叶子节点数量和权重大小，防止单棵树过复杂  ✓
- C. 平衡各树的权重
- D. 确保树的深度一致

**解析**: XGBoost 的目标函数 = 损失 + Ω(树)，其中 Ω = γT + (1/2)λΣw²，T 是叶节点数，w 是叶权重。γ 控制树的复杂度（剪枝），λ 是 L2 正则化系数。相比传统 GBDT，这种正则化让 XGBoost 有更好的泛化能力。
