---
id: "few_shot"
name: "Few-shot与In-context学习"
name_en: "Few-shot & In-context Learning"
type: "topic"
level: 3
area: "application"
direction: "prompt_eng"
prerequisites: ["basic_prompting"]
difficulty: 2
importance: 4
status: "unknown"
tags: ["prompting", "few-shot", "in-context-learning", "examples"]
---

In-context Learning（ICL）是 LLM 在不更新权重的情况下，仅通过上下文中的示例"学习"新任务的能力。Few-shot 示例的质量、数量、顺序和格式都会显著影响效果，这是一种轻量级的"软适应"，不需要任何训练。

## Quiz

### Q1
**问题**: In-context Learning（ICL）与传统 Few-shot 学习（如迁移学习）的根本区别是？

- A. ICL 使用更少的样本
- B. ICL 不更新模型权重，仅通过上下文提示引导模型行为；传统 Few-shot 需要在少量样本上微调参数  ✓
- C. ICL 只适用于分类任务
- D. ICL 需要专门的训练目标

**解析**: 传统 Few-shot 学习需要梯度更新，会修改模型参数。ICL 将示例放入提示词中，LLM 在推理时"读取"示例并推断任务模式，所有适应都发生在前向传播中，不修改权重。这意味着每次推理都要在提示中携带示例（增加 token 消耗），但灵活性极高。

### Q2
**问题**: Few-shot 示例的顺序对 LLM 性能有什么影响？

- A. 顺序完全不影响，LLM 会自动关注所有示例
- B. 示例顺序显著影响性能，LLM 对后期示例（接近问题的示例）更敏感，称为"近因偏差"  ✓
- C. 越早出现的示例影响越大
- D. 只有示例数量重要，顺序无关

**解析**: 研究发现 LLM 的 ICL 存在明显的位置偏差（Lost in the Middle）：靠近问题的示例影响更大，中间的示例可能被忽略。这意味着最典型或最相关的示例应放在最后（靠近问题），最弱的放在中间。动态示例选择（如检索最相似的示例）也是提升 ICL 效果的策略。

### Q3
**问题**: 什么情况下 Few-shot ICL 不如直接 SFT 微调有效？

- A. 当训练数据少于100条时
- B. 当任务需要记忆大量领域知识、有固定输入输出格式要求，或需要在每次推理时节省 token 成本  ✓
- C. 当模型参数量小于 7B 时
- D. Few-shot ICL 总是优于 SFT

**解析**: ICL 的局限：(1) 每次推理都需要在上下文中携带示例，token 成本高；(2) 上下文窗口限制了示例数量；(3) 对于需要深度领域专业知识的任务，示例无法覆盖所有情况。SFT 将知识"烧入"权重，推理时不需要示例，适合高频、格式固定的任务。
