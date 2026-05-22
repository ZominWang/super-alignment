---
id: "rnn_lstm"
name: "序列模型RNN与LSTM"
name_en: "Sequence Models: RNN & LSTM"
type: "topic"
level: 3
area: "foundations"
direction: "deep_learning"
prerequisites: ["neural_network_basics"]
difficulty: 3
importance: 2
status: "unknown"
tags: ["deep-learning", "rnn", "lstm", "sequence", "nlp"]
---

循环神经网络（RNN）通过隐状态在序列中传递信息，LSTM 用门控机制解决长期依赖问题。虽然 Transformer 已取代 RNN 成为 NLP 主流，但理解 RNN/LSTM 的设计哲学是理解注意力机制"为何出现"的必要背景。

## Quiz

### Q1
**问题**: LSTM 相比基本 RNN 的核心改进是什么？

- A. LSTM 使用双向处理序列
- B. LSTM 引入输入门、遗忘门和输出门，通过选择性地保留和遗忘信息来解决长期依赖  ✓
- C. LSTM 不需要训练权重
- D. LSTM 可以并行处理序列

**解析**: 基本 RNN 的隐状态通过矩阵乘法传递，长序列中梯度容易消失或爆炸。LSTM 引入细胞状态（cell state）作为信息高速公路，通过加法而非乘法更新，梯度可以"无障碍"地回传。遗忘门决定保留多少过去信息，输入门决定添加多少新信息。

### Q2
**问题**: 双向 RNN（Bi-directional RNN）在 NLP 中的主要应用场景是什么？

- A. 文本生成（语言模型）
- B. 需要同时利用上下文的任务，如命名实体识别、情感分类  ✓
- C. 机器翻译的解码阶段
- D. 实时流数据处理

**解析**: 双向 RNN 同时从左到右和从右到左处理序列，每个位置的表示包含完整上下文信息。适合需要全局上下文的判断任务（NER、情感分析）。语言模型的生成阶段不能使用双向（看不到未来词），但 BERT 通过 Masked Language Modeling 实现了双向预训练。

### Q3
**问题**: Seq2Seq 模型的"信息瓶颈"问题是什么，如何解决？

- A. Seq2Seq 处理长序列时内存不足，通过流式处理解决
- B. 编码器将整个输入序列压缩为固定大小向量，导致长序列信息丢失；注意力机制解决了这个问题  ✓
- C. Seq2Seq 不能处理变长输出，需要填充解决
- D. 解码器无法访问原始输入，需要复制机制解决

**解析**: 传统 Seq2Seq 要求编码器将整个句子压缩为单个向量（上下文向量），长句中早期词的信息严重衰减。Bahdanau 注意力机制让解码器在每一步动态关注编码器的所有隐状态，直接"对齐"相关词汇，显著提升翻译质量。这是 Transformer 注意力机制的直接前身。
