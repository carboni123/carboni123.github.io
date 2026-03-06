---
layout: post
title: "Social Batching Degradation"
date: 2026-03-06
author: "Diego Carboni"
description: "How Viral Adoption Surges May Compromise LLM Inference Quality. A Case Study of the Claude Opus 4.6 Performance Dip, March 2026"
---

# Social Batching Degradation

**A Case Study of the Claude Opus 4.6 Performance Dip, March 2026**

---

## Abstract

In early March 2026, independent benchmarks recorded Claude Opus 4.6's daily pass rate dropping to approximately 45% — its lowest in recent evaluations against a 56–58% baseline. This dip coincided precisely with an unprecedented adoption surge: Claude hit #1 on the U.S. App Store, free users grew over 60%, and daily sign-ups broke records for consecutive days, driven largely by a consumer boycott of ChatGPT following OpenAI's Pentagon deal. We introduce the term **social batching degradation** to describe a previously underexamined failure mode in which viral user growth floods inference pipelines with high volumes of low-quality, unstructured, or adversarial inputs, degrading output quality for all users through the mechanics of dynamic batching, KV cache pressure, adaptive quantization, and speculative decoding heuristics. Drawing on systems research, independent benchmark data, developer reports, and the technical literature on batch non-invariance, we argue that social dynamics — not just model updates or infrastructure bugs — can be a meaningful contributor to perceived and measured AI performance regression. While definitive causal proof remains elusive (providers do not publish batch composition telemetry), the correlation is strong, the mechanisms are well-documented, and the implications for AI reliability are significant.

---

## 1. Introduction

On March 2, 2026, Anthropic's Claude chatbot experienced a global outage driven by what the company described as "unprecedented demand" [1]. Nearly 2,000 users reported disruptions on Downdetector at peak. The surge was not organic product growth — it was a political event. Days earlier, Anthropic had lost its Pentagon contract after refusing to loosen AI safety guardrails for military applications. Hours later, OpenAI announced its own Pentagon deal worth up to $200 million [2]. The backlash was immediate and massive: ChatGPT uninstalls spiked 295% in a single day, one-star App Store reviews of ChatGPT surged 775%, and over 2.5 million users reportedly joined the #QuitGPT campaign [3][4]. Claude became the beneficiary of a protest migration.

This paper examines an uncomfortable possibility: that the very users rushing to Claude may have inadvertently degraded its performance. Not through any fault of their own, but through a structural property of how large language models are served at scale. When millions of new, often casual users simultaneously flood an inference pipeline — many with unstructured prompts, copy-pasted garbage, "fix my shit" requests, and trial-and-error experimentation — the composition of inference batches changes. And batch composition, as recent systems research demonstrates, affects output quality.

We call this phenomenon **social batching degradation**: the degradation of LLM inference quality caused by a rapid, socially-driven influx of low-signal inputs that pollutes the statistical properties of dynamically constructed inference batches.

This paper proceeds as follows. Section 2 reconstructs the timeline of the Claude Opus 4.6 incident. Section 3 details the technical mechanisms through which batch composition can affect output quality. Section 4 examines the evidence — benchmark data, developer reports, and infrastructure signals. Section 5 surveys historical precedents. Section 6 discusses alternative explanations, limitations, and implications. Section 7 concludes.

---

## 2. The Incident: Timeline and Context

### 2.1 The Adoption Surge

The chain of events began on February 28, 2026, when Anthropic CEO Dario Amodei publicly declined to loosen safety guardrails for Pentagon AI applications, writing: "In a narrow set of cases, we believe AI can undermine, rather than defend, democratic values" [5]. Within hours, OpenAI announced its own defense contract. The consumer response was swift:

- **February 28–March 1:** Claude rose from outside the top 20 to #1 on Apple's U.S. App Store free apps chart, overtaking ChatGPT for the first time [6][7].
- **March 1–2:** Free active users increased over 60% since January. Paid subscribers more than doubled year-to-date. Daily sign-ups tripled since November 2025, breaking all-time records on multiple consecutive days [8].
- **March 2:** A global outage began at approximately 11:30 UTC, lasting roughly three hours. The web interface failed first; API endpoints for Opus 4.6 and Haiku 4.5 degraded subsequently [1][9].

