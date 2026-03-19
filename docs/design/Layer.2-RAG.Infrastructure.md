# SmartClaw Agent Platform — Layer 2

## RAG Infrastructure Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** RAG Infrastructure  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Knowledge Plane Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* Memory System Design
* Policy and Approval System Design
* Identity and Thread Management
* Observability and Replay Design

---

## 2. Purpose

The RAG Infrastructure is the platform subsystem that turns internal or external knowledge sources into **shared indexed retrieval surfaces** and returns query-time evidence packages for agent execution.

It exists because retrieval should be reusable platform infrastructure rather than something each agent rebuilds privately.
The platform must support:

* ingestion of internal and external knowledge
* indexing and refresh of retrievable corpora
* metadata filtering
* retrieval and reranking
* evidence packaging with citations
* reusable retrieval APIs across agents and applications

The subsystem owns:

* corpus and document indexing contracts
* retrieval query contracts
* reranking and result shaping contracts
* citation and evidence packaging
* replay-visible retrieval snapshots and query artifacts

The Agent Runtime decides **when retrieval is needed for a run or step**.  
The RAG Infrastructure decides **how indexed knowledge is ingested, filtered, retrieved, reranked, and packaged for downstream use**.

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The RAG Infrastructure is responsible for:

* ingesting external or internal knowledge into reusable corpora
* normalizing document sources into canonical retrievable units
* indexing and refreshing retrievable document and chunk metadata
* executing retrieval queries with metadata filtering
* reranking result sets
* packaging retrieved evidence with source metadata and citations
* returning query results suitable for Context Assembly and replay
* preserving corpus snapshot, query, and result provenance
* enforcing corpus access and filter constraints required by scope or policy

### Out of Scope

The RAG Infrastructure does **not** own:

* persistent memory writes
* memory lifecycle management
* thread summary generation
* prompt rendering
* the main reasoning loop
* policy authoring or approval UX
* identity resolution
* context assembly ordering
* document-authoring workflows

This subsystem owns query-time knowledge retrieval.
It does not replace the Memory System or runtime context construction.

---

## 4. Architectural Role

The RAG Infrastructure sits on the retrieval path between indexed knowledge sources and runtime context assembly.

```text
source connectors / internal content
  -> RAG Infrastructure
       -> normalize / chunk / annotate / index
       -> publish retrievable corpus snapshot

Agent Runtime
  -> request retrieval query
  -> RAG Infrastructure
       -> enforce corpus and filter boundaries
       -> retrieve and rerank
       -> package results with citations
  -> Context Assembly
       -> render RAG as a distinct evidence layer
```

### Upstream inputs

* source content from internal systems, imported knowledge, or approved external sources
* metadata and access labels for corpora and documents
* retrieval requests from runtime or approved internal callers
* policy or scope constraints for restricted corpus access
* lifecycle signals indicating superseded or withdrawn source content

### Downstream outputs

* corpus snapshots
* retrieval result sets
* result chunks with citations and source metadata
* query refs and replay artifacts
* observability events

### Primary consumers

* Agent Runtime
* Context Assembly
* Observability and Replay
* Memory System for explicit candidate-generation paths only

---

## 5. Goals and Non-Goals

### Goals

The RAG Infrastructure must optimize for:

* shared retrieval as platform infrastructure
* strong separation from memory
* reusable retrieval APIs
* provenance-rich evidence packaging
* metadata-filtered retrieval
* bounded reranking and result shaping
* replay-visible query and result artifacts
* safe retrieval for head-agent and subagent use

### Non-Goals

The RAG Infrastructure is not trying to optimize for:

* replacing platform memory
* mutating live knowledge into trusted memory by default
* embedding retrieval logic directly in every agent
* hiding source metadata or citations
* bypassing scope or corpus-access constraints
* silently replaying live retrieval as if it were authoritative history

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the retrieval-related features declared in Layer 1 and Layer 1.5.

### From Layer 1

The subsystem must support:

* shared retrieval infrastructure used across agents and applications
* ingestion and indexing of external or internal knowledge
* retrieval and reranking
* metadata filtering
* reusable retrieval APIs
* evidence and citation packaging for downstream consumption

### From Layer 1.5

The subsystem must implement:

* retrieval of external knowledge
* reranked result delivery
* citation return with source metadata
* outputs that remain clearly distinguishable from memory
* the rule that RAG results must not overwrite memory
* replay-visible retrieval query and result behavior suitable for downstream context assembly

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The RAG Infrastructure must:

