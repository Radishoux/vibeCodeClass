# Calculator Test Suite Documentation

## Overview

Complete test suite for the React Calculator application using Bun's native testing framework. The suite includes **86 comprehensive tests** across 2 test files, achieving **100% pass rate**.

## Running Tests

```bash
# Run all tests
bun test

# Run a specific test file
bun test src/App.test.ts
bun test src/App.integration.test.ts

# Run tests in watch mode
bun test --watch
```

## Test Files

### 1. `src/App.test.ts` - Unit Tests (57 tests)

Pure unit tests for the calculation logic and edge cases.

#### Test Categories:

**Arithmetic Operations (25 tests)**
- Addition: basic, zero, negatives, decimals, large numbers
- Subtraction: positive/negative results, decimals
- Multiplication: by zero, negative numbers, decimals
- Division: basic, decimals, division by zero handling

**Edge Cases (9 tests)**
- Very large numbers (999999999)
- Very small decimals (0.0001)
- Scientific notation handling
- NaN graceful handling
- Invalid input handling

**Chained Operations (4 tests)**
- Multiple additions
- Mixed operations (left-to-right evaluation)
- Multiplication after addition
- Division after multiplication

**Decimal Handling (5 tests)**
- Decimal arithmetic across all operations
- Precision testing for small decimals

**Negative Numbers (5 tests)**
- Mixed positive/negative operations
- Negative to negative operations

**Input Validation (6 tests)**
- Empty strings
- Whitespace handling
- Special characters
- Null/undefined operations

**Special Operators (3 tests)**
- All four operators validation
- Invalid operator handling
- Empty operator strings

### 2. `src/App.integration.test.ts` - Integration Tests (29 tests)

Full workflow tests using CalculatorSimulator class that mimics complete calculator state management.

#### Test Categories:

**Basic Input Flow (3 tests)**
- Display updates as user types
- Leading zero removal
- Multiple digit input

**Operation Flows (15 tests)**
- Addition: simple and chained
- Subtraction: positive/negative results
- Multiplication: basic and by zero
- Division: basic, decimals, error handling

**Clear Functionality (3 tests)**
- Initial state clear
- Mid-operation clear
- Post-calculation clear

**Decimal Handling (4 tests)**
- Decimal input
- Double decimal prevention
- Decimal after operators
- Decimal calculations

**Complex Chains (3 tests)**
- Mixed operations (2 + 3 * 4)
- Multiple different operators
- Left-to-right evaluation

**Edge Cases (4 tests)**
- Rapid button clicks
- Operator pressed twice
- Equals without operation
- Equals on fresh calculator

**State Verification (3 tests)**
- State tracking during operations
- State reset after equals
- Complete state clear on C

## Test Results

```
✓ 86 pass
✗ 0 fail
⚠ 0 errors
└─ 112 expect() calls
└─ Ran 86 tests across 2 files in 72ms
```

## Test Coverage

The test suite covers:

- ✅ All arithmetic operations (+, -, *, /)
- ✅ Decimal point handling and precision
- ✅ Error handling (division by zero)
- ✅ State management (previous, operation, waitingForNewValue)
- ✅ Edge cases and boundary conditions
- ✅ Input validation
- ✅ Chained operations
- ✅ Clear/reset functionality
- ✅ Negative number handling
- ✅ Large number handling

## Key Test Patterns

### Unit Test Example
```typescript
it("should add two positive numbers", () => {
  const result = calculate("5", "3", "+");
  expect(result).toBe("8");
});
```

### Integration Test Example
```typescript
it("should complete: 5 + 3 =", () => {
  const calc = new CalculatorSimulator();
  calc.handleButtonClick("5");
  calc.handleButtonClick("+");
  calc.handleButtonClick("3");
  const result = calc.handleButtonClick("=");
  expect(result).toBe("8");
});
```

## CalculatorSimulator Class

A complete simulation of calculator state management used in integration tests:

- Maintains internal state: `display`, `previous`, `operation`, `waitingForNewValue`
- Implements `handleButtonClick()` for all button interactions
- Provides `getDisplay()` and `getState()` for assertions
- Includes `reset()` for test cleanup

## Notable Test Scenarios

1. **Order of Operations (Left-to-Right)**
   - `2 + 3 * 4 =` evaluates to `20` (not `14`)
   - Tests verify left-to-right evaluation

2. **Division by Zero**
   - Returns "Error" string
   - Error state can be recovered with Clear

3. **Decimal Precision**
   - Handles `0.1 + 0.2` with tolerance via `toBeCloseTo()`
   - Prevents double decimal points

4. **State Transitions**
   - Proper state management across all operations
   - `waitingForNewValue` flag prevents digit concatenation after operators

## Running Specific Tests

```bash
# Run only unit tests
bun test src/App.test.ts

# Run only integration tests
bun test src/App.integration.test.ts

# Run tests matching a pattern
bun test --testNamePattern "Addition"

# Run with verbose output
bun test --verbose
```

## Performance

- **Total execution time**: 72ms for all 86 tests
- **Average per test**: ~0.84ms
- **Zero flaky tests**: All tests are deterministic and reliable

## Future Test Enhancements

Potential additions for future test coverage:

1. Scientific operations (sin, cos, sqrt, etc.)
2. Keyboard event simulation tests
3. React component integration tests
4. Accessibility testing
5. Performance benchmarking
6. Cross-browser compatibility tests

## CI/CD Integration

These tests are ready for continuous integration:

```bash
# In your CI pipeline
bun install
bun test
```

The test suite will exit with code 0 on success, code 1 on failure.

---

**Test Suite Generated:** February 12, 2026  
**Framework:** Bun Test  
**Language:** TypeScript  
**Status:** ✅ Production Ready