Critically, this was not a gradual ramp. Claude's App Store ranking went from #131 (January 30) to #1 in the space of weeks, with the sharpest inflection occurring over a single weekend [6].

### 2.2 The Performance Dip

Marginlab, an independent third-party monitoring service unaffiliated with Anthropic, operates a tracker that runs daily benchmarks on a curated subset of SWE-Bench-Pro using the Claude Code CLI [10]. Their methodology uses N=50 test instances per daily run with statistical testing at a p < 0.05 significance threshold.

Around March 3, 2026, the tracker recorded Claude Opus 4.6's daily pass rate dropping to approximately 45%, against a baseline of 56–58% — a statistically significant regression [10][11]. Earlier, in late January, a 30-day pass rate decline to 54% (from 58% baseline) had already been detected, attributed in part to a Claude Code harness bug introduced January 26 and rolled back January 28 [12].

The March dip, however, coincided not with a known software change but with the adoption surge.

### 2.3 Developer Reports

User complaints during this window clustered into recognizable patterns:

- Looping behavior: reading files already read, searching for things already found, spawning unnecessary subagents for trivial tasks. One professional user (8+ hours/day) reported tasks that took 5 minutes ballooning to 20–30 minutes, estimating a 50–60% productivity drop since the Opus 4.6 release [13].
- A "massive quality regression" where Claude Code made 20+ broken attempts at tasks instead of reasoning through problems — e.g., repeatedly trying `sudo` commands after being shown they don't work, failing to analyze underlying system constraints [14].
- A "critical production quality regression" where one user rated Opus 4.6 at 38/100, down from a prior 92/100 baseline, requiring 5x more user interactions due to severe working memory issues [15].
- Reports that direct API calls to Opus 4.6 felt "sharper" and "more thoughtful" compared to the same model accessed through Claude Code during peak hours [16].

This last observation — that API access appeared higher-quality than consumer-product access during the same period — is a key data point for the social batching degradation hypothesis.

---

## 3. Technical Mechanisms

### 3.1 Dynamic Batching in LLM Inference

Modern LLM serving systems universally employ **continuous batching** (also called iteration-level or in-flight batching), first formalized in the Orca system (OSDI 2022) [17]. Unlike static batching, which waits for all sequences in a batch to complete before accepting new requests, continuous batching operates at the granularity of individual decoding iterations: after each token generation step, the scheduler can evict completed sequences and insert new ones.

The three dominant inference frameworks — vLLM, TensorRT-LLM, and HuggingFace TGI — all implement continuous batching, achieving throughput improvements of 2–23x over naive approaches [18][19][20]. vLLM combines continuous batching with PagedAttention, a virtual-memory-inspired KV cache allocator that reduces cache waste from 60–80% (in prior systems) to under 4% [21].

The implication is that **any given inference request shares GPU compute with an unpredictable set of other requests**. The composition of a batch is determined by whatever happens to be in the queue at that scheduling instant.

### 3.2 Batch Non-Invariance

A critical finding from recent systems research is that LLM inference is **not batch-invariant**: the output for a given prompt can change depending on what other requests are processed simultaneously. A study from Thinking Machines Lab, presented as an oral paper at NeurIPS 2025, demonstrated that a 235-billion-parameter model at temperature=0 produced **80 unique completions across 1,000 identical runs** due to batch variance effects [22]. Under bfloat16 with greedy decoding, models exhibited up to **9% variation in accuracy** and **9,000 tokens difference** in response length across different batch sizes and GPU configurations [22].

The root cause is floating-point non-associativity. GPU matrix multiplication and reduction operations (matmul, RMSNorm, attention softmax) change their accumulation order depending on batch size. Since (a + b) + c ≠ a + (b + c) in floating-point arithmetic, these small numerical differences cascade through autoregressive decoding, where each token's probability distribution depends on all previous tokens [22][23].

Achieving bitwise reproducibility requires batch-invariant kernels — fixing kernel configurations regardless of batch shape — but this comes at approximately **60% performance cost** [22]. No production serving system employs this approach.

### 3.3 Cross-Request Interference

Beyond numerical non-determinism, batched requests interfere through several concrete mechanisms:

**Prefill-decode interference.** Prefill (processing the input prompt) is compute-bound, while decode (generating output tokens) is memory-bandwidth-bound. When combined in hybrid batching — standard practice under high load — L2 cache hit rates drop by **73–82%** during decode, and DRAM utilization spikes by up to 76.4% [24]. Mixing prefill requests alone can cause a **10x slowdown**; mixing decode requests of different lengths causes a **16% throughput hit** [24].

**Attention contamination from sequence packing.** When sequences from different requests are packed together for GPU efficiency, the model can attend to tokens from neighboring sequences unless explicit masking is applied [25]. Under load, the fidelity of this masking and the overhead it introduces become additional variables.

**KV cache pressure.** Every batched request maintains its own KV cache. Larger batches consume proportionally more memory, and when GPU memory saturates, the system triggers **KV cache eviction, swapping, or recomputation** — each of which degrades latency and can introduce quality artifacts [26]. Very long or poorly structured prompts from casual users disproportionately consume cache resources.

### 3.4 Adaptive Degradation Under Load

When demand exceeds capacity, inference systems do not simply slow down — they adapt, often in ways that trade quality for throughput:

**Dynamic quantization.** Systems like MorphServe dynamically replace full-precision layers with quantized alternatives during high-load periods [27]. While this can reduce SLO violations by 92.45%, quantization at lower precisions (INT4 and below) introduces measurable accuracy degradation, particularly on reasoning tasks. Post-training quantization degradation increases with model size and training data volume [28]. Red Hat's evaluation of over 500,000 quantized LLM runs found that going below 4-bit precision leads to "notable degradation on benchmarks" [29].

**Speculative decoding instability.** Under high batch loads, speculative decoding — where a smaller draft model proposes tokens verified by the target model — exhibits **fragile and highly variable performance** [30]. Optimal speculation length varies by model, dataset, and batch size; a fixed configuration tuned for low-load can produce up to a **41.2% performance gap** versus optimal under high traffic [31]. Enabling batching during the verification phase degrades speculative decoding speedup by approximately **30%** [32].

**Aggressive scheduling.** Load balancers may route overflow traffic to smaller or cheaper model variants. Azure's Foundry Model Router explicitly supports switching between "Quality" and "Balanced" modes based on load [33]. Even without explicit model switching, inference engines may reduce reasoning effort, truncate extended thinking, or apply more conservative safety filters under pressure.

### 3.5 The Batch Composition Hypothesis

Synthesizing the above mechanisms, we can articulate the social batching degradation hypothesis precisely:

When a viral adoption event floods the inference queue with a large volume of low-quality inputs — very long copy-pasted codebases, vague single-sentence prompts, adversarial jailbreak attempts, spam, and trial-and-error experimentation — the following cascade occurs:

1. **Batch statistical properties shift.** Average prompt length, variance, and quality change abruptly. Batches that previously contained mostly structured, high-signal requests from developers and enterprise users now include a significant fraction of noisy inputs.

2. **Numerical interference increases.** Longer, more heterogeneous batches produce larger floating-point accumulation discrepancies, amplifying the batch non-invariance effect.

3. **Resource pressure triggers adaptive degradation.** KV cache pressure, memory contention, and queue depth trigger quantization, cache eviction, speculation reduction, or load-balancing to cheaper endpoints.

4. **Per-request quality degrades asymmetrically.** Well-structured requests from experienced users — the kind measured by benchmarks like SWE-Bench-Pro — are disproportionately affected because they share resources with a suddenly noisier population. The benchmark measures quality on good prompts, but the infrastructure serves all prompts.

---

## 4. Evidence and Analysis

### 4.1 Temporal Correlation

The strongest evidence for social batching degradation is temporal correlation between three independently measured signals:

| Signal | Source | Timing |
|---|---|---|
| Claude hits #1 on App Store | CNBC, Fortune, Axios [6][7][8] | Feb 28 – Mar 2, 2026 |
| Global outage from "unprecedented demand" | Anthropic, Bloomberg [1][9] | Mar 2, 2026 |
| Daily pass rate drops to ~45% | Marginlab Trac [10][11] | ~Mar 3, 2026 |
| Developer complaints peak | GitHub Issues [13][14][15] | Feb 28 – Mar 5, 2026 |

