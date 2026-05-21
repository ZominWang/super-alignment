---
id: "transformer_arch"
name: "Transformer架构"
name_en: "Transformer Architecture"
type: "topic"
level: 3
area: "llm"
direction: "llm_arch"
prerequisites: ["attention_mechanism"]
difficulty: 3
importance: 5
status: "unknown"
tags: ["llm", "transformer", "encoder", "decoder", "architecture"]
---

Transformer 完全基于注意力机制，彻底取代了 RNN 结构。编码器-解码器架构（BERT/GPT 分别是纯编码器/解码器）、前馈网络、Layer Norm、残差连接构成了现代 LLM 的基础骨架。理解 Transformer 是理解所有现代 AI 系统的前提。

## Quiz

### Q1
**问题**: GPT 系列（Decoder-only）与 BERT（Encoder-only）在注意力掩码上的根本区别是？

- A. GPT 使用多头注意力，BERT 使用单头注意力
- B. GPT 使用因果掩码（每个位置只能看到之前的词），BERT 使用双向注意力（可看到全部词）  ✓
- C. BERT 没有注意力掩码
- D. GPT 使用更多注意力头

**解析**: 因果掩码（Causal Mask）将注意力矩阵的上三角设为 -∞（softmax 后为0），使每个 token 只能注意到它之前的 token，从而支持自回归生成。BERT 通过 Masked Language Modeling 训练，可以双向注意，但不适合生成任务。

### Q2
**问题**: Transformer 的前馈网络（FFN）层在每个 Transformer Block 中起什么作用？

- A. 替代残差连接
- B. 对注意力层输出进行非线性变换，增加模型容量，维度先扩大后缩小（通常 4×d_model）  ✓
- C. 计算位置编码
- D. 实现跨层的注意力

**解析**: FFN(x) = max(0, xW₁+b₁)W₂+b₂，先将 d_model 维扩展到 4×d_model，再压缩回 d_model。注意力层学习词间关系，FFN 层（有时称为"知识存储"）学习特征变换。研究表明 FFN 中存储了大量事实知识，这是 LLM 能记忆知识的重要机制。

### Q3
**问题**: Layer Normalization 相比 Batch Normalization 在 Transformer 中更受青睐的原因是？

- A. LayerNorm 计算更快
- B. LayerNorm 在序列维度上归一化，不依赖 batch 大小，适合变长序列和小 batch 训练  ✓
- C. LayerNorm 不需要可学习参数
- D. BatchNorm 在 GPU 上不受支持

**解析**: BatchNorm 对 batch 内同一特征位置归一化，要求批内统计量稳定（大 batch）且长度一致。Transformer 处理变长序列，batch 内长度不同，BatchNorm 统计不准。LayerNorm 对单个样本的所有特征归一化，不受 batch 影响，天然适合 NLP 任务。
