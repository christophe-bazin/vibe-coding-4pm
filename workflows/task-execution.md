# Workflow: Task Execution

## Objective
Guide complete execution of a development task from start to completion.

## Execution Context
- **New task**: Start implementation from "Not Started"
- **Task resumption**: Continue from current state (In Progress/Test)
- **Modified task**: Resume with new criteria after update

## Before Starting
1. Check current task status
2. Read all content to understand context
3. Identify what has already been done (if resuming)
4. Adapt approach according to progress state

## Phase 1: Preparation

### Task Understanding
- Carefully read description and acceptance criteria
- Identify dependencies and prerequisites
- Clarify ambiguous points if necessary
- Estimate required effort

### Technical Setup
- Verify development environment
- Create git branch if applicable
- Prepare necessary tools
- Check access to required resources

## Phase 2: Development

### Iterative Approach
- Start with most critical elements
- Develop in small verifiable steps
- Test regularly during development
- Commit frequently with clear messages

### Progress Tracking
- Check off sub-tasks as completed
- Document important technical decisions
- Note obstacles and their solutions
- Maintain code quality

## Phase 3: Testing and Validation

### Technical Tests
- Run unit tests
- Check integration tests
- Test edge cases
- Validate performance if necessary

### Functional Validation
- Verify each acceptance criterion
- Test user scenarios
- Validate compatibility
- Document results

## Phase 4: Finalization and Test Preparation

### Code Review (if applicable)
- Prepare code for review
- Document important changes
- Respond to comments
- Make necessary corrections

### Documentation
- Update technical documentation
- Document new endpoints/APIs
- Update user guides
- Add examples if necessary

### Execution Summary
- Add summary of what was implemented
- List modified/created files
- Document technical decisions made
- Note any compromises or limitations

### Test List Generation
- Create comprehensive list of tests to perform
- Include functional tests based on acceptance criteria
- Add necessary regression tests
- Specify edge case test scenarios
- Indicate required test environments

## Problem Management

### Technical Blockers
1. Identify the problem precisely
2. Research solutions (documentation, Stack Overflow, etc.)
3. Experiment with potential solutions
4. Document the chosen solution
5. Escalate if necessary

### Scope Changes
1. Evaluate change impact
2. Discuss with stakeholders
3. Update task accordingly
4. Adjust planning
5. Communicate changes

### Quality Issues
1. Identify problems (tests, review, etc.)
2. Prioritize corrections
3. Fix critical problems
4. Retest after corrections
5. Validate final quality

## Execution Summary Template

```markdown
## 🎯 Execution Summary

### What was implemented
- [2-3 sentence summary of what was done]

### Files modified/created
- `file1.ts` - [Description of changes]
- `file2.js` - [Description of changes]
- `new-file.ts` - [Description of new file]

### Technical decisions
- [Decision 1 and justification]
- [Decision 2 and justification]

### Limitations/Compromises
- [Any limitations or compromises made]
```

## Test List Template

```markdown
## 🧪 Tests to Perform

### Functional Tests
- [ ] [Test based on acceptance criterion 1]
- [ ] [Test based on acceptance criterion 2]
- [ ] [Main workflow test]

### Regression Tests
- [ ] [Verify feature X still works]
- [ ] [Verify integration Y is not broken]

### Edge Cases
- [ ] [Edge case scenario 1]
- [ ] [Edge case scenario 2]
- [ ] [Specific error handling]

### Environment Tests
- [ ] Development tests
- [ ] Staging tests
- [ ] Production verification (if applicable)
```

## Status Transition Rules

### IMPORTANT: AI Restrictions
- AI cannot move a task to "Done"
- After execution, AI must move task to "Test"
- AI must add summary and test list before transition

### Finalization Process
1. Complete implementation
2. Add execution summary to Notion task
3. Add test list to Notion task
4. Change status to "Test"
5. Human validation is required to move to "Done"

## Best Practices
- Follow methodical and structured approach
- Validate each step before moving to next
- Document important technical decisions
- Test after each implementation
- Identify and resolve blockers quickly
- Maintain change traceability