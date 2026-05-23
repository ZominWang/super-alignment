---
id: "interpretability"
name: "可解释性"
name_en: "Interpretability"
type: "topic"
level: 3
area: "safety"
direction: "alignment"
prerequisites: ["bias_fairness"]
difficulty: 4
importance: 1
status: "unknown"
tags: ["safety", "interpretability", "mechanistic", "attention", "probing"]
---

可解释性研究试图理解 LLM 内部的工作机制，从注意力可视化到机械可解释性（Mechanistic Interpretability），从特征探针（Probing Classifiers）到电路分析。理解模型内部机制是发现隐藏偏见、改善对齐和构建可信 AI 的科学基础。

## Quiz

### Q1
**问题**: "注意力可视化"作为可解释性工具的主要局限是什么？

- A. 注意力权重可视化技术上难以实现
- B. 注意力权重不等于重要性权重，高注意力权重的 token 不一定对预测结果有决定性影响  ✓
- C. 注意力可视化只能用于图像模型
- D. 注意力权重总和不为1，难以解释

**解析**: 直觉上"模型关注了哪些词"等于"哪些词重要"，但研究表明两者并不等价（Attention is Not Explanation, Jain & Wallace 2019）。注意力分布可以任意改变而不影响预测结果。注意力是模型内部通信机制，不是人类可解释的显著图（Saliency Map）。基于梯度的归因方法（Integrated Gradients）更可靠。

### Q2
**问题**: "探针分类器（Probing Classifier）"在可解释性研究中用于发现什么？

- A. 检测模型是否被攻击
- B. 在模型的中间层表示上训练简单分类器，探测该层是否编码了特定语言学或语义信息  ✓
- C. 查找训练数据的记忆内容
- D. 评估模型的泛化能力

**解析**: 探针实验：从 Transformer 某层提取激活值，训练线性分类器（如 SVM）预测某属性（词性、句法关系、情感）。若线性探针达到高精度，说明该层已经编码了该信息。研究发现：低层编码句法，高层编码语义；不同注意力头专门化（有的头关注主语，有的关注代词）。

### Q3
**问题**: 机械可解释性（Mechanistic Interpretability）研究的目标是什么，与传统可解释性有何不同？

- A. 提供人类可读的模型文档
- B. 在神经网络层面找到实现特定行为的具体电路（子图），理解模型实现算法的神经机制  ✓
- C. 简化模型使其更容易理解
- D. 提供统计上的黑盒解释

**解析**: 传统可解释性是黑盒方法（输入输出关系）。机械可解释性（Anthropic、EleutherAI 等的研究）：逆向工程模型内部，找到实现具体功能的注意力头和 MLP 电路（如"直接对象归纳"电路、"模糊匹配"电路）。目标是完整理解模型如何实现推理，为改进对齐提供理论基础。发现了"超位置（Superposition）"现象——模型将多个概念压缩编码在同一神经元中。

## 参考资料

### 论文
- **["Why Should I Trust You?": Explaining the Predictions of Any Classifier](https://arxiv.org/abs/1602.04938)** (Ribeiro et al., 2016) — 提出 LIME（局部可解释模型无关解释），通过局部线性近似解释任意分类器的单次预测，是可解释 AI 的奠基性论文之一。https://arxiv.org/abs/1602.04938
- **[A Unified Approach to Interpreting Model Predictions](https://arxiv.org/abs/1705.07874)** (Lundberg & Lee, 2017) — 提出 SHAP（Shapley 值），将博弈论 Shapley 值引入特征归因，是目前最广泛使用的可解释性工具理论基础。https://arxiv.org/abs/1705.07874
- **[Toy Models of Superposition](https://arxiv.org/abs/2209.11895)** (Elhage et al., Anthropic, 2022) — 系统研究神经网络的"超位置"现象，是机械可解释性领域的重要实证研究。https://arxiv.org/abs/2209.11895

### 博文/教程
- **[Captum: Model Interpretability for PyTorch](https://captum.ai/)** — PyTorch 官方可解释性库文档，集成 Integrated Gradients、SHAP、LIME 等多种归因方法，提供实用代码示例。
