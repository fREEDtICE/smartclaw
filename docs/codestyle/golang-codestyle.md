Any GoLang language code in this repository must follow the following style guide.

## 1. Naming conventions

### Package names

Packages are short, lowercase, domain-oriented, and usually singular:

* `compose`
* `schema`
* `callbacks`
* `model`
* `prompt`

### Exported symbols

Exported names are idiomatic Go PascalCase:

* `NewGraph`
* `NewGraphBranch`
* `ConcatMessages`
* `ToolMessage`
* `WithToolName`

Unexported helpers are lower camelCase:

* `newGraph`
* `formatContent`
* `mergeTextParts`
* `uniqueSlice`

### Constants and enums

Enum-like values are strongly typed and named with a type prefix:

* `RoleType` → `Assistant`, `User`, `System`, `Tool`
* `ChatMessagePartType` → `ChatMessagePartTypeText`, `ChatMessagePartTypeImageURL`
* `ToolPartType` → `ToolPartTypeText`, `ToolPartTypeImage`
* `graphRunType` → `runTypePregel`, `runTypeDAG`

### Constructors

Constructors consistently use `NewX`:

* `NewGraph`
* `NewGraphBranch`
* `NewStreamGraphBranch`
* `ToolMessage` is a value constructor
* external examples also use `openai.NewChatModel`, `adk.NewRunner` in the README

### Option helpers

Functional options are consistently named `WithX`:

* `WithToolName`
* `WithNodeName`
* `WithInputKey`
* `WithOutputKey`
* `WithGraphName`
* `WithMaxRunSteps`

## 2. API design conventions

### Context-first

Public operations almost always take `context.Context` as the first parameter:

* graph lambdas: `func(ctx context.Context, input T) ...`
* model methods: `Generate(ctx context.Context, ...)`
* formatting methods: `Format(ctx context.Context, ...)`

### Config structs for complex constructors

For nontrivial constructors, the repo prefers config structs passed by pointer:

* README examples show `openai.NewChatModel(ctx, &openai.ChatModelConfig{...})`
* `adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{...})`
* `deep.New(ctx, &deep.Config{...})`

So the dominant pattern is:

* small customization: functional options
* larger configuration: `*Config` structs

### Generics-heavy API design

The repo leans hard on Go generics for framework surfaces:

* `NewGraph[I, O]()`
* `GraphBranchCondition[T any]`
* `StreamReader[T]`
* generic lambda helpers in comments and tests

If you add framework-level abstractions, generics are preferred over `any` unless dynamic typing is required.

### Strong typing first, `any` as escape hatch

Practical rule:

* prefer concrete generic types
* only use `any` where the API explicitly needs flexibility
* when using `any`, add validation paths and clear errors

## 3. Documentation style

This repo is unusually disciplined about API comments.

Observed pattern:

* exported type/function gets a full sentence summary
* comments often include usage notes
* many exported APIs include runnable examples inside comments
* examples use `// e.g.` blocks

For consistency, new exported APIs should include:

* what it does
* constraints or invariants
* a short example when non-obvious

## 4. Error-handling conventions

### Errors are returned, not hidden

The code is explicit and defensive. It returns descriptive errors for:

* type mismatches
* invalid graph structures
* unknown enum cases
* duplicated mappings
* invalid runtime states

Examples:

* `ErrGraphCompiled`
* `DAGInvalidLoopErr`
* many `fmt.Errorf(...)` branches in `graph.go`

### Sentinel errors for important states

Important reusable errors are declared as package vars:

* `var ErrGraphCompiled = errors.New(...)`
* `var DAGInvalidLoopErr = errors.New(...)`

Use sentinel errors when callers may want to check or wrap them.

### Lowercase error strings

Error strings are idiomatic Go: lowercase, no trailing punctuation.
Examples in `graph.go` and `message.go` follow this consistently.

### Rich contextual messages

The repo likes detailed, context-rich errors:

* include node names
* include types
* include edge endpoints
* include chunk indexes

That means new error text should help debugging immediately, not just say “invalid input”.

## 5. Testing conventions