* accept approved source content and normalize it into retrievable corpus units
* maintain corpus, document, and chunk metadata needed for retrieval and citation
* expose shared retrieval APIs for runtime and other approved consumers
* execute metadata-filtered retrieval queries
* rerank retrieved candidates into bounded result sets
* package results with source metadata, retrieval query refs, and citations
* support corpus refresh and supersession without breaking replay
* preserve query and result artifacts for observability and replay
* keep retrieval results distinct from memory in both structure and semantics

---

## 8. Core Invariants

The RAG Infrastructure must obey the global platform invariants.

Additional retrieval-specific invariants:

1. **RAG and memory remain distinct.**  
   RAG is query-time retrieval of indexed knowledge. It is not trusted, lifecycle-managed memory.

2. **Every result has provenance.**  
   Retrieved evidence must carry source refs, retrieval query refs, and document or chunk provenance.

3. **Corpus access boundaries are real.**  
   Metadata filters or relevance scoring must never bypass corpus visibility or policy constraints.

4. **Published retrieval snapshots are replay-visible.**  
   Replay must be able to reference the corpus snapshot and query that produced a result set.

5. **Result packaging is bounded.**  
   Retrieval should return bounded evidence sets rather than arbitrary corpus dumps.

6. **RAG output never rewrites memory semantics.**  
   Retrieved documents may inform runtime or later candidate generation, but they do not directly become memory or override memory.

---

## 9. Corpus and Source Model

The subsystem needs explicit models for corpus identity, source provenance, and retrievable units.

### Corpus model

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `CorpusRef` | `corpusId`, `version` | None | Identifies one logical corpus and one replay-visible version. |
| `SourceRef` | `sourceId`, `sourceType`, `location`, `hash` | None | Tracks the upstream origin of ingested content. |
| `DocumentRecord` | `corpus`, `documentId`, `title`, `source`, `metadata`, `contentHash`, `publishedAt` | None | One canonical normalized document inside a corpus version. |
| `ChunkRecord` | `chunkId`, `documentId`, `sequence`, `textRef`, `metadata` | None | One retrievable unit that always points back to a document and source. |
| `CorpusSnapshotRef` | `snapshotId`, `corpus`, `createdAt` | None | Identifies the exact searchable snapshot used by retrieval and replay. |

### Corpus rules

* every document must belong to a named corpus
* every retrievable chunk must point back to a document and source
* corpus and snapshot refs must be stable enough for replay and audit
* source metadata must remain attached through retrieval and citation packaging

---

## 10. Ingestion and Indexing Contract

Layer 1 requires the subsystem to ingest and index internal or external knowledge.

### 10.1 Ingestion responsibilities

The ingestion path must:

* accept approved knowledge sources
* normalize source content into canonical documents
* create chunk-level retrievable units
* attach metadata for filters and citations
* publish or refresh retrievable corpus snapshots

### 10.2 Ingestion rules

* source provenance must be preserved
* metadata filters must be indexable and query-visible
* corpus refresh must not silently erase replay-visible prior snapshots
* ingesting a document into RAG must not create memory by itself

### 10.3 Ingestion contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `IngestionRequest` | `ingestionId`, `corpus`, `source`, `metadata`, `contentRef`, `occurredAt` | None | `contentRef` points to the raw source payload or canonical intermediate artifact being ingested. |
| `IngestionResult` | `ingestionId`, `snapshot`, `documentIds` | None | Must return the replay-visible snapshot published by the ingestion flow. |

### 10.4 Publishing rules

* ingestion should produce a replay-visible snapshot or update ref
* callers should be able to tell which snapshot a retrieval query searched against
* withdrawn or superseded content should remain distinguishable from currently active content

---

## 11. Retrieval, Filtering, and Reranking

Layer 1 and Layer 1.5 require retrieval, reranking, metadata filtering, and reusable APIs.

### 11.1 Retrieval rules

Retrieval must:

* query indexed knowledge rather than live prompt state
* respect allowed corpus boundaries
* support metadata filtering
* produce bounded candidate sets before reranking

### 11.2 Reranking rules

Reranking must:

* preserve result provenance
* remain bounded and deterministic for a fixed query and snapshot when replaying from stored artifacts
* avoid hiding why top results were selected

### 11.3 Progressive loading

