# Question Framework

Ask only the questions needed to create the next authoritative artifact.

# Preferred question types

## Scope questions
Use when system overview or target scope is unclear.
* What is the first development scope you actually want to implement?
* Which subsystem is on the critical path for the first milestone?

## Invariant questions
Use when invariant docs are missing or too abstract.
* Which behaviors in this project must never change accidentally?
* Which cross-cutting safety or lifecycle rules would make a bad implementation obviously wrong?

## Interface questions
Use when design docs exist but executable boundaries are vague.
* Which subsystem interfaces need explicit request, response, or state-transition contracts first?
* Are there any APIs, schemas, or message formats that are already authoritative?

## E2E questions
Use when workflows are described loosely or not tied to acceptance.
* Which 1 to 3 user journeys should be considered the minimum acceptance bar for the first development phase?
* Which failure path is important enough to specify before coding starts?

## Test-environment questions
Use when implementation readiness is blocked by non-executable verification.
* What is the actual build or runtime entry point for this repo?
* What command should count as the smoke test for the first scope?
* What targeted verification command should be run after editing that scope?

## Risk-zone questions
Use when the repo touches high-risk behavior.
* Which areas are highest risk: auth, policy, sandbox, memory, delegation, billing, or migrations?
* Which risk zone needs explicit review or approval rules before coding begins?

# Selection rules
* Ask 3 questions by default.
* Ask 4 or 5 only if the repo is genuinely ambiguous.
* Prefer questions whose answers let you draft the next artifact immediately.
* Do not ask broad product-strategy questions unless they block artifact creation.
