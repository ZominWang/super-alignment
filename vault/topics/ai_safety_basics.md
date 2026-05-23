---
id: "ai_safety_basics"
name: "AI安全基础"
name_en: "AI Safety Basics"
type: "topic"
level: 3
area: "safety"
direction: "ai_security"
prerequisites: ["rlhf"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["safety", "ai-safety", "misuse", "harm", "guardrails"]
---

AI 安全关注防止 AI 系统被滥用或产生有害输出，包括内容安全（暴力/仇恨/违法内容）、隐私安全（个人信息泄露）和系统安全（提示注入/越狱）。护栏（Guardrails）是在 LLM 输入/输出端添加安全检查的工程实践，NeMo Guardrails 和 Llama Guard 是代表性工具。

## Quiz

### Q1
**问题**: "护栏（Guardrails）"在 LLM 应用中通常部署在哪些位置？

- A. 只在输出端检查最终响应
- B. 输入端（过滤有害输入）+ 输出端（检查响应是否安全）+ 应用逻辑层（限制功能范围）  ✓
- C. 只在训练时通过 RLHF 对齐
- D. 护栏只能用于开放域聊天机器人，不适用于专业应用

**解析**: 多层护栏：(1) 输入护栏：检测并拦截包含有害意图的请求（正则+分类模型+LLM Judge）；(2) 主 LLM 通过 RLHF 对齐，倾向于拒绝有害请求；(3) 输出护栏：检查响应是否包含有害内容，过滤或改写；(4) 应用层限制：函数调用只暴露必要权限，最小权限原则。

### Q2
**问题**: LLM 输出的"拒绝假阳性（False Positive Refusals）"问题是什么，为什么难以避免？

- A. 模型错误地接受了有害请求
- B. 模型错误地拒绝了合理无害的请求，过度安全导致用户体验差  ✓
- C. 模型生成了虚假信息而非直接拒绝
- D. 模型拒绝所有数学计算请求

**解析**: 过度对齐（Over-refusal）：用户问"如何制造炸药"可能是化学研究者，被拒绝；问"我需要一把枪"可能是在寻求武器安全知识，被拒绝。安全性和有用性之间存在本质张力：更严格的安全过滤 = 更多合理请求被误拒。这也是为什么内容政策需要精细设计，不能一刀切。

### Q3
**问题**: Llama Guard 等内容安全分类器相比规则过滤（关键词黑名单）的优势是什么？

- A. 规则过滤速度更慢
- B. 分类器理解语义和上下文，能识别用词无害但意图有害的请求，以及无害词汇的有害组合  ✓
- C. 分类器不需要训练数据
- D. 两者检测能力相同，只是实现方式不同

**解析**: 关键词黑名单：检测到"炸药"就拒绝，简单但误报率高、易绕过（用同义词或错别字）。Llama Guard 是专门训练的安全分类器，输入完整对话（含上下文），输出是否违反安全策略及类别（暴力/性内容/有害建议等）。理解"炸药"在烟火表演还是武器制造上下文中的不同含义。

## 参考资料

### 论文
- **[Concrete Problems in AI Safety](https://arxiv.org/abs/1606.06565)** (Amodei et al., 2016) — 系统定义了 AI 安全的五类核心问题（避免负面副作用、避免奖励破解、可扩展监督等），是 AI 安全领域奠基性论文。https://arxiv.org/abs/1606.06565
- **[Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations](https://arxiv.org/abs/2312.06674)** (Meta AI, 2023) — 介绍 Llama Guard 内容安全分类器的设计与评测，展示了基于 LLM 的护栏相比规则过滤的优势。https://arxiv.org/abs/2312.06674

### 博文/教程
- **[Anthropic's Responsible Scaling Policy](https://www.anthropic.com/responsible-scaling-policy)** — Anthropic 官方博客。描述了 Anthropic 在模型规模提升时的安全评估和护栏部署策略，是理解工业界 AI 安全实践的重要参考。
