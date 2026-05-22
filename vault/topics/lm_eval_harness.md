---
id: "lm_eval_harness"
name: "lm-evaluation-harness标准评测框架"
name_en: "lm-evaluation-harness Evaluation Framework"
type: "topic"
level: 3
area: "engineering"
direction: "eval_quality"
prerequisites: ["benchmarks", "llm_evaluation"]
difficulty: 3
importance: 5
status: "unknown"
tags: ["evaluation", "lm-eval", "benchmark", "eleutherai", "mmlu", "gsm8k", "humaneval", "open-llm-leaderboard", "cli"]
---

lm-evaluation-harness（EleutherAI）是业界评测 LLM 的事实标准工具，支持 200+ benchmarks，是 HuggingFace Open LLM Leaderboard 的底层引擎。它将模型评测从"手写测试脚本"标准化为统一框架：一行命令即可在 MMLU、GSM8K、HumanEval、ARC 等权威 benchmark 上评测任意模型，并生成可复现的结果。

## Quiz

### Q1
**问题**: lm-evaluation-harness 相比手动编写评测脚本的核心优势是什么？

- A. 运行速度比手动脚本快 10 倍以上，节省评测时间
- B. 提供统一的评测接口和标准化实现，确保不同研究者在相同 benchmark 上的结果可直接比较，消除实现差异带来的"虚假分数"  ✓
- C. 能够评测闭源模型（如 GPT-4），而手动脚本无法做到
- D. 自动选择最适合当前模型的 benchmark，无需手动指定

**解析**: 评测的"可复现性危机"：若 A 用 5-shot、B 用 0-shot 评测同一 benchmark，分数无法比较。若 A 的 prompt 格式与原论文不同，分数可能虚高 5-10%。lm-eval 为每个 benchmark 维护标准实现（shot 数量、prompt 格式、评分方式），所有人使用相同代码，结果天然可比。HuggingFace Leaderboard 要求所有提交模型通过 lm-eval 运行，确保排行榜公平性。

### Q2
**问题**: 使用 lm-evaluation-harness 评测一个本地 HuggingFace 模型在 MMLU 上的 5-shot 表现，命令格式是什么？

- A. `python eval.py --model gpt2 --task mmlu --shots 5`
- B. `lm_eval --model hf --model_args pretrained=EleutherAI/gpt2 --tasks mmlu --num_fewshot 5`  ✓
- C. `huggingface-cli eval --model gpt2 --benchmark mmlu --fewshot 5`
- D. `python -m lm_eval.run --backend transformers --checkpoint gpt2 --eval mmlu`

**解析**: lm-eval 的标准 CLI 格式：`lm_eval --model <后端> --model_args <参数> --tasks <任务列表> --num_fewshot <shot数> --output_path <结果目录>`。--model 后端支持：hf（本地 HuggingFace 模型）、openai-chat-completions（OpenAI API）、vllm（vLLM 加速推理）等。--tasks 支持单个或逗号分隔的多个 benchmark，如 `--tasks mmlu,gsm8k,arc_easy`。

### Q3
**问题**: Open LLM Leaderboard 上同一模型的评分有时与论文自报的分数差异较大，最常见原因是什么？

- A. HuggingFace 使用了更严格的评判标准，故意给模型打低分
- B. 论文作者可能使用了不同的 prompt 格式、不同 shot 数量，或在评测集的子集上报告了选择性更好的结果  ✓
- C. lm-eval 只支持英文评测，非英文模型会有系统性偏差
- D. Leaderboard 评测在低精度（int8）下运行以节省资源，影响分数准确性

**解析**: 常见的"评测洗白"手段：(1) Few-shot 数量选择性报告（在每个 benchmark 上选 0-shot 或 5-shot 中更高的）；(2) 自定义 prompt 格式（在系统提示中嵌入提示）；(3) 在测试集子集上评测；(4) 对特定 benchmark 进行针对性训练数据混入（"Data Contamination"）。lm-eval 通过标准化这些变量来揭示真实能力。lighteval（HuggingFace）是另一个正在兴起的竞争框架，同样强调可复现性。
