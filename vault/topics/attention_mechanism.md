---
id: "attention_mechanism"
name: "注意力机制"
name_en: "Attention Mechanism"
type: "topic"
level: 3
area: "llm"
direction: "llm_arch"
prerequisites: ["rnn_lstm"]
difficulty: 3
importance: 5
status: "unknown"
tags: ["llm", "attention", "self-attention", "transformer"]
---

注意力机制允许模型动态关注输入的不同部分，是 Transformer 架构的核心。自注意力（Self-Attention）通过 Query、Key、Value 三元组计算词间关联，多头注意力并行学习不同类型的依赖关系，位置编码弥补了注意力的置换不变性。

## Quiz

### Q1
**问题**: 缩放点积注意力（Scaled Dot-Product Attention）中，为什么要除以 √d_k 进行缩放？

- A. 使输出范围归一化到 [0,1]
- B. 防止当维度 d_k 较大时点积值过大，导致 softmax 进入梯度极小的饱和区  ✓
- C. 确保注意力权重之和为1
- D. 加速矩阵乘法计算

**解析**: 当 d_k 较大时，Q·K^T 的点积方差为 d_k，值域变大。softmax 在极大值处梯度趋近于零，导致梯度消失。除以 √d_k 将方差归一化为1，使 softmax 的输出更均匀，梯度更健康。

### Q2
**问题**: 多头注意力（Multi-Head Attention）相比单头注意力的优势是？

- A. 减少了计算量，每头处理的维度更低
- B. 允许模型在不同表示子空间中并行学习不同类型的依赖关系（如句法、语义）  ✓
- C. 多头注意力不需要位置编码
- D. 消除了长距离依赖问题

**解析**: 单头注意力只能学习一种关注模式。多头注意力将 d_model 维分成 h 个 d_k=d_model/h 维子空间，每个头独立学习一种关注模式（如一个头关注主谓关系，另一个头关注指代关系），最后拼接。总计算量与单头相近，但表达能力更强。

### Q3
**问题**: 在 Transformer 中，为什么需要位置编码（Positional Encoding）？

- A. 加速训练过程
- B. 注意力机制本身是置换不变的，无法区分词的顺序，位置编码显式注入位置信息  ✓
- C. 防止不同词的嵌入向量相同
- D. 使模型能够处理更长的序列

**解析**: 自注意力计算 Q·K^T 时，打乱序列顺序不影响每对词的注意力权重（置换不变性）。但语言中词序至关重要（"猫吃鱼"≠"鱼吃猫"）。正弦余弦位置编码或可学习的位置嵌入将位置信息加入词嵌入，使模型能感知顺序。
