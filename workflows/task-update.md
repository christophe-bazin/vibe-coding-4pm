# Workflow: Content Update

## Objective
Update only the content of a development task without changing its status.

## Types of Content Modifications

### 1. Description Modification
- Clarify or specify existing description
- Add missing technical details
- Correct erroneous information
- Improve understanding of the need

### 2. Acceptance Criteria Adjustment
- Add new acceptance criteria
- Modify existing criteria
- Remove non-relevant criteria
- Clarify ambiguous criteria

### 3. Implementation Steps Update
- Add missing technical steps
- Modify implementation approach
- Reorganize steps according to priorities
- Add technical details

### 4. Notes and Context Addition
- Add important technical information
- Document discovered constraints
- Include useful references or links
- Note upstream decisions

## Important Principle
**The task status remains unchanged** during content updates. This workflow serves only to modify task information.

If execution resumption is needed after modification, use the execution workflow.

## Modification Formats

### Description Modification
```markdown
## Updated Description
[New description or additions to existing description]

### Changes Made
- [Describe what was modified]
- [Why this modification was necessary]
```

### Acceptance Criteria Addition
```markdown
## Added Acceptance Criteria
- [ ] [New criterion 1]
- [ ] [New criterion 2]

### Context
[Explain why these criteria were added]
```

### Technical Update
```markdown
## Added Technical Information
### [Concerned Section]
[New technical information]

### Impact
[How this information affects implementation]
```

## Best Practices
- Clearly explain the reasons for modifications
- Maintain overall task consistency
- Document the impact of changes on implementation
- Preserve existing task structure
- Justify important scope changes