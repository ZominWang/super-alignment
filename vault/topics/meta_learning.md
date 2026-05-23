---
id: meta_learning
name: 元学习
name_en: Meta Learning - Learning to Learn
type: topic
level: 3
area: foundations
direction: ml
prerequisites:
  - supervised_learning
  - unsupervised_learning
  - neural_network_basics
difficulty: 4
importance: 2
status: unknown
tags:
  - meta-learning
  - few-shot
  - maml
  - learning-to-learn
  - optimization
---

元学习的核心目标是"学会如何学习"（Learning to Learn），通过在多个相关任务上训练一个元学习器，使其能够仅凭极少量样本快速适应全新任务。MAML（Model-Agnostic Meta-Learning）是该领域最具影响力的方法，通过二阶梯度优化学习"易微调"的模型初始化参数；Reptile 作为其一阶近似变体，在保持性能的同时大幅降低计算开销。原型网络（Prototypical Networks）和匹配网络（Matching Networks）则从度量学习的角度，分别为少样本分类提供了基于类别原型和注意力加权的解决方案。LLM 的 In-Context Learning 可被视为一种不更新权重的隐式元学习，这也是大模型在零样本和少样本场景下表现出惊人适应能力的深层原因。

# 元学习 (Meta Learning)

## 核心概念：学会如何学习

元学习的核心目标是“学会如何学习”（Learning to Learn）。传统机器学习针对单一任务优化模型参数，而元学习在多个相关任务上训练一个“元学习器”（meta-learner），使其能够快速适应新任务——即使新任务只有极少样本。

形式化定义：元学习包含两层学习过程——内层（inner loop）是任务特定的快速适应，外层（outer loop）是跨任务的元知识积累。设任务分布为 $p(\mathcal{T})$，每个任务 $\mathcal{T}_i$ 有少量支持集（support set）和查询集（query set）。元学习器在训练阶段学习跨任务的通用知识，在测试阶段能仅通过少量支持样本在新任务上取得好表现。这与人类“学会方法比记住答案更重要”的学习理念高度一致。

## MAML（Model-Agnostic Meta-Learning）

MAML 是元学习中最具影响力的方法，其核心思想简洁而深刻：找到一组模型参数 $\theta$，使得在此参数基础上，仅需少量梯度步更新就能在任意新任务上达到良好性能。

MAML 的训练过程：
1. 采样一批任务 $\{\mathcal{T}_i\}$
2. 对每个任务，从 $\theta$ 出发，用支持集执行一步或多步梯度下降，得到任务特定参数 $\theta_i'$
3. 用查询集计算 $\theta_i'$ 上的损失，聚合所有任务的损失
4. 对原始参数 $\theta$ 进行元梯度更新：$\theta \leftarrow \theta - \beta \nabla_\theta \sum_i \mathcal{L}_{\mathcal{T}_i}(\theta_i')$

关键特性是 MAML 需要计算梯度的梯度（二阶导数），即 $\nabla_\theta \theta_i'$ 涉及 Hessian 向量积。这使得 MAML 计算开销较大，但也正是这种二阶优化赋予了模型学习“如何被微调”的能力。

### Reptile：一阶近似简化

Reptile 是 MAML 的一阶近似变体，由 OpenAI 提出。其更新规则极为简单：对每个任务从 $\theta$ 出发做多步 SGD 得到 $\theta_i'$，然后让 $\theta$ 向所有 $\theta_i'$ 的均值方向移动。由于不需要计算二阶梯度，Reptile 计算效率远高于 MAML，在实践中常有不逊于 MAML 的表现。

## Prototypical Networks（原型网络）

原型网络从度量学习的角度解决少样本分类问题。核心思想是学习一个嵌入函数，将样本映射到嵌入空间，使得每个类别可以用其支持样本的嵌入均值（原型，prototype）表示。对新样本的分类通过计算其嵌入与各原型的距离（通常用欧氏距离）完成，最近的原型决定类别。

$$p_\phi(y = k | x) = \frac{\exp(-d(f_\phi(x), c_k))}{\sum_{k'} \exp(-d(f_\phi(x), c_{k'}))}$$

其中 $c_k = \frac{1}{|S_k|}\sum_{x_i \in S_k} f_\phi(x_i)$ 为类别 $k$ 的原型向量。原型网络训练简单、无需复杂的元梯度，在少样本分类中表现优异。

