---
id: "bert_encoder_models"
name: "BERT与编码器模型"
name_en: "BERT and Encoder Models"
type: "topic"
level: 3
area: "llm"
direction: "llm_arch"
prerequisites: ["attention_mechanism", "transformer_arch", "pretrained_lm"]
difficulty: 3
importance: 4
status: "unknown"
tags: ["bert", "encoder", "mlm", "pretraining", "nlp"]
---

BERT（Bidirectional Encoder Representations from Transformers）是预训练语言模型史上的里程碑，通过深层双向 Transformer 编码器和 Masked Language Model（MLM）+ Next Sentence Prediction（NSP）的双任务预训练，在 11 项 NLP 任务上刷新了 SOTA。其输入表示为 Token Embedding + Segment Embedding + Position Embedding 三层叠加，[CLS] token 的最终隐状态用作分类任务的聚合表示。RoBERTa 通过移除 NSP、更大 batch、更长训练和动态掩码等手段显著提升性能；ALBERT 通过跨层参数共享和分解嵌入矩阵减小参数量；DeBERTa 引入解耦注意力机制（Disentangled Attention），分别建模内容和相对位置，结合增强掩码解码器进一步推进编码器范式的上限。编码器模型在分类、抽取、检索、句级理解等"理解型"任务上仍有优势，但自回归的解码器模型（GPT 系）由于其零样本/少样本泛化能力，已逐步主导 NLP 领域。关键论文：Devlin et al. 2019 "BERT", Liu et al. 2019 "RoBERTa", He et al. 2021 "DeBERTa"。

## Quiz

### Q1
**问题**: BERT 的 Masked Language Model（MLM）预训练中，15%的 token 被选中后并非全部替换为 [MASK]，而是 80% 替换为 [MASK]、10% 随机替换、10% 保持不变。这样设计的动机是什么？

- A. 节省 [MASK] token 的词汇表空间
- B. 防止预训练和微调阶段的不匹配（微调时没有 [MASK] token），同时迫使模型对所有位置都保持表征能力，而不只关注 [MASK] ✓
- C. 增加训练数据的多样性
- D. 让模型学会忽略某些 token

**解析**: 如果 100% 替换为 [MASK]，模型会学会"只看 [MASK] 位置"的捷径，且在微调下游任务时（输入中无 [MASK]）会出现分布偏移。10% 保持不变迫使模型对正常 token 也保持预测能力；10% 随机替换防止模型过度依赖"此处一定是正确 token"的假设。这种"带噪声的遮掩"策略是 BERT 训练稳定的重要技巧，实验表明纯 [MASK] 替换会导致微调性能下降。

### Q2
**问题**: RoBERTa 相比 BERT 最关键的性能提升来自哪个改进？

- A. 使用更大的词表
- B. 移除 NSP 任务，采用更大 batch size 和更长训练步数，并用动态掩码替代静态掩码 ✓
- C. 增加 Transformer 层数到 48 层
- D. 使用知识蒸馏压缩模型

**解析**: RoBERTa 的消融实验揭示：(1) NSP 任务对下游性能贡献有限甚至为负，移除后性能反而提升；(2) 更大的 batch size（8K）和更多训练数据/步数持续带来增益；(3) 动态掩码（每个 epoch 对同一样本不同位置掩码）vs 静态掩码（预处理固定掩码）使模型看到更丰富的掩码模式；(4) 更长的序列（FULL-SENTENCES）提升了长依赖建模。核心结论：BERT 被"欠训练"，充分训练后编码器模型还有很大提升空间。

### Q3
**问题**: DeBERTa 的"解耦注意力"（Disentangled Attention）机制的核心创新是什么？

- A. 完全移除自注意力，改用卷积
- B. 将注意力分为内容-内容、内容-位置两个独立矩阵，用相对位置偏置替代绝对位置嵌入，分别建模语义和位置关系 ✓
- C. 使用外部记忆增强注意力
- D. 将多头注意力合并为单头

**解析**: 标准自注意力：A = softmax(QK^T / √d_k)，位置信息通过加到嵌入中混合。DeBERTa 解耦为：A = softmax(Q_c K_c^T + Q_c K_r^T + Q_r K_c^T)，其中 Q_c/Q_r 是内容/位置 query，K_c/K_r 是内容/位置 key。内容-内容项学语义依赖，内容-位置项学"一个词在某个位置时应关注哪些相对位置"。相比绝对位置编码，解耦注意力更精确地建模了词间相对距离的影响。DeBERTa v3 进一步引入 RTD（Replaced Token Detection）预训练任务，在 SuperGLUE 上超越人类基准。

## 参考资料

### 论文
- **[BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding]** (Devlin, Chang, Lee, Toutanova, 2019) — 提出双向深层 Transformer 编码器 + MLM/NSP 双任务预训练，11 项 NLP 任务 SOTA。https://arxiv.org/abs/1810.04805
- **[RoBERTa: A Robustly Optimized BERT Pretraining Approach]** (Liu, Ott, Goyal, Du, 2019) — 系统分析 BERT 设计选择，移除 NSP、动态掩码、更大数据/训练，显著超越 BERT。https://arxiv.org/abs/1907.11692
- **[DeBERTa: Decoding-enhanced BERT with Disentangled Attention]** (He, Liu, Gao, Chen, 2021) — 解耦内容与位置注意力，结合增强掩码解码器（EMD），SuperGLUE 超越人类基线。https://arxiv.org/abs/2006.03654
- **[ALBERT: A Lite BERT for Self-supervised Learning of Language Representations]** (Lan, Chen, Goodman, 2020) — 跨层参数共享 + 嵌入矩阵分解，大幅减少参数量同时保持性能。https://arxiv.org/abs/1909.11942
- **[ELECTRA: Pre-training Text Encoders as Discriminators Rather Than Generators]** (Clark, Luong, Le, Manning, 2020) — 用判别式 RTD 替换生成式 MLM，同等计算量下性能更优。https://arxiv.org/abs/2003.10555

### 视频（B站/YouTube）
- **[BERT 论文精读]** — 李沐 / B站"跟李沐学AI"。https://www.bilibili.com/video/BV1PL411M7eQ/

### 博文/教程
- **[The Illustrated BERT]** — Jay Alammar。https://jalammar.github.io/illustrated-bert/
- **[BERT 101 教程]** — Hugging Face Course 第一章。https://huggingface.co/learn/nlp-course/chapter1/1

### 开源项目
- **[transformers]** — Hugging Face 官方库，提供 BERT/RoBERTa/DeBERTa 等预训练模型。https://github.com/huggingface/transformers
