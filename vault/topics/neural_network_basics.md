---
id: "neural_network_basics"
name: "神经网络基础"
name_en: "Neural Network Basics"
type: "topic"
level: 3
area: "foundations"
direction: "deep_learning"
prerequisites: ["supervised_learning", "calculus_optimization"]
difficulty: 2
importance: 5
status: "unknown"
tags: ["deep-learning", "neural-networks", "activation", "forward-pass"]
---

神经网络通过堆叠全连接层和非线性激活函数构建层次化的特征表示。前向传播计算预测值，激活函数（ReLU、Sigmoid、Softmax）引入非线性，Batch Normalization 稳定训练，Dropout 防止过拟合。这些是所有深度学习架构的基本构件。

## Quiz

### Q1
**问题**: 为什么神经网络需要非线性激活函数？如果全部使用线性激活函数会怎样？

- A. 非线性激活让计算更快
- B. 没有非线性激活，多层网络等价于单层线性变换，无法学习非线性规律  ✓
- C. 非线性激活防止梯度爆炸
- D. 线性激活函数在数学上不可微

**解析**: 线性变换的组合仍是线性变换：W₂(W₁x) = (W₂W₁)x。无论堆叠多少层，无激活函数的网络等价于一层线性模型。ReLU 等非线性激活使网络能够近似任意复杂函数（通用近似定理）。

### Q2
**问题**: Batch Normalization（BN）在训练时的操作是什么，为什么有效？

- A. 将每个样本的特征归一化到 [0,1] 范围
- B. 对 mini-batch 内的每个特征归一化，然后通过可学习参数 γ、β 重缩放  ✓
- C. 随机丢弃一部分 batch 中的样本
- D. 对权重矩阵而非激活值进行归一化

**解析**: BN 计算 batch 内每个特征的均值和方差，将激活值归一化为零均值单位方差，再用可学习的 γ（缩放）和 β（偏移）恢复表达能力。BN 减少了内部协变量偏移，允许使用更大学习率，起到正则化作用。

### Q3
**问题**: ReLU 激活函数相比 Sigmoid 的主要优势是什么？

- A. ReLU 的输出范围更广（0到+∞）
- B. ReLU 在正区间梯度恒为1，缓解梯度消失问题，计算也更高效  ✓
- C. ReLU 可以输出负值
- D. ReLU 保证输出为概率值

**解析**: Sigmoid 的梯度最大为 0.25，深层网络中梯度连乘后趋近于零（梯度消失）。ReLU 在 x>0 时梯度为1，不会引入额外的梯度衰减。但 ReLU 存在"死亡 ReLU"问题（x<0 时梯度永远为0），LeakyReLU 和 GELU 是改进版本。
