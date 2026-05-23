---
id: "calculus_optimization"
name: "微积分与优化"
name_en: "Calculus & Optimization"
type: "topic"
level: 3
area: "foundations"
direction: "math"
prerequisites: []
difficulty: 2
importance: 4
status: "unknown"
tags: ["math", "calculus", "gradient", "optimization"]
---

微积分与优化理论是训练神经网络的核心数学基础。梯度下降依赖导数计算损失函数的下降方向，链式法则使反向传播成为可能，而理解凸优化和鞍点问题是分析训练稳定性的关键。

## Quiz

### Q1
**问题**: 梯度下降中，为什么更新参数时要沿梯度的"负"方向移动？

- A. 负方向是惯例，正方向也可以
- B. 梯度指向函数值增大最快的方向，沿负梯度方向才能最快减小损失  ✓
- C. 负方向使学习率可以设为正数
- D. 这是为了数值稳定性

**解析**: 梯度 ∇f(x) 指向函数在该点增大最快的方向。为了最小化损失函数，我们沿 -∇f(x) 方向更新：θ = θ - η·∇L(θ)，其中 η 是学习率。

### Q2
**问题**: 以下哪个描述正确区分了"局部最小值"和"鞍点"？

- A. 鞍点的梯度不为零，局部最小值梯度为零
- B. 两者梯度都为零，但鞍点在某些方向上是极大值，在其他方向上是极小值  ✓
- C. 鞍点只存在于二维空间
- D. 局部最小值一定是全局最小值

**解析**: 局部最小值和鞍点的梯度都为零（称为临界点），但二阶导数（Hessian 矩阵）的符号不同。高维空间中，鞍点比局部最小值更常见，深度学习优化器需要设计来逃离鞍点。

### Q3
**问题**: Adam 优化器相比普通 SGD 的核心改进是？

- A. 使用更大的 batch size
- B. 同时维护梯度的一阶矩（均值）和二阶矩（未中心化方差）来自适应学习率  ✓
- C. 引入动量来加速收敛
- D. 使用全批次梯度而非小批次

**解析**: Adam 结合了 Momentum（一阶矩，平滑梯度方向）和 RMSProp（二阶矩，为每个参数自适应调整学习率）的优点。参数更新为：m̂/（√v̂ + ε），自动为频繁更新的参数减小学习率，为稀疏梯度的参数增大学习率。

## 参考资料

### 论文
- **[Adam: A Method for Stochastic Optimization]** (Diederik P. Kingma & Jimmy Ba, 2014) — 提出 Adam 优化器，结合自适应学习率与动量，成为深度学习训练的默认优化器。https://arxiv.org/abs/1412.6980
- **[An Overview of Gradient Descent Optimization Algorithms]** (Sebastian Ruder, 2016) — 系统综述 SGD、Momentum、RMSProp、Adam 等优化算法的原理与比较，是优化算法学习的高质量综述。https://arxiv.org/abs/1609.04747

### 视频（B站/YouTube）
- **[Calculus — The Essence of Calculus]** — 3Blue1Brown。以直觉和几何视角讲解微积分核心概念（导数、积分、链式法则），为理解反向传播奠定基础。https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr
