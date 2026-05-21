---
id: "linear_algebra"
name: "线性代数与矩阵运算"
name_en: "Linear Algebra & Matrix Operations"
type: "topic"
level: 3
area: "foundations"
direction: "math"
prerequisites: []
difficulty: 2
importance: 5
status: "unknown"
tags: ["math", "linear-algebra", "matrix", "vectors"]
---

线性代数是机器学习与深度学习的基础语言。向量和矩阵是神经网络数据表示的核心结构，矩阵乘法对应神经网络的前向传播，特征分解则是PCA等降维算法的数学根基，理解线性代数能让你对深度学习模型产生几何直觉。

## Quiz

### Q1
**问题**: 矩阵乘法 AB 合法的必要条件是什么？

- A. A 和 B 的行数必须相等
- B. A 的列数必须等于 B 的行数  ✓
- C. A 和 B 都必须是方阵
- D. A 和 B 的所有维度完全相同

**解析**: 若 A 是 m×n 矩阵，B 必须是 n×p 矩阵，结果为 m×p 矩阵。A 的列数（n）必须等于 B 的行数（n），这是矩阵乘法的基本约束。

### Q2
**问题**: 在深度学习中，矩阵的转置操作（A^T）最常见的应用场景是？

- A. 计算矩阵的逆
- B. 将权重矩阵从前向传播转换为反向传播梯度计算  ✓
- C. 增加矩阵的秩
- D. 将列向量变为行向量以节省内存

**解析**: 反向传播中，若前向传播是 y=Wx，那么对输入 x 的梯度是 W^T 乘以上游梯度。转置操作在 Attention 机制的 Q·K^T 计算中也频繁使用。

### Q3
**问题**: 奇异值分解（SVD）相比特征值分解（EVD）的优势是？

- A. SVD 计算速度更快
- B. SVD 可以应用于任意形状的矩阵，不限于方阵  ✓
- C. SVD 得到的奇异值总是正数，更稳定
- D. SVD 不需要迭代计算

**解析**: EVD 只能分解方阵，而 SVD 可以分解任意 m×n 矩阵：A = UΣV^T。在 LLM 的 LoRA 中，正是利用 SVD 将大权重矩阵分解为两个低秩矩阵的乘积来实现参数高效微调。
