---
id: "self_supervised_learning"
name: "自监督学习"
name_en: "Self-Supervised Learning"
type: "topic"
level: 3
area: "foundations"
direction: "ml"
prerequisites: ["supervised_learning", "unsupervised_learning"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["self-supervised", "contrastive-learning", "pretext-task", "simclr", "masked-modeling"]
---

自监督学习（SSL）通过设计预文本任务（Pretext Task）从数据自身结构中自动生成监督信号，无需人工标注即可学习高质量表示。其核心范式分为两大流派：对比学习（Contrastive Learning）通过拉近正样本对、推远负样本对来学习表示不变性，代表性工作包括 SimCLR（大 batch 端到端对比）、MoCo（动量队列维持大量负样本）、SimSiam（无负样本的孪生网络）；掩码建模（Masked Modeling）通过遮挡输入部分并预测被遮挡内容来学习，如 BERT 的 MLM 预测被掩 token、MAE 重建被掩图像 Patch。对比学习中温度参数 τ 控制正负样本区分度，正负样本构建策略（数据增强、动量更新、memory bank）是核心设计空间。SSL 的表示学习理论表明，对比损失本质上优化的是互信息下界（InfoNCE），学到的表示在下游分类任务上可匹敌甚至超越监督学习预训练。关键论文：Chen et al. 2020 "SimCLR", He et al. 2020 "Momentum Contrast", Grill et al. 2020 "Bootstrap Your Own Latent", He et al. 2022 "Masked Autoencoders"。

## Quiz

### Q1
**问题**: 对比学习中，为什么需要大量负样本（Negative Samples）？

- A. 大量负样本可以提升 batch normalization 的效果
- B. 对比损失的 InfoNCE 目标需要对噪声分布做准确的蒙特卡洛估计，负样本越多、分布近似越准，避免模型找到"崩坏解"（对所有输入都给相同表示） ✓
- C. 大量负样本可以减少显存占用
- D. 负样本数量决定模型参数量

**解析**: InfoNCE 损失 L = -log[exp(sim(q,k⁺)/τ) / Σ exp(sim(q,kᵢ)/τ)]，分母需要对所有假定的"噪声分布样本"求和。负样本太少时，模型可能找到平凡解：将所有表示映射到同一点，InfoNCE 分子分母同时增大但比例不变。足够多的负样本增加对比难度，迫使模型真正学习有区分性的特征。这也是 SimCLR 需要 4096+ batch size、MoCo 用 65536 长度动量队列的原因。

### Q2
**问题**: SimCLR 与 MoCo 在维护负样本方面的核心差异是什么？

- A. SimCLR 使用端到端大 batch 中的其他样本作为负样本，MoCo 使用动量更新的队列存储历史负样本 ✓
- B. SimCLR 不需要正样本，MoCo 需要
- C. SimCLR 使用生成模型，MoCo 使用判别模型
- D. 两者没有差异，只是命名不同

**解析**: 本质分歧在于"负样本规模与一致性的权衡"。SimCLR 端到端方式：batch 内其他样本当负样本，编码器实时更新，正负样本编码一致但受 GPU 显存限制负样本量（batch_size = 4096/8192）。MoCo 队列方式：维护一个大的负样本队列（默认 65536），用动量编码器（θ_k ← m·θ_k + (1-m)·θ_q）生成队列中的表征，虽牺牲了完全一致性（队列里有些旧编码）但换来了海量负样本。后续 MoCo v2 吸收 SimCLR 的 MLP 投影头和更强数据增强，证明了"大负样本库+动量更新"的综合优势。

### Q3
**问题**: BERT 的 Masked Language Model（MLM）属于哪种自监督学习范式？

- A. 对比学习
- B. 掩码建模——通过随机遮盖输入 token，训练模型从上下文预测被遮盖 token ✓
- C. 聚类学习
- D. 强化学习

**解析**: BERT 的 MLM 随机遮盖 15% 的输入 token（其中 80% 替换为 [MASK]、10% 替换为随机 token、10% 保持不变），让模型预测原始 token。这属于"生成式自监督"（Generative SSL），不同于对比学习（判别式 SSL）。掩码建模的优势在于：它迫使模型学习双向上下文依赖（而非如 GPT 的单向），在理解类任务上表现优异。MAE 将这一思想扩展到视觉领域，遮盖 75% 的图像 patch 进行重建，利用图像信息的空间冗余实现高效预训练。

## 参考资料

### 论文
- **[A Simple Framework for Contrastive Learning of Visual Representations]** (Chen, Kornblith, Norouzi, Hinton, 2020) — SimCLR，提出端到端对比学习框架，通过大数据增强和 MLP 投影头学习视觉表示。https://arxiv.org/abs/2002.05709
- **[Momentum Contrast for Unsupervised Visual Representation Learning]** (He, Fan, Wu, Xie, Girshick, 2020) — MoCo，提出动量编码器+动态队列维护大量负样本的对比学习方法。https://arxiv.org/abs/1911.05722
- **[Exploring Simple Siamese Representation Learning]** (Chen, He, 2021) — SimSiam，证明无负样本、无动量编码器的孪生网络即可有效对比学习，关键在于 stop-gradient。https://arxiv.org/abs/2011.10566
- **[BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding]** (Devlin, Chang, Lee, Toutanova, 2019) — 通过 MLM + NSP 自监督预训练双向 Transformer，改写 NLP 范式。https://arxiv.org/abs/1810.04805
- **[Masked Autoencoders Are Scalable Vision Learners]** (He, Chen, Xie, Li, Dollár, Girshick, 2022) — MAE，将掩码建模扩展到视觉，随机遮盖 75% 图像 patch 进行重建预训练。https://arxiv.org/abs/2111.06377

### 视频（B站/YouTube）
- **[自监督学习论文逐段精读：SimCLR/MoCo/BYOL]** — 李沐 / B站。https://www.bilibili.com/video/BV19S4y1M7hm/

### 博文/教程
- **[The Illustrated SimCLR]** — Amit Chaudhary。https://amitness.com/posts/simclr
- **[Self-Supervised Learning 综述]** — Lilian Weng / OpenAI。https://lilianweng.github.io/posts/2019-11-10-self-supervised/
