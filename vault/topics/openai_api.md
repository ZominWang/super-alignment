---
id: "openai_api"
name: "OpenAI API与接入"
name_en: "OpenAI API & Integration"
type: "topic"
level: 3
area: "engineering"
direction: "dev_frameworks"
prerequisites: ["basic_prompting"]
difficulty: 1
importance: 5
status: "unknown"
tags: ["engineering", "openai-api", "sdk", "streaming", "rate-limit"]
---

OpenAI API 是目前最广泛使用的 LLM 接入方式，提供 Chat Completions、Embeddings、Fine-tuning 等核心接口。理解 API 参数（temperature、top_p、max_tokens）、Token 计费、速率限制和最佳实践是构建 LLM 应用的基础工程技能。

## Quiz

### Q1
**问题**: `temperature` 和 `top_p` 参数都控制生成随机性，在实践中如何选择使用哪个？

- A. 两者效果完全相同，随意选一个
- B. OpenAI 建议不要同时修改两者；temperature 线性缩放 logits，top_p 做核采样，通常只调整其中一个  ✓
- C. temperature 用于创意任务，top_p 用于精确任务
- D. 先设置 temperature 再微调 top_p 是标准做法

**解析**: temperature 将 logits 除以 T，T>1 使分布更平坦（更随机），T<1 使分布更尖锐（更确定）。top_p（核采样）只从累积概率达到 p 的最小词集合中采样，过滤掉低概率词。同时调整两者会引入难以预测的交互效应，通常固定一个（如 top_p=1）只调另一个。

### Q2
**问题**: 使用 OpenAI Streaming API（`stream=True`）相比非流式请求的主要优势是什么？

- A. 流式请求可以获得更准确的回答
- B. 用户看到 token 逐步出现，感知延迟显著降低，即使总生成时间相同  ✓
- C. 流式请求消耗更少的 token
- D. 流式请求支持更长的上下文

**解析**: 非流式：等待模型生成完整响应（可能数秒），一次性返回。流式：模型生成每个 token 后立即发送（SSE/Server-Sent Events），用户看到"打字机效果"。对于生成 1000 token 的响应，首字节时间（TTFT）从 5s 降到约 0.5s，用户体验质的提升。

### Q3
**问题**: 处理 OpenAI API 速率限制（Rate Limit）的最佳实践包括哪些？

- A. 直接捕获错误并立即重试
- B. 使用指数退避重试（Exponential Backoff）、请求队列批处理，并预先申请更高 Tier 的速率限制  ✓
- C. 将请求分散到多个 API Key（违反使用条款）
- D. 速率限制是致命错误，应该让应用崩溃

**解析**: 速率限制分为 RPM（每分钟请求数）和 TPM（每分钟 token 数）。最佳实践：(1) 捕获 429 错误，使用指数退避（第1次等1s，第2次等2s，第3次等4s...加随机 jitter）；(2) 在客户端实现队列，控制并发请求数；(3) 批量请求时估算 token 数，避免超出 TPM 限制。
