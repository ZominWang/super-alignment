---
id: "cnn"
name: "卷积网络CNN"
name_en: "Convolutional Neural Networks"
type: "topic"
level: 3
area: "foundations"
direction: "deep_learning"
prerequisites: ["neural_network_basics"]
difficulty: 3
importance: 4
status: "unknown"
tags: ["deep-learning", "cnn", "convolution", "computer-vision"]
---

卷积神经网络通过参数共享和局部感受野学习空间层次特征，是计算机视觉领域的基石架构。卷积层、池化层的设计哲学（局部性+平移不变性）也启发了 Transformer 的注意力机制设计。

## Quiz

### Q1
**问题**: 卷积操作的"参数共享"机制相比全连接层的核心优势是什么？

- A. 参数共享使模型输出更大
- B. 大幅减少参数量，同时赋予模型平移不变性  ✓
- C. 参数共享使梯度计算更简单
- D. 参数共享只对图像有效

**解析**: 全连接层处理 224×224 图像需要约 50K 参数（仅第一层）。卷积核（如 3×3×64 个）参数量固定且在整个特征图上共享，不仅大幅减少参数，还使模型对特征位置具有平移不变性（猫在左边还是右边都能识别）。

### Q2
**问题**: ResNet 引入"残差连接"（Residual Connection）主要解决了什么问题？

- A. 解决了计算量随深度增加的问题
- B. 解决了极深网络中的梯度消失和退化问题，使训练百层以上的网络成为可能  ✓
- C. 消除了对 BatchNorm 的需求
- D. 让网络可以处理可变尺寸的输入

**解析**: 残差连接 H(x) = F(x) + x 使得梯度可以直接通过跳跃连接回传到浅层，缓解梯度消失。更重要的是，若恒等映射已足够好，网络只需学习残差 F(x) = H(x) - x ≈ 0，降低了优化难度。这一思想后来被 Transformer 广泛采用。

### Q3
**问题**: 全局平均池化（Global Average Pooling, GAP）相比全连接层作为分类头的优势是？

- A. GAP 计算更复杂，但更精确
- B. GAP 大幅减少参数量，并提供一定的平移不变性，不容易过拟合  ✓
- C. GAP 需要固定输入尺寸
- D. GAP 输出更高维的特征

**解析**: 若最后一层特征图是 7×7×512，全连接分类头需要 7×7×512×1000 ≈ 25M 参数。GAP 将每个通道的特征图平均为一个值，得到 512 维向量，再接全连接层，参数量仅 512×1000 ≈ 512K，且支持任意输入尺寸。
