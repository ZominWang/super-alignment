---
id: "information_theory"
name: "信息论基础"
name_en: "Information Theory"
type: "topic"
level: 3
area: "foundations"
direction: "math"
prerequisites: ["probability_statistics"]
difficulty: 3
importance: 2
status: "unknown"
tags: ["math", "information-theory", "entropy", "KL-divergence"]
---

信息论为量化信息和不确定性提供了数学框架。熵度量概率分布的不确定性，KL 散度衡量两个分布的差异，交叉熵损失是分类任务的标准损失函数，互信息是特征选择的理论基础。

## Quiz

### Q1
**问题**: 交叉熵损失 H(p, q) = -Σ p(x) log q(x) 中，p 和 q 分别代表什么？

- A. p 是模型预测分布，q 是真实标签分布
- B. p 是真实标签分布，q 是模型预测分布  ✓
- C. p 和 q 都是模型不同层的输出分布
- D. p 是先验分布，q 是后验分布

**解析**: 交叉熵衡量用分布 q（模型预测）来编码来自分布 p（真实标签）的信息所需的平均比特数。当 q 完美拟合 p 时，交叉熵等于 p 的熵，达到最小值。

### Q2
**问题**: KL 散度 D_KL(P||Q) 的哪个性质使其不能作为真正的距离度量？

- A. KL 散度可能为负数
- B. KL 散度不满足对称性：D_KL(P||Q) ≠ D_KL(Q||P)  ✓
- C. KL 散度无法在连续分布上定义
- D. KL 散度不满足三角不等式

**解析**: KL 散度衡量用分布 Q 近似分布 P 时的信息损失，是非对称的。D_KL(P||Q) 表示 P 对 Q 的相对熵。在 VAE 中，损失函数包含 D_KL(q(z|x)||p(z))，用于约束潜变量接近先验分布。

### Q3
**问题**: 一个均匀分布在 n 个类别上的离散变量，其信息熵 H 是多少？

- A. H = 0
- B. H = 1
- C. H = log₂(n)  ✓
- D. H = n

**解析**: 均匀分布 P(x=i) = 1/n，熵 H = -Σ(1/n)·log₂(1/n) = log₂(n)。均匀分布具有最大熵，表示最大不确定性。这是最大熵原理的基础：在没有约束的情况下，均匀分布是最"公正"的分布。

## 参考资料

### 论文
- **[A Mathematical Theory of Communication]** (Claude E. Shannon, 1948) — 信息论的奠基之作，定义了信息熵、信道容量等核心概念，是现代通信与机器学习信息度量的理论根基。https://archive.org/details/bstj27-3-379

### 博文/教程
- **[Elements of Information Theory（第2版）]** — Thomas M. Cover & Joy A. Thomas，Wiley 出版社。信息论领域最权威的教材，系统涵盖熵、KL 散度、互信息、信道编码等全部核心概念。
- **[Visual Information Theory]** — Christopher Olah（colah's blog）。用直观可视化方式解释熵、KL 散度、交叉熵的含义，是理解信息论在机器学习中应用的最佳博文之一。http://colah.github.io/posts/2015-09-Visual-Information/
