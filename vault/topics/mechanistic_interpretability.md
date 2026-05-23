---
id: "mechanistic_interpretability"
name: "机械可解释性"
name_en: "Mechanistic Interpretability"
type: "topic"
level: 5
area: "safety"
direction: "alignment"
prerequisites: ["transformer_arch", "interpretability"]
difficulty: 5
importance: 4
status: "unknown"
tags: ["mechanistic-interpretability", "circuits", "features", "sae", "sparse-autoencoder"]
---

机械可解释性（Mechanistic Interpretability）试图以逆向工程的方式理解神经网络的内部计算机制——不仅回答"模型做了什么"，更要回答"模型如何做的"。核心工作建立在 Anthropic 的 Transformer Circuits 研究框架之上，提出残差流（Residual Stream）作为模型各组件通信的通道、注意力头可分解为 QK 和 OV 电路（QK 决定从哪里读取信息，OV 决定读取后写什么到残差流）。关键现象包括 Induction Head（前一个 token 的注意力模式被复制到后一个 token，是实现上下文学习 In-Context Learning 的关键机制）、Superposition 假说（模型利用高维空间的近似正交性，在少量神经元中压缩表示远超神经元数量的特征）和线性表示假说（概念特征在激活空间中以近似线性的方向编码）。Sparse Autoencoder（SAE/稀疏自编码器）是目前提取可解释特征的主流方法——通过训练自编码器将模型激活分解为稀疏的、单语义（monosemantic）特征向量集合。Anthropic 的"Towards Monosemanticity"和后续工作证明 SAE 可从 Claude 等模型中提取数百万个可解释特征，涵盖概念、语法、安全行为等。

## Quiz

### Q1
**问题**: Transformer Circuits 框架中，Induction Head 的发现揭示了什么？

- A. Transformer 中对前一层输出的归纳偏置
- B. 一种特定的注意力机制模式：当前 token 关注"前一个 token 曾关注过的 token"，是实现 In-Context Learning（上下文学习）的微观机制——使模型能从上下文中复制模式而不改变权重  ✓
- C. 所有注意力头本质上的功能相同
- D. Transformer 通过归纳头实现位置编码

**解析**: Induction Head 由两个注意力头组合实现：第一个头（Previous Token Head）从每个位置复制前一个 token 的信息到当前位置；第二个头使用该信息作为 Query，匹配 Key 中存储的历史 token，实现"[A][B]... [A] → [B]"的上下文模式复制。Elhage et al. (2021) 证明在仅两层 Transformer 的小型语言模型中，Induction Head 的出现与 In-Context Learning 能力的涌现高度相关，是理解 LLM 上下文学习能力的关键突破口。

### Q2
**问题**: Superposition 假说（Superposition Hypothesis）描述的现象是什么？

- A. 多个模型层叠加后产生的累加效应
- B. 神经网络将多于神经元数量的特征压缩表示在激活空间中，利用高维空间的近似正交性使特征向量"几乎"不互相干扰——这解释了为什么单个神经元通常不表示单一概念（polysemanticity）  ✓
- C. 不同注意力头在计算时相互覆盖
- D. 梯度在反向传播时互相叠加

**解析**: 对于一个 d 维的激活空间，理论上最多只能有 d 个完全正交的方向。但 Elhage et al. (2022) 的"Toy Models of Superposition"展示了令人惊讶的发现：稀疏特征（大多数时间处于"关闭"状态的特征）可以通过略微偏离正交的方向表示远超 d 个特征，代价是当多个特征同时激活时会有轻微干扰。这解释了为什么 LLM 存储远超神经元数的概念，也说明了为什么解释单个神经元困难——每个神经元可能参与表示数十个不同特征。

### Q3
**问题**: Sparse Autoencoder（SAE）在机械可解释性中的用途是什么？

- A. 压缩模型参数以减少显存占用
- B. 作为分析工具：训练 SAE 将模型的内部激活（如 MLP 层输出或残差流）分解为一组稀疏的、方向性的"特征向量"——每个特征对应一个人类可理解的概念，从而实现从"黑箱激活"到"可解释特征字典"的转化  ✓
- C. 替代 Transformer 中的自注意力机制
- D. 用于生成训练数据的自动标注

**解析**: SAE 架构：编码器将 d 维激活映射到更高维的潜在空间（如 d→4d），强制稀疏激活（通过 L1 正则或 Top-K 激活），解码器将稀疏潜在表示重建回原始激活。通过查看每个潜在维度的最大激活样本（如"这个维度在'金门大桥''自由女神像'等文本上激活最高"可判断该维度编码"美国地标"），可以构建人工可理解的"特征词典"。Anthropic 在 Claude 上用 SAE 成功提取了数百万个可解释特征（Bricken et al., 2023）。

## 参考资料

### 论文
- **[A Mathematical Framework for Transformer Circuits]** (Elhage et al., 2021) —— Transformer Circuits 研究框架的基础论文，提出残差流、QK/OV 电路等核心概念。https://transformer-circuits.pub/2021/framework/index.html
- **[Towards Monosemanticity: Decomposing Language Models With Dictionary Learning]** (Bricken et al., 2023) —— 使用稀疏自编码器从语言模型中提取可解释的单语义特征。https://transformer-circuits.pub/2023/monosemantic-features/index.html
- **[Zoom In: An Introduction to Circuits]** (Olah et al., 2020) —— 电路分析方法的入门指南，通过可视化方式理解神经网络内部计算机制。https://distill.pub/2020/circuits/zoom-in/

### 博文/教程
- **[Transformer Circuits Thread]** —— Anthropic 的 Transformer 可解释性研究系列，涵盖 Induction Head、Superposition、SAE 等关键发现。https://transformer-circuits.pub
