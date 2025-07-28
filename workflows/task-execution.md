# Workflow: Task Execution

## Objective
Guide complete execution of a development task from start to completion.

## Execution Context
- **New task**: Start implementation from "{{status_notStarted}}"
- **Task resumption**: Continue from current state ({{status_inProgress}}/{{status_test}})
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
- Verify performance requirements

### Acceptance Tests
- Test user scenarios
- Validate against acceptance criteria
- Check compatibility requirements
- Test in different environments

## Phase 4: Finalization and Test Preparation

### Documentation
- Update relevant documentation
- Add inline code comments if necessary
- Update configuration examples
- Record architectural decisions

### Code Review Preparation
- Clean up experimental code
- Ensure consistent formatting
- Add comprehensive tests
- Prepare clear commit messages

### Test List Generation
Based on the task, generate a comprehensive test list including:
- Functional verification tests
- Edge case tests
- Performance tests (if applicable)
- Integration tests
- Regression tests to ensure nothing was broken

## Completion Criteria

### Technical Completion
- All acceptance criteria met
- Code properly tested
- Documentation updated
- No obvious bugs or performance issues

### Process Completion
- All todos marked as completed
- Clear summary of what was implemented
- Test list generated for validation
- Ready for human review and testing

## Status Transition Rules

### IMPORTANT: AI Restrictions
- AI cannot move a task to "{{status_done}}"
- After execution, AI must move task to "{{status_test}}"
- AI must add summary and test list before transition

### Todo-Based Auto-Progression
- Use `progress_todo` tool to mark individual todos as completed
- Task automatically progresses from "{{status_notStarted}}" to "{{status_inProgress}}" when first todo is completed
- Task automatically progresses to "{{status_test}}" when all todos are completed (100%)
- Use `analyze_task_todos` to check overall progress and get recommendations

### Finalization Process
1. Complete implementation and mark all todos as completed
2. Add execution summary to Notion task
3. Add test list to Notion task
4. Status automatically changes to "{{status_test}}" when todos reach 100%
5. Human validation is required to move to "{{status_done}}"

## Workflow Progression Summary
1. AI analyzes task requirements and creates implementation plan
2. AI executes the task step by step, marking todos as completed
3. Progress tracking automatically moves task from "{{status_notStarted}}" to "{{status_inProgress}}"
4. Status automatically changes to "{{status_test}}" when todos reach 100%
5. Human validation is required to move to "{{status_done}}"

## Quality Standards
- Follow established coding standards
- Ensure proper error handling
- Write comprehensive tests
- Document complex logic
- Test after each implementation
- Maintain backward compatibility when possible

## Common Patterns
- Start with the most critical functionality
- Build incrementally and test frequently
- Use established patterns and libraries when available
- Keep changes focused and atomic
- Test edge cases and error conditions

## Test List Template

When task moves to Test status, include:

## 🧪 Tests to Perform

### Functional Tests
- [ ] [Test based on acceptance criterion 1]
- [ ] [Test based on acceptance criterion 2]
- [ ] [Additional functional tests as needed]

### Regression Tests
- [ ] Existing functionality still works
- [ ] No performance degradation
- [ ] No breaking changes introduced
- [ ] Integration points still function

### Edge Cases
- [ ] [Specific edge case 1]
- [ ] [Specific edge case 2]

### Environment Tests
- [ ] Works in development environment
- [ ] Compatible with staging environment
- [ ] Ready for production deployment

## Important Notes
- AI cannot move a task to "{{status_done}}"
- After execution, AI must move task to "{{status_test}}"
- All implementation must be complete before status change
- Testing and validation are human responsibilities

## Auto-Progression Rules
- Task automatically progresses from "{{status_notStarted}}" to "{{status_inProgress}}" when first todo is completed
- Task automatically progresses to "{{status_test}}" when all todos are completed (100%)
- Human validation is required to move to "{{status_done}}"

## Quality Checklist
1. All acceptance criteria addressed
2. Code follows project standards
3. Tests added for new functionality
4. Status automatically changes to "{{status_test}}" when todos reach 100%
5. Human validation is required to move to "{{status_done}}"

## Best Practices
- Test after each implementation
- Commit frequently with clear messages
- Document important decisions
- Follow coding standards
- Ensure all acceptance criteria are met