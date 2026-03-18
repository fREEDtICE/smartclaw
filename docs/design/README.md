
# CRITICAL REQUIREMENTS
All design documents must strictly follow this hierarchy and rule set:
### 1. Document Priority (Source of Truth)

When conflicts arise, always defer to the higher-priority layer:

**Layer 1 > Layer 1.5 > Layer 2**

* Higher layers override lower layers without exception.

---

### 2. Layer Definitions

* **Layer 1 — Architecture & Scope**
  Defines the overall system structure, boundaries, and high-level design decisions.

* **Layer 1.5 — Invariants & Cross-Cutting Rules**
  Defines global constraints, invariants, and rules that apply across all subsystems.

* **Layer 2 — Subsystem Behavior & Contracts**
  Defines detailed subsystem logic, behavior, contract semantics, and interaction contracts.

---

### 3. Iteration Output Requirements

Each iteration must produce:

* Finalized Go models
* Interfaces
* Package structure/layout
* Error definitions and handling strategy
* Test specifications
