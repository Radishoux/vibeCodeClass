import { describe, it, expect } from "bun:test";

/**
 * Utility functions for calculator state simulation
 */

class CalculatorSimulator {
  private display: string = "0";
  private previous: string | null = null;
  private operation: string | null = null;
  private waitingForNewValue: boolean = false;

  private calculate(prev: string, current: string, op: string | null): string {
    if (!op || !prev) return current;

    const prevNum = parseFloat(prev);
    const currNum = parseFloat(current);

    if (isNaN(prevNum) || isNaN(currNum)) return current;

    switch (op) {
      case "+":
        return (prevNum + currNum).toString();
      case "-":
        return (prevNum - currNum).toString();
      case "*":
        return (prevNum * currNum).toString();
      case "/":
        return currNum === 0 ? "Error" : (prevNum / currNum).toString();
      default:
        return current;
    }
  }

  handleButtonClick(label: string): string {
    // Handle digit input
    if (label >= "0" && label <= "9") {
      if (this.waitingForNewValue) {
        this.display = label;
        this.waitingForNewValue = false;
      } else {
        this.display = this.display === "0" ? label : this.display + label;
      }
      return this.display;
    }

    // Handle decimal point
    if (label === ".") {
      if (this.waitingForNewValue) {
        this.display = "0.";
        this.waitingForNewValue = false;
      } else if (!this.display.includes(".")) {
        this.display = this.display + ".";
      }
      return this.display;
    }

    // Handle clear
    if (label === "C") {
      this.display = "0";
      this.previous = null;
      this.operation = null;
      this.waitingForNewValue = false;
      return this.display;
    }

    // Handle operators
    if (["+", "-", "*", "/"].includes(label)) {
      if (this.operation && this.previous && !this.waitingForNewValue) {
        const result = this.calculate(this.previous, this.display, this.operation);
        this.display = result === "Error" ? "Error" : result;
        this.previous = result;
      } else {
        this.previous = this.display;
      }
      this.operation = label;
      this.waitingForNewValue = true;
      return this.display;
    }

    // Handle equals
    if (label === "=") {
      if (this.operation && this.previous) {
        const result = this.calculate(this.previous, this.display, this.operation);
        this.display = result;
        this.previous = null;
        this.operation = null;
        this.waitingForNewValue = true;
      }
      return this.display;
    }

    return this.display;
  }

  getDisplay(): string {
    return this.display;
  }

  getState() {
    return {
      display: this.display,
      previous: this.previous,
      operation: this.operation,
      waitingForNewValue: this.waitingForNewValue,
    };
  }

  reset() {
    this.display = "0";
    this.previous = null;
    this.operation = null;
    this.waitingForNewValue = false;
  }
}

