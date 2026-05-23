---
id: "adversarial_attacks_llm"
name: "对抗攻击与防御"
name_en: "Adversarial Attacks and Defense for LLMs"
type: "topic"
level: 3
area: "safety"
direction: "ai_security"
prerequisites: ["prompt_injection", "ai_safety_basics"]
difficulty: 4
importance: 3
status: "unknown"
tags: ["adversarial-attacks", "jailbreak", "safety", "defense", "robustness"]
---

对抗攻击针对已对齐的 LLM，通过精心构造的输入使其绕过安全护栏产生有害内容。最经典的攻击是 GCG（Greedy Coordinate Gradient，Zou et al. 2023），它通过优化一段对抗后缀字符串（通常约 20 个 token），使模型对任何恶意问题的回答以"Sure, here's how to..."开头，且该后缀可跨模型迁移。AutoDAN 利用遗传算法和困惑度约束，自动进化出"自然语言风格"的越狱提示，可以绕过基于困惑度的检测。CipherChat 揭示了即使使用 Base64 或莫尔斯码等编码方法对恶意指令进行加密，已对齐模型仍然会"解密后执行"，因为模型在训练中内化了这些编码的解码能力。多模态越狱利用视觉编码器的安全短板——将恶意文字指令嵌入图像中，模型可能在多模态融合过程中遗忘安全约束。防御方面：SmoothLLM 对输入 prompt 进行随机字符级扰动（随机替换/删除少量字符），生成多个副本后聚合回答，利用对抗后缀对微小扰动敏感的特性打破攻击。困惑度过滤器通过检测输入中异常高的 perplexity（对抗后缀通常是无意义的 token 序列）进行拦截。更根本的防御是对抗训练——在安全训练集中混入 GCG 对抗样本，让模型学会拒绝被"注入"后的恶意请求。

## Quiz

### Q1
**问题**: GCG（Greedy Coordinate Gradient）攻击的核心工作方式是什么？

- A. 用另一个 LLM 自动改写恶意问题，使其听起来像是正常问题
- B. 通过梯度优化搜索一个对抗后缀（通常为乱码 token 序列），将其拼接在恶意问题后，使得模型的条件分布被"操控"为以肯定性回答开头（如"Sure, here's how to..."），从而越过安全护栏  ✓
- C. 反复重试相同问题以利用采样的随机性蒙混过关
- D. 用 prompt injection 覆盖系统提示词中的安全约束

**解析**: GCG 的关键数学对象是一个小型的对抗后缀 adv（通常只占 ~20 token），它被拼接在恶意问题 q 之后形成输入 [q; adv]。攻击目标为最大化模型输出肯定回答 t 的概率 p(t|[q; adv])。在每个优化步骤中，GCG 评估所有可能 token 替换的梯度方向，选择让目标概率提升最大的 top-k 个候选 token 并用前向验证做最终选择。这种方法产出的对抗后缀具有很强的通用性——对"如何制造炸弹"优化的后缀，往往在"如何窃取信用卡"上也有效（跨问题可迁移），甚至在模型间也能迁移。

### Q2
**问题**: 为什么 CipherChat 这类基于编码的越狱攻击对已对齐模型有效？

- A. 加密过程改变了模型的安全性评估分数
- B. LLM 在预训练时学习了各种编码（Base64、莫尔斯码、ASCII 码）的解码能力，安全对齐训练中未覆盖"解码后执行攻击"的场景——模型先解码再回答，跳过了原始文字级别的安全过滤器  ✓
- C. 加密后的 token 序列长度更短，绕过了安全检测的 token 数阈值
- D. 编码使得模型误以为在回答编程问题而非回答恶意问题

**解析**: 对齐训练的数据分布以自然语言为主，安全拒绝行为也是针对自然语言问题训练的。但 LLM 从代码、论坛、维基百科等来源学会了 Base64 等编码的解码，这个能力在安全对齐时没有被"撤销"。当攻击者将恶意问题编码为 Base64 字符串后，模型先"解码"出原始问题、再作答——整个过程绕过了对"原始恶意文字输入"的检测。防御方向之一是将编码后的攻击样本纳入安全训练数据。

### Q3
**问题**: SmoothLLM 防御对抗后缀攻击的原理是什么？

- A. 在推理时对 prompt 进行多次随机单词级别的语义替换，用投票机制拒绝异常回答
- B. 对输入 prompt 施加多次独立随机字符扰动（如随机替换、删除、插入 1-2 个字符），由于对抗后缀对微小扰动极其敏感（扰动后攻击效果骤降），聚合扰动输入的多个回答即可恢复安全行为  ✓
- C. 使用一个独立的检测模型来判断输入是否包含对抗后缀
- D. 通过降低生成温度的采样方式，使模型拒绝回答的概率增加

**解析**: GCG 的对抗后缀是通过精确的梯度搜索找出的"最优扰动"，像一个在高维离散空间中的"针尖"——一旦某个 token 被轻微扰动（替换或删除），攻击效果崩溃。SmoothLLM 利用这一脆弱性：生成 N 个随机扰动的 prompt 副本（如 N=10），对每个副本独立获取回答，若多数回答是拒绝（安全），则返回拒绝。由于正常用户的问题对扰动不敏感（"请帮我写首诗"扰动后仍然是正常请求），SmoothLLM 在不显著影响用户体验的前提下，以统计方式挫败对抗后缀。

## 参考资料

### 论文
- **[Universal and Transferable Adversarial Attacks on Aligned Language Models]** (Zou et al., 2023) — 提出 GCG 攻击，通过梯度优化搜索对抗后缀字符串，使对齐模型绕过安全护栏。https://arxiv.org/abs/2307.15043
- **[AutoDAN: Generating Stealthy Jailbreak Prompts on Aligned Large Language Models]** (Liu et al., 2024) — 利用遗传算法和困惑度约束自动生成自然语言风格的越狱提示。https://arxiv.org/abs/2310.04451
- **[SmoothLLM: Defending Large Language Models Against Jailbreaking Attacks]** (Robey et al., 2023) — 通过对输入 prompt 施加随机字符扰动来防御对抗后缀攻击，利用对抗后缀对扰动敏感的特性。https://arxiv.org/abs/2310.03684