The outage confirms that demand exceeded infrastructure capacity. The benchmark dip confirms measurable quality regression. The timing aligns within days.

### 4.2 API vs. Consumer Product Quality Gap

Multiple developers reported that direct API calls to Opus 4.6 felt noticeably better than the same model accessed through Claude Code or the web interface during the same period [16]. Some explicitly noted that Cursor (which proxies API calls with its own routing) felt better than native Claude Code [16].

This is consistent with the batching hypothesis. The Anthropic API serves a mix of enterprise and developer workloads — structured agent loops, production backends, research experiments — with cleaner, more focused inputs. Claude Code and the web interface, which exploded in consumer adoption, attract a flood of casual users, vague prompts, and trial-and-error hammering. If batch composition affects quality, the consumer-facing queue would be more polluted than the API queue.

However, this gap could also be explained by:
- Different rate-limiting policies between API and consumer tiers
- Claude Code's additional harness logic (permissions, tool calls, file I/O, git integration) adding overhead
- Consumer plans caching or throttling more aggressively under load

### 4.3 Benchmark Characteristics

The Marginlab tracker measures Claude Code's performance on SWE-Bench-Pro tasks — structured, complex software engineering problems [10]. These are precisely the kind of high-signal inputs that would be most affected by batch pollution: they require sustained multi-step reasoning, careful code analysis, and coherent planning. If batch interference introduces even small perturbations to attention patterns or token probabilities at critical decision points, the compound effect over a multi-step coding task could be significant.

By contrast, simple conversational queries (the bulk of new-user traffic) are more robust to small perturbations because they require less sequential reasoning depth.

### 4.4 The vLLM Batch Size Evidence

Independent of the Claude incident, multiple documented vLLM GitHub issues demonstrate that batch size and composition directly affect output quality in production inference systems:

- **Issue #17652** (May 2025): Qwen3-30B-A3B performs well at batch_size=50 when the batch contains identical prompts, but **degrades significantly with varied prompts at the same batch size** — directly implicating batch composition, not just batch size, as a quality variable [34].
- **Issue #22625** (August 2025): Qwen3-235B-A22B-Instruct produces degraded output (repeated newlines, truncated responses) when `max_num_seqs > 1`, even after applying the workaround from #17652 (`disable_cascade_attn=True`) [45].
- **Issue #9567** (October 2024): A quantized Meta-Llama-3-8B model at temperature=0 produces **different outputs depending on how the scheduler batches requests**, causing `lm-eval` benchmark scores to change as KV cache occupancy varies [46].
- **Issue #5898** (June 2024): At batch_size=1, the same prompt consistently produces the same response; at batch_size > 1, responses become **inconsistent even at temperature=0** [47].

This body of evidence is striking. It establishes that batch non-invariance is not a theoretical concern but a **recurring, independently reproduced production bug** across multiple model families (Qwen3, Llama 3), architectures (dense, MoE), and hardware configurations. The #17652 finding — that batch *composition* matters, not just batch *size* — is particularly relevant to the social batching degradation hypothesis.

---

## 5. Historical Precedents

### 5.1 GPT-4 Performance Drift (2023)

The most thoroughly documented case of LLM performance degradation during high-usage periods is the Stanford/UC Berkeley study by Chen, Zaharia, and Zou [35]. Tracking GPT-3.5 and GPT-4 from March to June 2023, they found:

- GPT-4 accuracy on prime number identification dropped from **97.6% to 2.4%**.
- Directly executable code generation dropped from **52% to 10%** for GPT-4.
- GPT-4 response verbosity collapsed from an average of **2,163 characters to just 10 characters** on identical prompts.
- Chain-of-Thought prompting effectiveness reversed from a +24.4% accuracy improvement to -0.1%.

OpenAI VP Peter Welinder denied that GPT-4 got "dumber," but the study's methodology was rigorous and the results were published in the Harvard Data Science Review [36]. While OpenAI attributed the changes to post-training updates rather than load effects, the temporal correlation with ChatGPT's viral growth phase (which peaked in early 2023) was noted by multiple commentators.

