---
id: "multimodal_rag"
name: "多模态RAG"
name_en: "Multimodal RAG"
type: "topic"
level: 3
area: "application"
direction: "rag"
prerequisites: ["rag_basics", "multimodal"]
difficulty: 4
importance: 2
status: "unknown"
tags: ["multimodal-rag", "vision", "clip", "multimodal-embedding", "document-parsing"]
---

多模态 RAG 将传统纯文本检索拓展至图像、表格、图表、视频等多模态数据，核心挑战在于跨模态语义对齐和混合模态的索引与检索。文档解析是其第一道关卡——PDF 文档中的图文混排需要先分离文本段落、嵌入图片、表格区域，使用布局检测模型（LayoutLM、DocTR）识别页面结构，表格需用专门的 Table Transformer 或 Camelot 提取为结构化数据。多模态嵌入模型是检索基础：CLIP（Contrastive Language-Image Pre-training）通过双编码器架构将图文映射到同一向量空间，使"一只猫"的文本向量与猫的图片向量相似度最高；SigLIP 用 sigmoid 损失替代 softmax 实现更好的 batch 规模扩展性。存储策略有两种路线：(1) 统一向量空间——所有模态用同一嵌入模型编码到同一空间，实现跨模态检索；(2) 分模态存储——文本/图片/表格分别建索引，查询时多路召回再融合，适合模态特性差异大的场景。ColPali 代表了纯视觉路线：用视觉语言模型（PaliGemma）直接"看"文档页面图像，生成多向量表示，不需要 OCR 和布局解析——端到端理解文档渲染形态。多模态 query 理解也远比纯文本复杂：用户问"这个架构图中蓝色的部分代表什么"，系统需要同时理解文本意图和图像指代。应用场景包括技术文档智能问答（理解代码+架构图+说明文字）、医疗影像报告检索（X 光片 + 诊断文本跨模态搜索）、电商产品搜索（商品图 + 描述 + 规格表）。

## Quiz

### Q1
**问题**: ColPali 与传统的"OCR + 文本嵌入"文档检索路线相比，最本质的区别是什么？

- A. ColPali 速度更快，不需要 GPU
- B. ColPali 用视觉语言模型直接处理文档页面图像，以像素级视觉特征进行检索——跳过了 OCR 文字提取和布局分析的环节，因此能理解文字渲染形式（字体、颜色、位置关系）所传达的信息 ✓
- C. ColPali 只能处理英文文档
- D. ColPali 的嵌入维度更小，节省存储空间

**解析**: 传统路线：PDF → OCR/PDF解析 → 提取纯文本 → 文本分块 → 文本嵌入 → 向量检索。问题在于 OCR 可能出错（模糊字体、手写文字），更关键的是丢失了视觉信息——斜体强调、章节标题的大字体、表格的网格线、图片与周围文字的空间关系，这些可能传达语义但 OCR 后全部丢失。ColPali 思路：把每个文档页面作为图像输入 PaliGemma-3B 视觉语言模型，输出一组 patch-level 向量，查询时用"考虑图像中出现'climate change'关键词的文档页面"这种指令做 Late Interaction 匹配（类似 ColBERT），结果是端到端的——不需要 OCR、不需要文本解析、不需要分块策略，视觉语言模型天然理解版面信息。代价是计算量大（每页都要过 VLM）。

### Q2
**问题**: 多模态 RAG 在答案生成阶段（Generation），如果检索到图文混合的上下文块，当前的通用做法是什么？

- A. 只保留文本块，丢弃图像块，因为 LLM 无法处理图像
- B. 将所有检索到的多模态块（文本+图像 base64 编码+表格 Markdown）拼接为多模态提示，送入支持视觉的 LLM（如 GPT-4V/Gemini Pro Vision）统一生成答案 ✓
- C. 分别用文本 LLM 和视觉模型独立生成答案后拼接
- D. 将图像和文本分别生成答案，由 Agent 决定选用哪一个

**解析**: 多模态 RAG 的检索结果是一个混合列表：[文本片段 A, 图片 B, 表格 C, 文本片段 D]，生成阶段需要支持视觉的多模态 LLM。以 GPT-4V 为例，构建的提示是 "请根据以下参考资料回答用户问题：[文本 A]" 后紧跟一张 base64 编码的图片，然后是 "[表格 C 的 Markdown 表示]"，最后是用户问题。MLLM 同时审阅文本和视觉信息生成综合答案。这也是为什么 VLM 的发展是多模态 RAG 可行性的关键推动力——没有能同时理解图文内容的生成模型，多模态检索只能做检索不能做生成。

### Q3
**问题**: 使用 CLIP 做多模态 RAG 检索时，"语义鸿沟"（Semantic Gap）问题体现在什么地方？

- A. CLIP 的文本编码器和图像编码器使用不同的架构，无法比较向量相似度
- B. CLIP 通过图文对（alt-text）训练，学到的是整体场景相似性——"一张桌子上有电脑和咖啡" vs 图片的整体语义；但无法精确检索"绿色的按钮在页面的右下角"这类细粒度空间关系查询 ✓
- C. CLIP 只能理解英文文本
- D. CLIP 的嵌入向量维度过高，存储成本过高

**解析**: CLIP 以 4 亿图文对训练，学到的是宏观语义对齐（图片整体内容和描述大致相符），但缺乏细粒度理解：(1) 空间关系——不知道"左边"和"右边"的区别，编码时会丢失位置信息；(2) 文字在图片中的 OCR 能力弱——文档截图中的文字可能被当作纹理而非语义信息处理；(3) 计数能力差——"包含三只猫的图片"可能和三只猫或五只猫都匹配。这就是为什么 ColPali 选择用更重的视觉语言模型做文档理解——文档检索本质上需要细粒度的文字识别和空间理解，而非整体场景匹配。

## 参考资料

### 论文
- **[ColPali: Efficient Document Retrieval with Vision Language Models]** (Faysse et al., 2024) — 提出用 PaliGemma 视觉语言模型直接处理文档页面图像，以 Late Interaction 多向量检索取代 OCR 流水线，在文档检索基准上大幅领先传统方法。https://arxiv.org/abs/2407.01449
- **[Benchmarking Large Language Models in Complex Information Extraction Tasks with Large Language Models]** (Ma et al., 2024) — 对多模态 RAG 中文档解析、跨模态检索与生成能力进行系统性评测。https://arxiv.org/abs/2409.02076

### 博文/教程
- **[Building Multimodal RAG Systems]** — LlamaIndex 官方博客。以实际代码演示如何构建处理 PDF 图文混排的多模态 RAG 系统，包括图像描述生成和多模态索引策略。https://www.llamaindex.ai/blog/multimodal-rag