* Primary assertion style uses `github.com/stretchr/testify/assert`
* Standard Go `testing` is still the test runner
* Some tests also use direct `t.Fatal` in addition to `assert`
* Test names are descriptive and scenario-based:

  * `TestSingleGraph`
  * `TestNestedGraph`
  * `TestValidate`
  * `TestContextCancel`
  * `TestFindLoops`

Testing style:

* table-driven tests are used where appropriate
* focused mock/fake structs are defined inline in test files
* behavior, edge cases, and error paths are tested heavily

Also in `go.mod`, the repo includes:

* `github.com/stretchr/testify`
* `github.com/smartystreets/goconvey`
* `go.uber.org/mock`

From the code I inspected, `testify/assert` is the most visible day-to-day style.

## 6. Library and dependency usage norms

Based on [`go.mod`](https://github.com/cloudwego/eino/blob/main/go.mod) and observed imports:

### Third-party libraries are used for narrowly scoped jobs

The project does not appear to pull in giant helper frameworks indiscriminately. Libraries are used for specific needs:

* `testify` for assertions
* `gonja`, `pyfmt`, `text/template` for templating
* `uuid` for identifiers
* `yaml.v3` for YAML
* `sonic` for JSON performance
* `go-ordered-map` when ordering matters

That suggests a norm of:

* prefer stdlib first
* bring in a dependency only when it clearly improves a bounded concern

### Internal helpers are preferred for framework mechanics

There is substantial use of internal packages:

* `internal`
* `internal/generic`
* `internal/gmap`

This suggests the repo prefers centralizing reusable internal mechanics instead of duplicating utility code across packages.

### Backward compatibility is handled explicitly

The repo keeps deprecated structures with clear `Deprecated:` comments rather than abruptly deleting them. `schema/message.go` contains many examples. So when evolving APIs:

* mark deprecated fields/types clearly
* keep compatibility paths where practical
* steer new code toward the replacement API

### init registration is acceptable for registry wiring

`schema/message.go` uses `init()` to register concat functions in a central registry. So `init()` is accepted here for package-level framework registration, but should likely be limited to that kind of bootstrapping.

## 7. Code structure and implementation style

### Small, layered helpers

Large public functions are often decomposed into targeted helpers:

* `groupOutputParts`
* `mergeTextParts`
* `mergeReasoningParts`
* `formatInputPart`
* `formatMessageInputMedia`

### Public API thin, internal validation deep

Public entry points often delegate to internal validation and execution helpers. `graph.go` is a good example:

* public methods like `AddLambdaNode`, `AddGraphNode`, `AddBranch`
* internal machinery like `addNode`, `addEdgeWithMappings`, `updateToValidateMap`, `validateDAG`

### Compile-time interface assertions

The repo uses interface conformance assertions:

* `var _ MessagesTemplate = &Message{}`
* `var _ MessagesTemplate = MessagesPlaceholder("", false)`

That is a repo-consistent pattern when interface compliance matters.

### Struct embedding is used judiciously

Examples:

* embedded `*genericHelper`
* embedded `MessagePartCommon`

This is used for shared behavior/data, not as an OO substitute.

## 8. Practical conventions an AI Coding Agent should follow

If you want generated code to blend in, do this:

1. Use Go idioms first.
2. Add GoDoc to every exported symbol.
3. Use `context.Context` as the first parameter for operations.
4. Prefer `NewX` constructors and `WithX` functional options.
5. Prefer config structs for complex initialization.
6. Use generics for framework abstractions; avoid `any` unless needed.
7. Return explicit, contextual errors with lowercase messages.
8. Use typed constants instead of raw strings in public APIs.
9. Keep helper functions small and focused.
10. Add tests for happy path, invalid types, invalid topology/state, and cancellation/error flow.
11. Preserve backward compatibility with `Deprecated:` notices when evolving APIs.
12. Use stdlib before adding a dependency; if adding one, keep the scope narrow.
13. Interface-driven. Should defines small, capability-oriented interfaces, then builds orchestration around them. Implementations live behind those interfaces rather than inside concrete monoliths

## 9. Things treat as “strong inference,” not hard law

* `testify/assert` is the default test assertion style
* `goconvey` and `uber/mock` are available but may be less central
* internal utility packages are preferred over ad hoc local helpers
* `init()` is acceptable mainly for registration, not general side effects