The subsystem should follow the platform progressive-loading principle.

Rules:

* lightweight retrieval metadata should be used to narrow candidates first
* full chunk payloads should be materialized only for the selected result set
* caches may accelerate retrieval and reranking, but must not bypass access filters, metadata filters, or snapshot versioning

### 11.4 Retrieval contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `RetrievalQuery` | `queryId`, `runId`, `userId`, `threadId`, `allowedCorpora`, `text`, `metadataFilters`, `maxResults` | `collaborativeScopeId`, `asOf`, `policyDecisionRef` | Carries the full caller lineage needed for scope-aware retrieval. |
| `RetrievalResult` | `queryId`, `snapshot`, `results` | None | The result snapshot must identify the corpus version actually searched. |

### 11.5 Result selection rules

* retrieval results should favor relevance and access-safe evidence, not corpus size
* duplicate or near-duplicate chunks should not dominate the final result set without reason
* result counts and total evidence size should remain bounded for downstream context assembly

---

## 12. Citation and Evidence Packaging

Layer 1.5 requires citations and source metadata in retrieval outputs.

### Citation rules

Every result package should preserve:

* source ref
* document id
* chunk id
* retrieval query ref
* corpus snapshot ref
* source metadata relevant to human or model inspection

### Evidence rules

* evidence must remain clearly distinguishable from memory
* evidence should be serializable or reference-addressable
* citation packaging must not strip source identity for brevity

### Evidence contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `Citation` | `source`, `documentId`, `chunkId`, `queryId`, `snapshotId`, `snippet` | None | Preserves enough provenance for human inspection and replay. |
| `RetrievedChunk` | `chunkId`, `documentId`, `textRef`, `score`, `metadata`, `citation` | None | `textRef` may point to a stored chunk artifact rather than embedding text inline. |

---

## 13. Policy, Access Control, and Scope Filtering

Retrieval is a read path, but corpus access boundaries still matter.

### Access rules

* retrieval callers must propagate identity and scope metadata
* same-scope or explicitly allowed corpus access follows the normal caller contract
* cross-scope or restricted corpus access must not occur without policy approval
* metadata filters must narrow results only within already-allowed corpus boundaries

### Condition examples

Representative policy conditions may include:

* allowed corpus ids
* allowed metadata filter dimensions
* allowed source classes
* redaction or omission requirements for specific result fields

The subsystem must fail closed if a required access condition cannot be enforced.

---

## 14. Boundary with Memory System

Layer 1.5 requires memory and retrieval to remain distinct.

### Boundary rules

* memory is trusted-at-a-declared-level and lifecycle-managed
* RAG is query-time retrieval of indexed knowledge
* RAG results must not overwrite memory
* memory retrieval and RAG retrieval must remain separately represented in downstream context

### Candidate-generation rule

RAG output may contribute to memory only through an explicit candidate-generation path owned by runtime or another approved subsystem.
Any such candidate must still pass:

* memory validation
* conflict handling
* policy and approval
* provenance preservation

---

## 15. Runtime, Context, Skill, and Subagent Interaction

The RAG Infrastructure does not own runtime orchestration, but it is on the live evidence path.

### Runtime interaction

The Agent Runtime:

* requests retrieval when context needs external or indexed evidence
* remains responsible for checkpointing and orchestration around the run
* keeps memory and RAG logically separate in runtime state

The RAG Infrastructure:

* returns bounded result sets with source metadata and citations
* returns query refs and snapshot refs for replay

### Context Assembly interaction

Context Assembly is responsible for rendering RAG results as the Layer 1.5 `RAG results` evidence layer.
The RAG Infrastructure must therefore return results that preserve:

* source refs
* retrieval query refs
* document and chunk provenance
* enough metadata for inclusion and exclusion reporting

### Skill interaction

Skills may consume RAG evidence or produce retrieval requests through runtime, but they must not mutate retrieval provenance or relabel RAG as memory.

### Subagent interaction

Child runs should receive only the retrieval slices required for the delegated task.

Rules:

* subagent retrieval must remain bounded by delegated scope and task
* unrelated RAG blocks should be excluded from child context by default
* parent and child retrieval results must retain separate query refs and provenance

---

## 16. Replay and Observability

Retrieval is a major audit boundary because evidence selection can materially change model behavior.

### Required logs

The subsystem must emit structured logs for:

