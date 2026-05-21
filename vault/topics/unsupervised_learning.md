---
id: "unsupervised_learning"
name: "无监督学习"
name_en: "Unsupervised Learning"
type: "topic"
level: 3
area: "foundations"
direction: "ml"
prerequisites: ["supervised_learning"]
difficulty: 3
importance: 4
status: "unknown"
tags: ["ml", "unsupervised", "clustering", "dimensionality-reduction"]
---

无监督学习从无标签数据中发现内在结构，包括聚类（K-means、DBSCAN）、降维（PCA、t-SNE、UMAP）和生成模型（VAE、GAN）。这些技术在 LLM 的预训练阶段和嵌入可视化中有直接应用。

## Quiz

### Q1
**问题**: K-means 聚类算法收敛到全局最优的保证条件是什么？

- A. 数据呈球形分布时总能找到全局最优
- B. K-means 不保证收敛到全局最优，只保证收敛到局部最优  ✓
- C. 当 k 等于真实簇数时保证全局最优
- D. 运行足够多轮次后一定达到全局最优

**解析**: K-means 是一个迭代算法（EM 的特例），每次更新质心都降低目标函数，但只保证局部收敛。目标函数是非凸的，不同初始化可能导致不同结果。实践中常用 K-means++ 初始化策略来改善结果。

### Q2
**问题**: PCA（主成分分析）和 t-SNE 的主要应用场景区别是？

- A. PCA 用于聚类，t-SNE 用于分类
- B. PCA 适合保持全局结构的线性降维，t-SNE 适合可视化局部邻域关系  ✓
- C. PCA 无损压缩，t-SNE 有损压缩
- D. PCA 只适用于连续变量，t-SNE 只适用于离散变量

**解析**: PCA 找到方差最大的线性方向，保留全局结构，可用于预处理和压缩。t-SNE 通过最小化高低维空间中点对概率分布的 KL 散度，重点保留局部邻域结构，适合可视化高维嵌入（如词向量）。

### Q3
**问题**: VAE（变分自编码器）相比普通自编码器的核心改进是？

- A. VAE 使用更深的网络，表示能力更强
- B. VAE 编码为连续潜变量分布而非固定向量，支持从潜空间采样生成新数据  ✓
- C. VAE 的解码器比普通自编码器更精确
- D. VAE 不需要训练解码器

**解析**: 普通自编码器将输入编码为固定的潜向量，无法生成。VAE 编码为高斯分布参数（均值μ和方差σ），通过重参数化技巧采样并解码，使潜空间连续可插值。损失 = 重建损失 + KL 散度正则项。
