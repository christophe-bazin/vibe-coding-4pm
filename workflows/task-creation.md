# Workflow: Development Task Creation

## Objective
Create a new development task in Notion with all necessary information.

## Steps

### 1. Requirements Analysis
- Analyze user request to understand the need
- Identify task type (feature, bug, refactoring)
- Evaluate complexity and priority

### 2. Task Creation
- Create a new page in the Notion board
- Define a clear and descriptive title
- Select the appropriate type
- Assign initial status "{{status_notStarted}}"

### 3. Content Structure
- Description: Clear explanation of the problem/need
- Acceptance criteria: List of conditions to consider the task complete
- Implementation steps: Breakdown into sub-tasks
- Technical notes: Relevant technical information

### 4. Templates by Type

#### Feature
```
## Description
[Description of the feature]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Unit tests added
- [ ] Documentation updated

## Implementation Steps
- [ ] Step 1
- [ ] Step 2
- [ ] Tests
- [ ] Review

## Technical Notes
[Technical information, dependencies, etc.]
```

#### Bug
```
## Problem Description
[Description of the bug]

## Reproduction
1. Step 1
2. Step 2
3. Observed result vs expected result

## Correction Criteria
- [ ] Bug fixed
- [ ] Non-regression tests added
- [ ] Verification in test environment

## Investigation
- [ ] Identify root cause
- [ ] Analyze impact
- [ ] Propose solution

## Notes
[Additional information]
```

#### Refactoring
```
## Refactoring Objective
[Why this refactoring is necessary]

## Scope
[Which files/modules are concerned]

## Acceptance Criteria
- [ ] Code refactored
- [ ] Existing tests still pass
- [ ] Performance maintained or improved
- [ ] Documentation updated

## Action Plan
- [ ] Analyze existing code
- [ ] Define new structure
- [ ] Refactor in steps
- [ ] Validate tests

## Risks
[Identified risks and mitigation]
```

## Best Practices
- Use clear and actionable titles
- Break down into logical and testable sub-tasks
- Add all necessary links and references
- Define verifiable acceptance criteria
- Structure content to facilitate execution