### 5.2 The "LLM Spirals of Delusion" Study

A 2025 study found **large differences between API and chat interface performance** on the same model, and that tests conducted months apart yielded completely different results — including a complete behavioral reversal in ChatGPT-5 (API) between August and October [37]. This suggests that the serving path (API vs. consumer interface) is a meaningful variable in LLM performance measurement, consistent with the social batching degradation hypothesis.

### 5.3 Industry-Wide Pattern

The pattern of user complaints clustering during viral growth periods is not unique to Claude:

- **91%** of ML models degrade over time (industry studies) [38].
- **67%** of enterprises report measurable AI model degradation within 12 months (Gartner) [38].
- Models left unchanged for 6+ months see error rates jump 35% on new data [39].
- The term "intelligence drift" was coined by Charlie Guo to capture the user experience of AI feeling "less intelligent over time" regardless of technical cause [40].

Every frontier model — GPT-4, Claude, Gemini — has faced "it got dumber" complaints during periods of rapid user growth. Social batching degradation offers a partial mechanistic explanation for this recurring pattern.

---

## 6. Discussion

### 6.1 Alternative Explanations

We do not claim that social batching degradation is the sole or even primary cause of the March 2026 performance dip. Several alternative explanations are plausible and likely contributed:

**Post-launch fine-tuning or safety updates.** Anthropic may have pushed model updates (safety filters, RLHF adjustments) that inadvertently degraded coding performance. Anthropic's September 2025 postmortem on a prior Claude degradation attributed it to a "miscompiled sampling algorithm" [41]. The January 2026 dip was confirmed to be a Claude Code harness bug [12].

**Context handling bugs.** Opus 4.6 introduced a 1-million-token context window in beta [42]. Bugs in context handling, compaction, or the new "adaptive thinking" feature could produce the observed regression patterns — particularly the looping behavior reported by users.

**Intentional optimization under demand.** Anthropic may have temporarily deployed heavier quantization, reduced reasoning effort, or applied inference optimizations to handle demand without massive additional GPU spend. This is a rational business decision, but one that trades quality for availability.

**Infrastructure scaling bugs.** Rapid horizontal scaling of inference infrastructure can introduce load-balancing errors, cache coherence issues, or configuration drift across GPU clusters.

The social batching degradation hypothesis is best understood as **one mechanism in a multi-causal picture** — and one that is uniquely tied to the social dynamics of the adoption surge.

### 6.2 Limitations

This analysis has significant limitations:

1. **No batch telemetry.** Anthropic does not publish batch composition statistics, per-request inference details, or queue metrics. We cannot directly observe whether batch quality changed during the surge.

2. **Correlation is not causation.** The temporal alignment between adoption surge and performance dip, while striking, could be coincidental. Infrastructure strain alone (without batch composition effects) could explain much of the degradation.

3. **Benchmark sample size.** Marginlab's N=50 daily samples, while statistically tested, represent a small fraction of total inference traffic. Daily variance is inherent.

4. **Unverified claims.** The brainstorm document's reference to "a 2025 ICML study" claiming "40% of LLMs experience post-deployment fluctuations" could not be verified through extensive search. The closest findings involve distribution shift studies and forgetting dynamics, but the specific statistic appears unsubstantiated [43].

5. **Subjective reports.** Developer complaints about "sloppier" or "dumber" outputs are inherently subjective and subject to confirmation bias, expectation effects, and small-sample reasoning.

### 6.3 Implications

If social batching degradation is real — even as a partial contributor — the implications are significant:

**For AI providers:**
- Inference quality is not just a model problem; it is a systems problem that interacts with user demographics and traffic composition.
- Batch-aware monitoring should track not just throughput and latency but **batch composition metrics**: input length distributions, prompt quality signals, and per-batch output variance.
- Tiered inference paths — isolating high-signal enterprise traffic from noisy consumer traffic — may be necessary to maintain quality guarantees during viral events.

