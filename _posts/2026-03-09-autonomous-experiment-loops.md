---
layout: post
title: "Autonomous Experiment Loops"
date: 2026-03-09
author: "Diego Carboni"
description: "From ML Research to Product Development"
---

# Autonomous Experiment Loops: From ML Research to Product Development

*Brainstorm notes — March 2026*

## The Pattern

Karpathy's `autoresearch` distills a universal optimization loop:

```
Change one variable → Deploy → Measure one metric → Keep or discard → Repeat forever
```

In autoresearch: edit `train.py` → train for 5 min → check `val_bpb` → keep/revert → repeat.
An agent runs ~100 experiments overnight with zero human involvement.

## The Generalization

This loop applies to anything with a **modifiable variable** and a **numeric score**.
Marketing teams, product teams, and growth teams already do this manually (A/B testing,
campaign optimization). The insight is: automate the full loop, remove the human bottleneck.

But applying it to real-world channels (cold email, ads, landing pages) has fundamental limits:

| Constraint         | ML Experiments        | Real-World Channels        |
|--------------------|-----------------------|----------------------------|
| Feedback speed     | 5 minutes             | 72 hours to 90 days        |
| Signal quality     | Deterministic metric  | Noisy, needs large samples |
| Cost of failure    | Wasted GPU minutes    | Burned real prospects       |
| Reversibility      | `git revert`          | Can't unsend an email       |

Real-world loops are 100-1000x slower and carry real consequences.
The pattern is correct. The speed advantage disappears.

## The Real Unlock: Synthetic Benchmarking

The way to recover the speed advantage is the same thing LLM labs discovered:
**don't wait for real-world signal. Generate synthetic signal.**

LLM labs can't wait for millions of users to rate outputs. So they use synthetic data,
synthetic evaluations, synthetic preferences. By the time the model ships, most learning
already happened offline.

Apply the same idea to product development:

1. **Build benchmarks** — synthetic users, synthetic scenarios, expected outcomes
2. **Run the app against benchmarks** — agents exercise the product like real users would
3. **Measure, fix, iterate** — the full loop completes in seconds, not days
4. **Deploy to real users** — the app is already battle-tested

The feedback cycle drops from 72 hours to seconds. Now you *can* run 100 experiments
overnight — not on a toy model, but on your actual product.

Every benchmark is also a **regression test forever**. The app can only get better,
never silently regress. The moat isn't experiment history — it's a growing suite of
synthetic evaluations that encode what "good" looks like for your specific product.

### The Stack Inverts

```
OLD: Build for humans → deploy → hope users find bugs → fix → repeat slowly
NEW: Build for agents → benchmark → agents find issues → fix → repeat fast → then add humans
```

Humans become the last mile, not the testing ground. By the time a real user touches
the app, it's already been through thousands of synthetic runs.

## The Open Problem: Agent Motivation

Benchmarks with pre-defined tasks work, but they're scripted. The agent has no *purpose*
to use the app — it's just executing a checklist. This creates blind spots:

- Scripted tasks test what you *thought* to test
- Real usage involves emergent behavior, creative misuse, unexpected workflows
- Pre-defined tasks can't discover unknown unknowns

The question: **how do you give agents a reason to use an app?**

## The Virtual Company Model

The answer: don't just create test agents. Create **virtual companies**.

Each virtual company is a simulated business with:

- A business model and goals
- Revenue targets and constraints
- Employees (agents) with roles and responsibilities
- Real operational needs that require using other companies' products

```
┌─────────────────┐         ┌─────────────────┐
│ Virtual Co. A    │         │ Virtual Co. B    │
│ (E-commerce)     │         │ (SaaS Analytics) │
│                  │ uses    │                  │
│ Needs analytics ─┼────────►│ Provides dashb.  │
│ to track sales   │         │ and reports      │
│                  │◄────────┼─ Needs customers │
│ Is a customer    │  uses   │ to demo product  │
└─────────────────┘         └─────────────────┘
         │                           │
         │ uses                      │ uses
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ Virtual Co. C    │         │ Your App         │
│ (Marketing Agency│         │ (under test)     │
│                  │ uses    │                  │
│ Runs campaigns  ─┼────────►│ The product you  │
│ for A and B      │         │ are benchmarking │
└─────────────────┘         └─────────────────┘
```

Why this works:

1. **Agents have purpose.** They're not running test scripts — they're trying to hit
   quarterly targets, onboard new clients, solve operational problems. The app usage
   is a means to an end, not the end itself.

2. **Emergent behavior.** When Company A's sales spike, Company B's analytics dashboard
   gets hammered. When Company C runs a campaign, your app gets a burst of sign-ups.
   You didn't script these scenarios — they emerged from the simulation.

3. **Realistic failure modes.** An agent trying to close a deal before end-of-quarter
   will push your app's edge cases in ways a scripted test never would.

4. **Cross-product interaction.** Your app doesn't exist in a vacuum. Virtual companies
   use multiple products together, exposing integration issues and workflow gaps.

5. **The benchmark writes itself.** Instead of hand-crafting test scenarios, you define
   company goals and let the agents figure out how to achieve them. New test coverage
   emerges automatically as companies evolve.

### The Autoresearch Loop, Applied

```
Setup (fixed, like prepare.py):
  - Virtual company definitions (business model, goals, constraints)
  - Agent roles and responsibilities
  - Inter-company relationships
  - Scoring: did companies achieve their goals? How efficiently?

Sandbox (modified each iteration, like train.py):
  - Your app's code

Loop (like program.md):
  1. Agent modifies the app
  2. Virtual companies run for a simulated period
  3. Measure: goal completion rate, task success, error rate, time-to-completion
  4. Keep or discard the change
  5. Repeat
```

The metric isn't `val_bpb`. It's **"did the virtual companies accomplish their goals
using your product?"** Lower friction, higher success rate, fewer errors = better product.

## Key Limitation

Same as LLM labs: **synthetic can diverge from reality.** Virtual companies might
develop usage patterns that real businesses never would. Periodic calibration against
real user data is essential — use real usage to tune the simulation, not replace it.

## Summary

| Layer                    | What It Provides                                |
|--------------------------|-------------------------------------------------|
| Autoresearch pattern     | The loop: change → measure → keep/discard       |
| Synthetic benchmarks     | Speed: seconds instead of days                  |
| Virtual companies        | Purpose: agents with real goals, not scripts    |
| Cross-company simulation | Emergence: unknown unknowns surface organically |
| Calibration against real | Accuracy: keeps synthetics honest                |

The new software development cycle:
**Build for agents → simulate virtual companies → benchmark → iterate at machine speed → then ship to humans.**
