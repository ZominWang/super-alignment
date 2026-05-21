---
id: "pretrained_lm"
name: "预训练语言模型"
name_en: "Pretrained Language Models"
type: "topic"
level: 3
area: "llm"
direction: "llm_arch"
prerequisites: ["transformer_arch"]
difficulty: 3
importance: 5
status: "unknown"
tags: ["llm", "pretraining", "bert", "gpt", "language-model"]
---

预训练语言模型（PLM）在大规模文本上自监督预训练，学习通用语言表示，再微调适配下游任务。BERT（掩码语言模型）、GPT（因果语言模型）、T5（文本到文本）代表了三种主流预训练范式，深刻改变了 NLP 领域。

## Quiz

### Q1
**问题**: BERT 的预训练目标"Masked Language Modeling（MLM）"和"Next Sentence Prediction（NSP）"分别学习什么？

- A. MLM 学习词序，NSP 学习词义
- B. MLM 学习词在上下文中的语义表示，NSP 学习句子间的篇章关系  ✓
- C. MLM 和 NSP 都是为了学习句子级表示
- D. MLM 是有监督的，NSP 是无监督的

**解析**: MLM 随机遮盖 15% 的词，让模型根据双向上下文预测被遮盖的词，学习词汇的语境表示。NSP 判断两个句子是否连续出现，学习句间关系（后来研究发现 NSP 作用有限，RoBERTa 移除了 NSP 却性能更好）。

### Q2
**问题**: "迁移学习"在预训练语言模型中的本质是什么？

- A. 将图像模型的权重迁移到文本模型
- B. 在大规模通用语料上学习的表示（权重），迁移到数据较少的特定任务，避免从头训练  ✓
- C. 将一种语言的模型迁移到另一种语言
- D. 将小模型的知识迁移到大模型

**解析**: 预训练阶段在海量文本（Common Crawl、Wikipedia等）上学习通用语言知识，权重作为初始点。微调阶段在小规模任务数据上调整，利用预训练获得的语言理解能力。这是"预训练-微调"范式的核心，将 NLP 研究从特征工程推向端到端深度学习。

### Q3
**问题**: GPT 系列的因果语言模型预训练目标是什么，为什么这个目标天然适合文本生成？

- A. 预测整个句子是否语法正确，生成时选择语法正确的输出
- B. 预测序列中每个位置的下一个词（Next Token Prediction），生成时自回归地逐词采样  ✓
- C. 将文章压缩为摘要，生成时展开摘要
- D. 区分真实文本和生成文本，生成时欺骗判别器

**解析**: GPT 的预训练目标是 P(x_t | x_1,...,x_{t-1})，即用前 t-1 个词预测第 t 个词，与生成时的解码过程完全一致（自回归生成）。这使得 GPT 在预训练完成后无需额外微调即可进行文本生成，是 ChatGPT 等对话系统的基础。