**For benchmarking:**
- Independent, continuous monitoring (like Marginlab's Trac) is essential because it captures real-world serving conditions, not just model capability in isolation.
- Benchmarks should report **serving conditions** (batch size, concurrent load, time of day) alongside accuracy metrics.

**For users:**
- The observation that API access may outperform consumer products during peak periods has practical implications for professional developers. Routing through direct API keys or tools like Cursor may provide a partial hedge against batch pollution.

**For AI governance:**
- Social batching degradation introduces a novel failure mode: **political and social events can degrade AI system reliability** through mechanisms entirely divorced from the model itself. A boycott of one product can impair the quality of its competitor. This has implications for critical AI deployments in healthcare, finance, and infrastructure.

### 6.4 Toward Mitigation

Several lines of research point toward mitigation:

- **Batch-invariant kernels** achieve perfect reproducibility but at ~60% performance cost [22]. Partial batch invariance — applied to critical layers like attention and normalization — could offer a practical middle ground.
- **Prefill-decode disaggregation** separates the two inference phases onto different machines, eliminating the primary source of cross-request interference [24].
- **Adaptive precision systems** like MorphServe [27] and DP-LLM [44] dynamically adjust quantization per-layer and per-step based on real-time load, reducing the quality cost of load-driven optimization.
- **Input quality routing** could classify incoming prompts by complexity and structure, routing high-signal requests to premium batches and low-signal requests to separate queues. This raises fairness concerns but mirrors existing tiered service models.
- **Nightjar-style adaptive speculation** [31] dynamically adjusts speculative decoding parameters based on workload, avoiding the performance cliffs that occur when fixed configurations meet variable load.

### 6.5 Future Work

Controlled experiments injecting synthetic low-quality prompts (varying in length, structure, and coherence) into production-like serving stacks (e.g., vLLM with PagedAttention on A100/H100 clusters) while measuring SWE-Bench-Verified variance on held-out high-signal tasks would provide the causal evidence this paper lacks. Such experiments should systematically vary batch composition ratios (percentage of noisy vs. structured inputs), measure per-request output quality metrics (pass rate, reasoning depth, hallucination rate), and report results across multiple quantization levels and speculation configurations. Additionally, longitudinal analysis of Marginlab Trac data correlated with App Store ranking and Downdetector incident data could reveal whether the adoption-degradation pattern is reproducible across future viral events.

---

## 7. Conclusion

The Claude Opus 4.6 performance dip of March 2026 was likely multi-causal: infrastructure strain, possible model updates, and the sheer physics of serving unprecedented demand all played roles. But the social batching degradation hypothesis adds an underexamined dimension: that the **quality of the user population's inputs** is itself a variable in inference quality, mediated through the mechanics of dynamic batching, floating-point non-determinism, KV cache pressure, and adaptive optimization.

This is not a story about "stupid users ruining AI." It is a story about systems under stress. The same batching, quantization, and scheduling techniques that make frontier AI economically viable at scale also create coupling between unrelated requests. When the statistical properties of the request population shift abruptly — as they did when millions of politically motivated users switched platforms over a weekend — that coupling becomes a vulnerability.

The evidence is circumstantial but structurally coherent. The mechanisms are well-documented in systems research. The temporal correlation is precise. And the pattern — viral growth followed by quality complaints followed by gradual recovery — has repeated across every frontier model deployment.

If the Marginlab benchmarks rebound in the weeks following the March surge, that will be strong evidence that the degradation was primarily transient — driven by load and batch dynamics rather than permanent model regression. If they do not, deeper investigation into model-level changes will be warranted.

Either way, social batching degradation deserves a name, a framework, and a place in the conversation about AI reliability. The next viral event is always one controversy away.

---

## References

[1] "Anthropic confirms Claude is down in a worldwide outage." *Bleeping Computer*, March 2, 2026. https://www.bleepingcomputer.com/news/artificial-intelligence/anthropic-confirms-claude-is-down-in-a-worldwide-outage/

[2] "Amid growing backlash, Sam Altman explains Pentagon deal." *Fortune*, March 2, 2026. https://fortune.com/2026/03/02/openai-ceo-sam-altman-defends-decision-to-strike-pentagon-deal-amid-backlash-against-the-chatgpt-maker-following-anthropic-blacklisting/

[3] "'Cancel ChatGPT' boycott surges after OpenAI Pentagon military deal." *Euronews*, March 2, 2026. https://www.euronews.com/next/2026/03/02/cancel-chatgpt-ai-boycott-surges-after-openai-pentagon-military-deal

[4] "Over 2.5 Million Users Joined QuitGPT to Boycott ChatGPT." *TheInsaneApp*, March 2026. https://www.theinsaneapp.com/2026/03/over-1-5-million-users-joined-quitgpt-to-boycott-chatgpt.html

[5] "Anthropic's Claude chatbot goes down amid 'unprecedented demand'." *Bloomberg*, March 2, 2026. https://www.bloomberg.com/news/articles/2026-03-02/anthropic-s-claude-chatbot-goes-down-for-thousands-of-users

[6] "Claude hits No. 1 on Apple's top free apps after Pentagon rejection." *CNBC*, February 28, 2026. https://www.cnbc.com/2026/02/28/anthropics-claude-apple-apps.html

[7] "Anthropic's Claude overtakes ChatGPT in App Store." *Fortune*, March 2, 2026. https://fortune.com/2026/03/02/anthropic-claude-dario-amodei-number-one-app-store-openai-chatgpt-sam-altman-department-war/

[8] "Claude beats ChatGPT in U.S. app downloads." *Axios*, March 1, 2026. https://www.axios.com/2026/03/01/anthropic-claude-chatgpt-app-downloads-pentagon

[9] "Anthropic's Claude sees 'elevated errors' as it tops Apple's free apps." *CNBC*, March 2, 2026. https://www.cnbc.com/2026/03/02/anthropic-claude-ai-outage-apple-pentagon.html

[10] Marginlab. "Claude Code Opus 4.6 Performance Tracker." https://marginlab.ai/trackers/claude-code/

[11] "Independent Tracker Confirms Claude Code Performance Drops." *NewsBreak / WinBuzzer*, January 2026. https://winbuzzer.com/2026/01/29/claude-code-performance-drops-independent-tracker-xcxwbn/

[12] Thariq Shihipar (Anthropic). Comment on Hacker News, January 28, 2026. https://news.ycombinator.com/item?id=46810282

[13] GitHub Issue #28469: "Opus 4.6 comprehensive regression: loops, memory loss, ignored instructions — daily professional user report." February 2026. https://github.com/anthropics/claude-code/issues/28469

[14] GitHub Issue #21431: "Massive quality regression." January 28, 2026. https://github.com/anthropics/claude-code/issues/21431

[15] GitHub Issue #24991: "Critical: Opus 4.6 Configuration Regression — 92/100 → 38/100 Performance Drop." February 2026. https://github.com/anthropics/claude-code/issues/24991

[16] Community discussions on Reddit r/ClaudeAI, Latenode Community, and X (formerly Twitter), February–March 2026. https://community.latenode.com/t/claude-code-performance-changes-max-subscription-vs-api-a-shocking-comparison/17438

[17] Yu, G-I., et al. "Orca: A Distributed Serving System for Transformer-Based Generative Models." *OSDI 2022*. https://www.usenix.org/conference/osdi22/presentation/yu

[18] "Continuous Batching LLM Inference." *Anyscale Blog*, 2023. https://www.anyscale.com/blog/continuous-batching-llm-inference

[19] "Static, Dynamic and Continuous Batching." *BentoML*. https://bentoml.com/llm/inference-optimization/static-dynamic-continuous-batching

[20] "Continuous Batching from First Principles." *Hugging Face Blog*. https://huggingface.co/blog/continuous_batching

[21] Kwon, W., et al. "Efficient Memory Management for Large Language Model Serving with PagedAttention." *SOSP 2023*. https://arxiv.org/abs/2309.06180

[22] "Defeating Nondeterminism in LLM Inference." *Thinking Machines Lab*; also arXiv:2506.09501. Presented as oral paper at NeurIPS 2025. https://arxiv.org/pdf/2506.09501

[23] "LLM-42: Enabling Determinism via Verified Speculation." arXiv:2601.17768. https://arxiv.org/html/2601.17768v1

[24] "Mind the Memory Gap: GPU Bottlenecks in Large-Batch LLM Inference." arXiv:2503.08311. https://arxiv.org/html/2503.08311v2

[25] "Efficient LLM Pretraining: Packed Sequences and Masked Attention." *Hugging Face Blog*. https://huggingface.co/blog/sirluk/llm-sequence-packing

[26] "NVIDIA: Mastering LLM Techniques: Inference Optimization." *NVIDIA Developer Blog*. https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/

[27] "MorphServe: Dynamic Model Serving with Heterogeneous Quantization." arXiv:2506.02006. https://arxiv.org/abs/2506.02006

[28] "Mixed-Precision Quantization Survey." arXiv:2510.16805. https://arxiv.org/html/2510.16805v1

[29] "We Ran Over Half a Million Evaluations on Quantized LLMs." *Red Hat Developer*, October 2024. https://developers.redhat.com/articles/2024/10/17/we-ran-over-half-million-evaluations-quantized-llms

[30] "Speculative Decoding Features." *vLLM Documentation*. https://docs.vllm.ai/en/latest/features/speculative_decoding/

[31] "Nightjar: Dynamic Adaptive Speculative Decoding." arXiv:2512.22420. https://arxiv.org/html/2512.22420

[32] "Batch Speculative Decoding Done Right." arXiv:2510.22876. https://arxiv.org/html/2510.22876v3

[33] "Optimising AI Costs with Microsoft Foundry Model Router." *Microsoft Tech Community*. https://techcommunity.microsoft.com/blog/azuredevcommunityblog/optimising-ai-costs-with-microsoft-foundry-model-router/4494776

[34] vLLM GitHub Issue #17652: "Degradation of Qwen/Qwen3-30B-A3B performance depending on batch size." May 2025. https://github.com/vllm-project/vllm/issues/17652

[35] Chen, L., Zaharia, M., and Zou, J. "How Is ChatGPT's Behavior Changing Over Time?" arXiv:2307.09009, 2023. https://arxiv.org/abs/2307.09009

[36] Chen, L., Zaharia, M., and Zou, J. "How Is ChatGPT's Behavior Changing Over Time?" *Harvard Data Science Review*, Spring 2024. https://hdsr.mitpress.mit.edu/pub/y95zitmz

[37] "LLM Spirals of Delusion." 2025. https://llm-spirals-of-delusion.github.io/

[38] "The AI Drift Problem: Silent Model Degradation." *V2 Solutions*. https://www.v2solutions.com/blogs/ai-drift-problem-silent-model-degradation/

[39] "How to Monitor LLMOps Performance with Drift Monitoring." *Fiddler AI*. https://www.fiddler.ai/blog/how-to-monitor-llmops-performance-with-drift

[40] Guo, C. "Revisiting 'Intelligence Drift'." *Ignorance.ai*, 2025. https://www.ignorance.ai/p/revisiting-intelligence-drift

[41] "Yes, AI Models Can Get Worse over Time." *Scientific American*. https://www.scientificamerican.com/article/yes-ai-models-can-get-worse-over-time/

[42] "Claude Opus 4.6 — What Actually Changed." *Medium / Data Science Collective*. https://medium.com/data-science-collective/claude-opus-4-6-what-actually-changed-and-why-it-matters-1c81baeea0c9

[43] Note: The claim that "40% of LLMs experience post-deployment fluctuations per a 2025 ICML study" could not be verified through extensive search of ICML 2025 proceedings and related literature. The closest findings involve distribution shift studies (Oh et al., ICML 2025) and forgetting dynamics (Apple Research, ICML 2025), but the specific 40% statistic appears unsubstantiated.

[44] "DP-LLM: Dynamic Precision for LLM Inference." arXiv:2508.06041. https://arxiv.org/html/2508.06041

[45] vLLM GitHub Issue #22625: "Generation quality decrease while batch size > 1 (Qwen3-235B-A22B-Instruct)." August 2025. https://github.com/vllm-project/vllm/issues/22625

[46] vLLM GitHub Issue #9567: "Models produce different output with different batch sizes." October 2024. https://github.com/vllm-project/vllm/issues/9567

[47] vLLM GitHub Issue #5898: "Inconsistent Responses with VLLM When Batch Size > 1 even temperature = 0." June 2024. https://github.com/vllm-project/vllm/issues/5898

---

*Paper compiled March 5, 2026. The authors have no affiliation with Anthropic, OpenAI, or Marginlab.*
