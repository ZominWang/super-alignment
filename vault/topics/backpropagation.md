---
id: "backpropagation"
name: "反向传播与训练技巧"
name_en: "Backpropagation & Training Tricks"
type: "topic"
level: 3
area: "foundations"
direction: "deep_learning"
prerequisites: ["neural_network_basics"]
difficulty: 3
importance: 5
status: "unknown"
tags: ["deep-learning", "backprop", "gradient", "training"]
---

反向传播是训练神经网络的核心算法，通过链式法则高效计算所有参数的梯度。学习率调度、梯度裁剪、权重初始化（He/Xavier）是稳定训练的关键实践，深入理解反向传播是调试模型问题的基础。

## Quiz

### Q1
**问题**: 反向传播中的"链式法则"解决了什么核心问题？

- A. 解决了矩阵乘法的计算复杂度问题
- B. 实现了对深层网络中所有参数梯度的高效逐层计算  ✓
- C. 防止了梯度消失问题
- D. 使网络可以并行训练

**解析**: 链式法则 ∂L/∂w = (∂L/∂y)(∂y/∂w) 使得深层网络中后层的梯度可以通过逐层乘以局部雅可比矩阵传递到前层。反向传播是"动态规划 + 链式法则"的组合，重用中间计算结果，时间复杂度与前向传播同阶。

### Q2
**问题**: 梯度裁剪（Gradient Clipping）主要解决什么问题，在哪类模型中最常用？

- A. 解决梯度消失问题，常用于 CNN
- B. 解决梯度爆炸问题，常用于 RNN/LSTM 和 Transformer 的训练  ✓
- C. 加速收敛，常用于任意深度模型
- D. 防止过拟合，替代 Dropout

**解析**: 梯度爆炸时，参数更新幅度过大导致训练不稳定甚至数值溢出。梯度裁剪将梯度范数限制在阈值以内（如 max_norm=1.0）。RNN/LSTM 因序列长度导致梯度连乘特别容易爆炸，LLM 训练中也会设置 gradient_clip。

### Q3
**问题**: He 初始化（针对 ReLU）将权重方差设为 2/n_in，为什么是 2 而不是 1？

- A. 2 是经验值，没有理论依据
- B. ReLU 将约一半的激活值置零，需要将方差乘以 2 以补偿信号强度  ✓
- C. 2 是为了与 Xavier 初始化保持一致
- D. 这与网络深度有关，深网络需要更大初始化

**解析**: Xavier 初始化假设激活函数关于零对称（如 tanh），方差设为 1/n_in。ReLU 将负半轴全部截断，信号强度减半，因此方差需要加倍为 2/n_in（He 初始化）。好的初始化让每层输出的方差在前向传播中保持稳定，避免信号消失或爆炸。

## 参考资料

### 论文
- **[Learning Representations by Back-propagating Errors]** (David E. Rumelhart, Geoffrey E. Hinton & Ronald J. Williams, 1986) — 反向传播算法的里程碑论文，证明了多层网络可以通过梯度下降有效学习，奠定了现代深度学习的训练基础。Nature, 323:533–536.
- **[Delving Deep into Rectifiers: Surpassing Human-Level Performance on ImageNet Classification]** (Kaiming He et al., 2015) — 提出 He 初始化和 PReLU 激活函数，首次使深度残差网络在 ImageNet 上超越人类水平。https://arxiv.org/abs/1502.01852

### 博文/教程
- **[Yes you should understand backprop]** — Andrej Karpathy（Medium）。深入剖析反向传播的细节与常见陷阱，配合 micrograd 项目从零实现自动微分引擎，是理解反向传播实现的最佳实践教程。https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b
- **[The spelled-out intro to neural networks and backpropagation: building micrograd]** — Andrej Karpathy（YouTube）。从零用 Python 实现自动微分引擎，手推反向传播的每一步，是理解梯度计算机制最扎实的视频教程。https://www.youtube.com/watch?v=VMj-3S1tku0
