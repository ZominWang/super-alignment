---
id: "containerization"
name: "容器化与部署"
name_en: "Containerization & Deployment"
type: "topic"
level: 3
area: "engineering"
direction: "mlops"
prerequisites: ["llm_api_design"]
difficulty: 2
importance: 2
status: "unknown"
tags: ["engineering", "docker", "kubernetes", "deployment", "gpu"]
---

容器化将 LLM 应用打包为一致的运行环境，Docker 解决"在我机器上能跑"问题，Kubernetes 处理生产环境的扩缩容和服务编排。GPU 容器（NVIDIA Container Toolkit）、模型服务框架（vLLM、TGI）是 LLM 生产部署的核心工具链。

## Quiz

### Q1
**问题**: 在 Dockerfile 中，`COPY requirements.txt .` 然后 `RUN pip install` 放在 `COPY . .` 之前的原因是？

- A. 安全考虑，先安装依赖再复制代码
- B. 利用 Docker 层缓存：依赖变化少，代码变化频繁；将慢步骤放前面使代码更改时只重建后面的层  ✓
- C. pip install 需要先知道代码路径
- D. 这是 Docker 的强制规范

**解析**: Docker 构建时，若某层的指令或文件内容未变，直接使用缓存。若先 `COPY . .` 再 `pip install`，每次修改代码（即使只改一行）都会触发 pip install（可能耗时数分钟）。将 requirements.txt 先复制并安装，代码修改时只重建最后的 COPY 层，构建速度从 5 分钟降至 5 秒。

### Q2
**问题**: 在 Kubernetes 中部署 LLM 推理服务时，HPA（Horizontal Pod Autoscaler）的扩缩容指标应该选择什么？

- A. CPU 使用率（默认指标）
- B. 请求队列长度或 GPU 利用率，因为 LLM 推理是 GPU 密集而非 CPU 密集型任务  ✓
- C. 内存使用率
- D. 网络带宽使用率

**解析**: LLM 推理 CPU 可能长期空闲（GPU 在工作），基于 CPU 的 HPA 会误判不需要扩容。正确方案：(1) GPU 利用率（通过 DCGM Exporter 暴露 Prometheus 指标）；(2) 请求队列深度（推理服务积压的请求数）；(3) P95 延迟。当队列长度超阈值时扩 Pod，当队列为空时缩容（注意 GPU 节点启动慢，需设置预热时间）。

### Q3
**问题**: 蓝绿部署（Blue-Green Deployment）在 LLM 服务更新时的主要优势是什么？

- A. 减少新版本的显存占用
- B. 新旧版本同时运行，流量瞬间切换，失败时立即回滚，消除了停机时间  ✓
- C. 允许逐步验证新版本效果（金丝雀发布）
- D. 蓝绿部署自动检测模型质量

**解析**: 滚动更新在更新期间同时存在新旧版本处理请求（可能有不一致）。蓝绿部署：准备好完整的新版本（绿）→ 测试验证 → 将负载均衡器从蓝切换到绿（流量 100% 切换，秒级完成）→ 保留蓝版本作为回滚。代价是需要双倍的 GPU 资源（新旧版本同时运行）。