describe("Calculator Integration Tests", () => {
  describe("Basic Input Flow", () => {
    it("should display input as user types", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      expect(calc.getDisplay()).toBe("5");
      calc.handleButtonClick("3");
      expect(calc.getDisplay()).toBe("53");
    });

    it("should remove leading zero on first digit", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      expect(calc.getDisplay()).toBe("5");
    });

    it("should allow multiple digits", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("1");
      calc.handleButtonClick("2");
      calc.handleButtonClick("3");
      expect(calc.getDisplay()).toBe("123");
    });
  });

  describe("Addition Flow", () => {

    it("should complete: 5 + 3 =", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      expect(calc.getDisplay()).toBe("5");
      calc.handleButtonClick("3");
      expect(calc.getDisplay()).toBe("3");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("8");
    });

    it("should handle chain: 5 + 3 + 2 =", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      calc.handleButtonClick("3");
      calc.handleButtonClick("+");
      expect(calc.getDisplay()).toBe("8");
      calc.handleButtonClick("2");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("10");
    });
  });

  describe("Subtraction Flow", () => {

    it("should complete: 10 - 4 =", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("1");
      calc.handleButtonClick("0");
      calc.handleButtonClick("-");
      calc.handleButtonClick("4");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("6");
    });

    it("should handle negative result", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("-");
      calc.handleButtonClick("1");
      calc.handleButtonClick("0");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("-5");
    });
  });

  describe("Multiplication Flow", () => {

    it("should complete: 7 * 6 =", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("7");
      calc.handleButtonClick("*");
      calc.handleButtonClick("6");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("42");
    });

    it("should handle multiplication by zero", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("*");
      calc.handleButtonClick("0");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("0");
    });
  });

  describe("Division Flow", () => {

    it("should complete: 20 / 4 =", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("2");
      calc.handleButtonClick("0");
      calc.handleButtonClick("/");
      calc.handleButtonClick("4");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("5");
    });

    it("should handle division by zero with error", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("/");
      calc.handleButtonClick("0");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("Error");
    });

    it("should handle decimal result", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("/");
      calc.handleButtonClick("2");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("2.5");
    });
  });

  describe("Clear Functionality", () => {

    it("should clear initial state", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("C");
      expect(calc.getDisplay()).toBe("0");
    });

    it("should clear mid-operation", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      calc.handleButtonClick("C");
      expect(calc.getDisplay()).toBe("0");
      const state = calc.getState();
      expect(state.previous).toBeNull();
      expect(state.operation).toBeNull();
    });

    it("should clear after equals", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      calc.handleButtonClick("3");
      calc.handleButtonClick("=");
      calc.handleButtonClick("C");
      expect(calc.getDisplay()).toBe("0");
    });
  });

  describe("Decimal Point Handling", () => {

    it("should add decimal to number", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("3");
      calc.handleButtonClick(".");
      calc.handleButtonClick("1");
      calc.handleButtonClick("4");
      expect(calc.getDisplay()).toBe("3.14");
    });

    it("should prevent double decimal", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("3");
      calc.handleButtonClick(".");
      calc.handleButtonClick("1");
      calc.handleButtonClick(".");
      expect(calc.getDisplay()).toBe("3.1");
    });

    it("should add decimal after operator", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      calc.handleButtonClick(".");
      calc.handleButtonClick("5");
      expect(calc.getDisplay()).toBe("0.5");
    });

    it("should calculate with decimals: 2.5 + 1.5 =", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("2");
      calc.handleButtonClick(".");
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      calc.handleButtonClick("1");
      calc.handleButtonClick(".");
      calc.handleButtonClick("5");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("4");
    });
  });

  describe("Complex Operation Chains", () => {

    it("should handle: 2 + 3 * 4 = (left to right: 5 * 4 = 20)", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("2");
      calc.handleButtonClick("+");
      calc.handleButtonClick("3");
      calc.handleButtonClick("*");
      expect(calc.getDisplay()).toBe("5");
      calc.handleButtonClick("4");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("20");
    });

    it("should handle: 100 - 20 / 5 = (left to right: 80 / 5 = 16)", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("1");
      calc.handleButtonClick("0");
      calc.handleButtonClick("0");
      calc.handleButtonClick("-");
      calc.handleButtonClick("2");
      calc.handleButtonClick("0");
      calc.handleButtonClick("/");
      expect(calc.getDisplay()).toBe("80");
      calc.handleButtonClick("5");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("16");
    });

    it("should handle multiple different operators", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("1");
      calc.handleButtonClick("0");
      calc.handleButtonClick("+");
      calc.handleButtonClick("5");
      calc.handleButtonClick("-");
      expect(calc.getDisplay()).toBe("15");
      calc.handleButtonClick("3");
      calc.handleButtonClick("*");
      expect(calc.getDisplay()).toBe("12");
      calc.handleButtonClick("2");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("24");
    });
  });

  describe("Edge Cases in Full Flow", () => {

    it("should handle rapid button clicks", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("5");
      calc.handleButtonClick("5");
      expect(calc.getDisplay()).toBe("555");
    });

    it("should handle operator pressed twice", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      calc.handleButtonClick("+");
      const state = calc.getState();
      expect(state.operation).toBe("+");
      expect(state.waitingForNewValue).toBe(true);
    });

    it("should handle equals without operation", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      const result = calc.handleButtonClick("=");
      expect(result).toBe("5");
    });

    it("should handle equals on new calculator", () => {
      const calc = new CalculatorSimulator();
      const result = calc.handleButtonClick("=");
      expect(result).toBe("0");
    });
  });

  describe("State Verification", () => {

    it("should track state during addition", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      let state = calc.getState();
      expect(state.previous).toBe("5");
      expect(state.operation).toBe("+");
      expect(state.waitingForNewValue).toBe(true);

      calc.handleButtonClick("3");
      state = calc.getState();
      expect(state.waitingForNewValue).toBe(false);
    });

    it("should reset state after equals", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      calc.handleButtonClick("3");
      calc.handleButtonClick("=");
      const state = calc.getState();
      expect(state.previous).toBeNull();
      expect(state.operation).toBeNull();
      expect(state.waitingForNewValue).toBe(true);
    });

    it("should clear all state on C", () => {
      const calc = new CalculatorSimulator();
      calc.handleButtonClick("5");
      calc.handleButtonClick("+");
      calc.handleButtonClick("3");
      calc.handleButtonClick("C");
      const state = calc.getState();
      expect(state.display).toBe("0");
      expect(state.previous).toBeNull();
      expect(state.operation).toBeNull();
      expect(state.waitingForNewValue).toBe(false);
    });
  });
});