* ingestion request receipt
* corpus snapshot publication
* retrieval query receipt
* metadata filter application
* reranking summary
* retrieval result packaging
* access denials or filter rejections

### Required trace spans

At minimum:

* `rag.ingest`
* `rag.snapshot_publish`
* `rag.query`
* `rag.filter`
* `rag.rerank`
* `rag.package_results`

### Replay capture

The subsystem must preserve:

* corpus snapshot ref
* retrieval query ref or hash
* metadata filters
* selected result refs
* citation package refs
* access decision refs when used

### Replay behavior

* replay should prefer stored retrieval snapshots and stored result refs when available
* if live retrieval must be re-executed because original artifacts are missing, replay must mark the result as best-effort rather than authoritative

---

## 17. Configuration Direction

The subsystem must obey the platform configuration precedence contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `maxRetrievalResults` | cap retrieval result count | integer | conservative | system, scope, or run |
| `maxRAGEvidenceTokens` | cap downstream RAG evidence budget | integer | conservative | system, scope, or run |
| `allowMetadataFilterDimensions` | whitelist supported metadata filters | list | conservative | system or scope |
| `enableRetrievalCaching` | allow safe query-result caching within a snapshot | boolean | true | system |
| `allowLiveRetrievalFallbackOnReplay` | permit best-effort live retrieval during replay when artifacts are missing | boolean | false | system |
| `defaultAllowedCorpora` | default corpus set for an agent or scope | list | conservative | scope or agent |
| `ragKillSwitches` | deny selected corpora, sources, or filters | list | empty | system or scope |

### Configuration rules

* all retrieval configuration must declare scope explicitly
* overrides must be traceable and replay-visible
* configuration must not blur the distinction between memory and RAG
* lower-level config must not widen corpus access beyond higher-level policy

---

## 18. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `Ingest` | Normalize approved source content and publish or refresh a searchable snapshot. | `IngestionRequest` | `IngestionResult` |
| `Search` | Query bounded corpora and return replay-visible evidence with citations. | `RetrievalQuery` | `RetrievalResult` |
| `GetSnapshot` | Read one immutable corpus snapshot reference for audit or replay. | `snapshotId` | `CorpusSnapshotRef` |

### Behavioral expectations

* `Ingest` must preserve source provenance and publish replay-visible snapshot refs
* `Search` must enforce corpus boundaries, metadata filters, and result provenance requirements
* `Search` must not claim success before result packaging and snapshot refs are available
* `GetSnapshot` must return the snapshot used by replay or audit flows when referenced by result artifacts

---

## 19. Failure Modes and Recovery

The subsystem must fail closed on unsafe ambiguity and preserve evidence for audit.

| Failure Mode | Detection | Impact | Recovery Strategy |
| --- | --- | --- | --- |
| unknown corpus | query validation failure | retrieval cannot proceed | reject before search |
| source ingestion failure | connector or normalization failure | corpus refresh incomplete | fail ingestion and preserve source ref |
| snapshot publication failure | publish error | retrieval replayability risk | fail closed before marking snapshot active |
| invalid metadata filter | filter validation failure | unsafe or meaningless query | reject query |
| restricted corpus without approval | access validation failure | unsafe data exposure risk | reject query |
| rerank failure | internal processing error | degraded result quality | bounded fallback or fail according to policy |
| citation packaging failure | result assembly error | provenance incomplete | fail closed before success |
| replay artifact missing | artifact lookup failure | exact replay unavailable | mark live rerun as best-effort only if allowed |

### Recovery principles

* fail closed for unsafe access ambiguity
* preserve query and source refs even when retrieval fails
* never return uncited results as if they were replay-authoritative
* prefer bounded degraded retrieval over silent corpus dumps

---

## 20. Final Architectural Position

The RAG Infrastructure should be designed as the platform’s **shared indexed retrieval subsystem**, not as a memory store or prompt-assembly shortcut.

Its authoritative contract is:

* ingest and index external or internal knowledge
* provide reusable retrieval APIs
* support metadata-filtered retrieval and reranking
* return bounded evidence packages with citations and source metadata
* preserve replay-grade query and result artifacts

It must remain separate from:

* platform memory
* runtime orchestration
* context assembly ordering
* policy authoring
* skill or tool execution

That separation keeps retrieval reusable, provenance-rich, clearly distinguishable from memory, and consistent with the Layer 1 and Layer 1.5 contracts.