## Matching Networks（匹配网络）

匹配网络结合了注意力机制和外部记忆的思想。其关键创新是定义了一个基于注意力的分类器：对于查询样本 $\hat{x}$，其预测标签由支持集中所有样本标签的加权和决定，权重由查询样本与每个支持样本的相似度（通过注意力机制计算）决定。形式上：

$$\hat{y} = \sum_{i=1}^k a(\hat{x}, x_i) y_i$$

其中 $a(\hat{x}, x_i) = \frac{\exp(\cos(f(\hat{x}), g(x_i)))}{\sum_j \exp(\cos(f(\hat{x}), g(x_j)))}$。匹配网络还引入了 Full Context Embeddings（FCE），使样本嵌入能感知支持集中其他样本的上下文。

## 元学习与 In-Context Learning 的内在联系

LLM 的 In-Context Learning（上下文学习）可被理解为一种隐式形式的元学习。模型在预训练阶段接触海量多样化数据，实际上在隐式地学习跨任务的模式。当前向传播处理提示中的示例时，Transformer 的注意力机制在内部完成了类似于元学习快速适应的计算——有研究表明，线性注意力层的行为可以用梯度下降来解释。因此 ICL 可以被视为在推理时完成的“不更新权重的元学习”，这也是大模型为何能在零样本/少样本场景下表现出惊人适应能力的深层原因。

## 应用场景

- **少样本图像分类**：如手写字符识别、稀有物种识别
- **强化学习的快速适应**：让智能体在新环境中仅通过少量交互即可学会策略
- **个性化推荐**：根据用户极少行为快速建立推荐模型
- **药物发现**：在已知分子数据上学习，快速适应新靶点的活性预测

## Quiz

**Q1: MAML 的核心目标是什么？**

A. 找到使模型在单一任务上表现最优的参数
B. 为每个新任务完全重新训练一个模型
C. 找到一组初始化参数，使模型在新任务上仅需少量梯度更新即可适应 ✓
D. 通过增加模型参数量来提升少样本学习能力

**解析**：C 正确。MAML 的核心思想是学习一个“易微调”的模型初始化 $\theta$，从此初始化出发，仅需少量梯度步即可适应新任务。A 是传统机器学习的目标；B 是独立训练的极端情形；D 描述的是增大模型规模的方法，与 MAML 的元学习思路不同。

**Q2: 以下关于 MAML 和 Reptile 区别的描述，正确的是？**

A. Reptile 使用二阶梯度，MAML 使用一阶近似
B. Reptile 是 MAML 的二阶近似，计算开销更大
C. Reptile 是 MAML 的一阶近似，不需求解 Hessian 向量积，计算效率更高 ✓
D. 两者没有任何关系，分别解决不同问题

**解析**：C 正确。MAML 需要计算二阶导数（Hessian 向量积），其计算图涉及梯度的梯度。Reptile 是 MAML 的一阶近似，通过在每个任务上执行多步 SGD 后让元参数向各任务最终参数均值方向移动，避免了二阶计算，大幅提升了效率。

**Q3: Prototypical Networks 与 Matching Networks 的核心区别是什么？**

A. Prototypical Networks 使用注意力机制，Matching Networks 使用原型向量
B. Prototypical Networks 用类别原型向量进行距离分类，Matching Networks 用注意力加权的支持样本标签进行分类 ✓
C. Prototypical Networks 需要元梯度，Matching Networks 不需要
D. 两者完全相同，只是名称不同

**解析**：B 正确。Prototypical Networks 将每个类别表示为支持样本嵌入的均值（原型），通过最近邻距离分类；Matching Networks 用注意力机制计算查询与每个支持样本的相似度，以加权和形式预测标签。A 将两者混淆；C 错误，两者都通过标准监督学习训练；D 错误，两者有本质区别。

## 参考资料

### 论文
- **[Model-Agnostic Meta-Learning for Fast Adaptation of Deep Networks]** (Finn et al., 2017) — 提出 MAML，学习一组"易微调"的模型初始化参数，仅需少量梯度步即可适应新任务。https://arxiv.org/abs/1703.03400
- **[Prototypical Networks for Few-shot Learning]** (Snell et al., 2017) — 从度量学习角度解决少样本分类，通过计算样本嵌入与类别原型的距离进行分类。https://arxiv.org/abs/1703.05175
