---
id: "constitutional_ai"
name: "Constitutional AI"
name_en: "Constitutional AI"
type: "topic"
level: 3
area: "safety"
direction: "alignment"
prerequisites: ["value_alignment"]
difficulty: 3
importance: 2
status: "unknown"
tags: ["safety", "constitutional-ai", "anthropic", "cai", "rlaif"]
---

Constitutional AI（CAI）是 Anthropic 提出的对齐方法，通过一组明确的"宪法"原则指导 AI 自我批评和修正，并用 AI 生成的反馈替代人类标注（RLAIF）。CAI 在减少有害输出的同时，避免了过度依赖人工标注的成本和主观性问题。

## Quiz

### Q1
**问题**: Constitutional AI（CAI）的训练流程相比标准 RLHF 的主要区别是什么？

- A. CAI 完全不需要人类参与
- B. CAI 用"宪法"（原则列表）指导 AI 自我批评生成 SFT 数据，再用 AI 偏好反馈（RLAIF）替代人类标注  ✓
- C. CAI 不使用强化学习
- D. CAI 只适用于有害内容过滤，不用于一般对齐

**解析**: 标准 RLHF 需要大量人工标注偏好数据（昂贵、主观、难以扩展）。CAI 两阶段：(1) SL-CAI：模型根据宪法原则批评自己的有害回答并修正，生成(有害输出, 改进输出)对用于 SFT；(2) RL-CAI（RLAIF）：用另一个 AI 根据宪法判断哪个回答更好，生成偏好数据训练奖励模型，替代人类标注。

### Q2
**问题**: RLAIF（Reinforcement Learning from AI Feedback）相比 RLHF 的优势和局限是什么？

- A. RLAIF 速度更快，精度完全相同
- B. RLAIF 可扩展且成本低，但依赖 AI Judge 的价值观，若 Judge 本身有偏见则会放大  ✓
- C. RLAIF 只适用于英文任务
- D. RLAIF 不能用于对齐，只能用于能力提升

**解析**: RLAIF 用大型 LLM（如 GPT-4 或 Claude）评估小模型输出并生成偏好标注，成本是人工标注的 1%，且可以在任意规模上运行。风险：Judge 模型的偏见会被放大到学生模型（如果 Judge 偏好冗长回答，学生模型会学会输出冗长内容）。解决方案：多个 Judge 取均值、定期与人类评估比较验证。

### Q3
**问题**: Constitutional AI 的"宪法"通常包含哪类原则？

- A. 只包含禁止有害内容的规则（负面原则）
- B. 同时包含行为边界（避免有害）和积极价值（诚实、有帮助、关心长期影响），构成全面的价值框架  ✓
- C. 宪法只包含对话格式要求
- D. 宪法由用户自定义，无固定内容

**解析**: Anthropic 的宪法原则包括：诚实性（不欺骗）、无害性（不帮助危险活动）、人权尊重（不歧视）、保护儿童（不生成 CSAM）等，以及更积极的原则：关心用户长期幸福（而非仅满足即时需求）、考虑对第三方的影响。这些原则指导 AI 在边界情况下进行价值判断。
