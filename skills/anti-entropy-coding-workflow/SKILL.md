---
name: anti-entropy-coding-workflow
description: Unrestrained AI programming will cause the system to deteriorate gradually, eventually becoming full of inconsistencies, unmaintainable, and heading toward collapse. This is analogous to entropy increase. This skill defines a reliable workflow to consistent and stable delivery, bring the system to entropy reduction. When encountering ANY coding task, please use this to avoid entropy increase.
---
 # What and why is coding entropy?
The system gets worse over time, eventually become unmaintainable and useful because of the following reasons:
* The AI only sees a slice of the codebase (context window limit)
* It makes locally reasonable changes
* Those changes introduce small inconsistencies
* Future edits build on already-drifted state
* Eventually → system-level incoherence (“avalanche”)
That does resemble entropy: disorder increases unless you actively inject structure and constraints.

# The Workflow 
The core idea of anti-entropy is simple:
** Free generation, hard validation, frequent reset.**
Follow the steps below, you will get a consistent and stable delivery.

## Step 1: check the source of truth 
The System MUST have a set of permanent artifacts as the source of truth. The artifacts may include:
* Design documents with module specifications and boundaries
* E2E Test specifications and cases
* API contracts
* "DO NOT violate" invariants
* ...etc
Those artifacts reduce the AI’s degrees of freedom → less entropy generation. 
Read [references/step1-check-the-source-of-truth.md](references/step1-check-the-source-of-truth.md) to perform the operation.

## Step2: anti-entropy coding loop

## Step3: anti-entropy review and reset loop

