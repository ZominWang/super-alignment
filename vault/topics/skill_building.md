---
id: "skill_building"
name: "可复用Skill构建"
name_en: "Reusable Skill Building"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["agent_basics", "tool_use"]
difficulty: 2
importance: 5
status: "unknown"
tags: ["skill", "agent", "automation", "reusability", "workflow", "prompt-engineering"]
---

Skill 是封装了特定任务逻辑的可复用 Agent 组件。一个 Skill 通常包括：触发条件、执行步骤、所需工具和期望输出。好的 Skill 可以被不同的 Agent 调用，组合成更复杂的工作流，是从"会用 AI"到"会设计 AI 系统"的关键跨越。

## Quiz

### Q1
**问题**: AI Agent 中"Skill"（技能）最准确的描述是什么？

- A. Skill 是指 AI 模型本身的参数能力，即训练获得的知识
- B. Skill 是封装了特定任务逻辑的可复用模块，包含触发条件、执行步骤和所需工具，可以被 Agent 调用来完成特定子任务  ✓
- C. Skill 只是提示词模板的另一种叫法
- D. Skill 必须由专业工程师编写，普通用户无法创建

**解析**: Skill 是 Agent 架构中的"能力单元"。类比：人类有"发邮件"这个技能，可以在不同场景下调用它。对 Agent 来说，Skill 可以是"搜索并总结最新信息"、"分析上传的 PDF"、"生成日程安排"等。关键特征：①有明确的输入和输出；②包含完成任务所需的工具和提示词；③可以独立执行，也可以被其他 Skill 或 Agent 调用。

### Q2
**问题**: 设计一个可复用 Skill 时，下面哪个做法最重要？

- A. 让 Skill 尽可能复杂，覆盖更多情况
- B. 定义清晰的输入输出格式、使用场景和边界条件，使 Skill 在不同上下文中行为一致可预期  ✓
- C. 每个 Skill 都必须使用最新、最大的模型
- D. 一个 Skill 应该能处理所有可能的用户请求

**解析**: 好的 Skill 设计遵循"单一职责"原则：一个 Skill 只做好一件事。清晰的接口定义（输入什么、输出什么）让 Skill 可以在不同场景组合使用。就像搭积木——清晰定义边界的积木才能搭出复杂结构。复杂和全能反而降低可复用性：太宽泛的 Skill 边界模糊，难以测试，也难以被其他 Agent 可靠调用。

### Q3
**问题**: 以下哪个场景最适合将任务封装成 Skill？

- A. 只需要做一次的一次性任务，例如今天帮我查一下天气
- B. 会重复出现、步骤相对固定、但每次输入不同的任务，例如每周生成一份竞品分析报告  ✓
- C. 需要大量人工判断和创意发挥、无法标准化的任务
- D. 系统级的一次性配置，例如安装软件依赖

**解析**: Skill 最适合"高频+可标准化"的任务。判断标准：①这件事你会反复做吗？②步骤相对固定吗？③输入格式可以明确定义吗？如果三个都是，封装成 Skill 会带来巨大复利。例子：市场调研 Skill（输入：竞品名，输出：结构化分析报告）、代码审查 Skill（输入：PR diff，输出：审查意见）、日程规划 Skill（输入：待办事项，输出：时间安排）。
