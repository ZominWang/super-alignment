---
id: "kv_cache"
name: "KV Cache与推理优化"
name_en: "KV Cache & Inference Optimization"
type: "topic"
level: 3
area: "llm"
direction: "llm_inference"
prerequisites: ["transformer_arch"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["llm", "kv-cache", "inference", "vllm", "continuous-batching"]
---

KV Cache 是 Transformer 自回归推理的核心优化，通过缓存历史 token 的 Key/Value 矩阵避免重复计算，将推理从 O(n²) 降为 O(n)。vLLM 的 PagedAttention、Continuous Batching 是生产级 LLM 推理服务的关键技术。

## Quiz

### Q1
**问题**: KV Cache 在 Transformer 推理中缓存的是什么，为什么能加速推理？

- A. 缓存每层的激活值（所有矩阵），避免前向传播
- B. 缓存历史 token 的 Key 和 Value 矩阵，使新 token 只需计算自身的 Q 与历史 KV 的注意力  ✓
- C. 缓存每次生成的输出 token，实现复用
- D. 缓存注意力权重矩阵，加速 softmax 计算

**解析**: 自回归生成时，第 t 步只需计算第 t 个 token 的 Query，然后与之前所有 token 的 K/V（已缓存）做注意力。无 KV Cache 时每步需要重新计算全部历史，复杂度为 O(n²)；有 KV Cache 时每步计算量为 O(n)。代价是需要额外内存存储 KV Cache（对于长上下文可达数 GB）。

### Q2
**问题**: vLLM 的 PagedAttention 解决了什么 KV Cache 管理问题？

- A. 减少 KV Cache 计算量
- B. 类比操作系统虚拟内存的分页机制，避免 KV Cache 内存碎片，大幅提升 GPU 显存利用率  ✓
- C. 压缩 KV Cache 以减少内存
- D. 允许 KV Cache 在 CPU 和 GPU 之间交换

**解析**: 传统推理框架为每个请求预分配最大长度的 KV Cache 内存，导致大量碎片（类似固定分区内存管理）。PagedAttention 将 KV Cache 分为固定大小的页（block），按需分配，不同请求可以共享 KV Cache 页（如系统提示的前缀缓存），显存利用率从约 30% 提升到 90%+。

### Q3
**问题**: 批处理策略中，"连续批处理"（Continuous Batching）相比静态批处理（Static Batching）的优势是？

- A. 连续批处理减少了每个请求的延迟
- B. 请求完成后立即插入新请求，GPU 始终满负荷运行，显著提升吞吐量  ✓
- C. 连续批处理支持更大的批大小
- D. 连续批处理消除了 KV Cache 内存限制

**解析**: 静态批处理等待一批请求全部完成再处理下一批，短请求完成后 GPU 空闲等待长请求（气泡）。连续批处理（Iteration-level scheduling）在每个迭代步检查已完成的请求，立即将等待队列中的新请求加入 batch，GPU 利用率接近 100%，是生产部署的标准策略。
