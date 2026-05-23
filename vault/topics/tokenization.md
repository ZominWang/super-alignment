---
id: "tokenization"
name: "分词与Tokenization"
name_en: "Tokenization"
type: "topic"
level: 3
area: "llm"
direction: "llm_arch"
prerequisites: ["pretrained_lm"]
difficulty: 2
importance: 4
status: "unknown"
tags: ["llm", "tokenization", "bpe", "vocabulary", "subword"]
---

Tokenization 将原始文本转化为模型可处理的 token 序列。BPE（字节对编码）、WordPiece、SentencePiece 是主流子词分词算法，词表大小和分词策略直接影响模型的语言覆盖能力、上下文长度利用效率和对多语言的支持。

## Quiz

### Q1
**问题**: BPE（Byte Pair Encoding）分词算法的核心迭代步骤是什么？

- A. 按空格分割，再合并低频词
- B. 统计相邻字节对出现频率，反复合并最高频的字节对，直到达到目标词表大小  ✓
- C. 先用规则分词，再用神经网络修正
- D. 将所有词按字母表排序，选择最短的表示

**解析**: BPE 从字符级别开始，统计所有相邻字符对的频率，将最高频的字节对合并为一个新 token，重复直到词表达到目标大小（如 32K、50K）。常见词被保留为完整 token，罕见词被分解为子词或字符，平衡了词表大小与覆盖率。

### Q2
**问题**: 中文等字符系统在 BPE 分词时，相比英文面临的主要挑战是？

- A. 中文字符无法用 BPE 表示
- B. 中文没有自然空格分隔词汇，且相同的汉字在不同上下文中意义差异大  ✓
- C. 中文词表更小，所以更容易
- D. 中文的 BPE 运行速度更慢

**解析**: 英文可以先按空格分词再做 BPE。中文需要将整个字符序列作为输入，常用字只有约 3000 个但组合词义丰富，BPE 倾向于将常用字作为单个 token，上下文理解依赖更强。中文 LLM 通常需要更大词表或专门的中文分词预处理。

### Q3
**问题**: "token 消耗"对 LLM 使用成本的影响：同样的内容，下列哪个会消耗最少的 token？

- A. 带有大量空格格式化的 JSON
- B. 紧凑无多余空格的 JSON，相同语义内容  ✓
- C. 用中文描述相同内容（每个汉字约1个token）
- D. 用英文全写单词描述（无缩写）

**解析**: LLM API 按 token 计费。空格、换行、格式化字符都会消耗 token。同样语义内容，紧凑 JSON 比格式化 JSON 少用 30-50% 的 token。英文单词的 token 效率通常高于中文（英文一个词约 1-2 个 token，中文每字约 0.5-1 个 token）。了解分词是优化成本的基础。

## 参考资料

### 论文
- **[Neural Machine Translation of Rare Words with Subword Units]** (Rico Sennrich, Barry Haddow & Alexandra Birch, 2016) — 将 BPE（字节对编码）引入 NMT，解决罕见词问题，成为现代 LLM 分词的主流方案。https://arxiv.org/abs/1508.07909
- **[SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing]** (Taku Kudo & John Richardson, 2018) — 提出 SentencePiece，直接从原始文本（无需预分词）学习子词词表，被 LLaMA、T5 等主流模型采用。https://arxiv.org/abs/1808.06226

### 博文/教程
- **[Tokenization in NLP]** — Hugging Face Tokenizers 文档。详细介绍 BPE、WordPiece、Unigram 等分词算法的实现原理，并提供主流模型分词器的使用示例。https://huggingface.co/docs/tokenizers/
