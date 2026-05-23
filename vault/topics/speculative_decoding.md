---
id: "speculative_decoding"
name: "推测解码"
name_en: "Speculative Decoding"
type: "topic"
level: 3
area: "llm"
direction: "llm_inference"
prerequisites: ["transformer_arch", "kv_cache"]
difficulty: 4
importance: 4
status: "unknown"
tags: ["speculative-decoding", "inference-acceleration", "draft-model", "medusa", "eagle"]
---

推测解码（Speculative Decoding）是一种在不损失生成质量的前提下加速 LLM 自回归推理的技术，核心思想是"用一个快速的小模型（Draft Model）草拟 K 个候选 token，再让大模型（Target Model）并行验证并接受/拒绝"。具体流程：Draft Model 自回归生成 K 个 token 的草稿序列，Target Model 一次前向传播同时评估所有 K+1 个位置的条件概率分布，然后按顺序对每个草稿 token 进行"推测性验证"——以 min(1, p_target(token)/p_draft(token)) 概率接受，首个被拒绝的 token 上按修正分布重新采样，后续草稿全部丢弃。加速比取决于草稿接受率（draft 越准越快）和 K（一次前向验证的 token 数），理论上限为 K×加速因子。

后续工作在此基础上多方向扩展：Medusa 在 Target Model 头上附加多个"预测头"直接预测未来的 N 个 token，省去独立的 Draft Model；Eagle 在特征层面而非 token 层面进行推测，利用倒数第二层隐藏状态预测下一个特征，再通过分类头得到 token；Lookahead Decoding 利用 Jacobi 迭代的并行猜测让模型自己"往前看"；Tree Attention 同时验证多个草稿分支而非顺序验证。vLLM、TGI 等主流推理框架均已集成推测解码。关键论文：Leviathan et al. 2023 "Fast Inference from Transformers via Speculative Decoding", Chen et al. 2023 "Accelerating Large Language Model Decoding with Speculative Sampling", Cai et al. 2024 "Medusa"。

## Quiz

### Q1
**问题**: 推测解码中，如果 Draft Model 生成的某个 token 在 Target Model 下的条件概率为零，验证时会发生什么？

- A. 直接跳过不处理
- B. 该 token 会被拒绝，Target Model 在该位置重新按 p_target 采样，该 token 之后的所有草稿 token 全部丢弃，因为后续 token 的条件分布已经改变 ✓
- C. 仍然接受并继续
- D. Target Model 会修正 Draft Model 的权重

**解析**: 推测解码的接受条件为：以概率 min(1, p_t(x_i) / p_d(x_i)) 接受 token x_i。若 p_t(x_i)=0，接受概率为 0——token 必然被拒绝。拒绝后，Target Model 从修正分布 norm(max(0, p_t − p_d)) 重新采样；更重要的是，草稿序列中 x_{i+1}, x_{i+2}, ... 都是基于 x_i 被接受的条件生成的，x_i 被拒绝后这些 token 的条件依赖链断裂，必须全部丢弃。这说明了推测解码的关键约束：加速比严重依赖于 Draft Model 与 Target Model 的一致性。

### Q2
**问题**: Medusa 相比原始 Speculative Decoding 的核心创新是什么？

- A. 使用 GPT 作为草稿模型
- B. 在 Target Model 的最后一层之上直接附加多个线性"Medusa heads"，每个 head 预测未来第 k 个 token，省去独立 Draft Model 的额外显存和同步开销 ✓
- C. 使用知识蒸馏训练草稿模型
- D. 将草稿由 1 个 token 扩展到 5 个 token

**解析**: 原始推测解码需要一个额外的 Draft Model——带来双倍显存占用（两套 KV Cache）和逻辑复杂性。Medusa 的做法：在已有 Target Model 的最后一层后加 K 个并行的线性头（Medusa heads），每个 head 负责直接预测未来第 i 个位置的 token。这些 head 与主模型共享所有 Transformer 层，只需少量额外参数（一个线性层 + 残差连接），训练时冻结主模型只训练这些 head。推理时：单次前向计算出主干 token 分布 + K 个未来预测，合并为 tree 结构进行并行验证。典型加速 2-3 倍，无额外 Draft Model 负担。

### Q3
**问题**: 以下哪项因素不会直接影响推测解码的加速比？

- A. Draft Model 的单 token 接受率
- B. 每次推测的草稿长度 K
- C. 用户输入的 token 长度 ✓
- D. Draft Model 本身的推理速度

**解析**: 加速比 ≈ (平均接受 token 数 + 1) × t_target / (t_draft × K + t_target)，其中 t_target 是 Target Model 单次前向时间，t_draft 是 Draft Model 生成一个草稿 token 的平均时间。加速比受接受率、K 和 Draft 速度直接影响。Prewill 阶段（Prompt Processing）的 prompt 长度影响首次 token 生成时间（TTFT），但对后续 decode 阶段的推测解码加速比无直接影响，因为推测解码作用在每次 decode 步的 token 生成加速上，不涉及 prompt 的批量处理。

## 参考资料

### 论文
- **[Fast Inference from Transformers via Speculative Decoding]** (Leviathan, Kalman, Matias, 2023) — 推测解码开创性工作，提出 draft-verify 范式，严格证明输出分布不损失。https://arxiv.org/abs/2211.17192
- **[Accelerating Large Language Model Decoding with Speculative Sampling]** (Chen, Borgeaud, Irving, 2023) — DeepMind 独立提出的投机采样方法，与推测解码等效。https://arxiv.org/abs/2302.01318
- **[Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads]** (Cai, Li, Geng, 2024) — 在 Target Model 上附加多个预测头直接预测未来 token，省去独立 Draft Model。https://arxiv.org/abs/2401.10774
- **[EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty]** (Li, Wei, Zhang, 2024) — 在特征层面而非 token 层面进行推测，利用倒数第二层隐藏状态预测。https://arxiv.org/abs/2401.15077
- **[Lookahead Decoding: Breaking the Sequential Dependency of LLM Inference]** (Fu, Bailis, Stoica, Zhang, 2024) — 利用 Jacobi 迭代让模型自身并行猜测多个未来 token。https://arxiv.org/abs/2402.02036

### 博文/教程
- **[Speculative Decoding 详解]** — Hugging Face Blog。https://huggingface.co/blog/assisted-generation
- **[Speculative Decoding for LLM Inference]** — Jay Alammar。https://jalammar.github.io/illustrated-speculative-decoding/

### 开源项目
- **[vLLM]** — 高性能 LLM 推理引擎，内置推测解码支持。https://github.com/vllm-project/vllm
