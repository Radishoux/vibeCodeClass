import { describe, it, expect } from "bun:test";

// Extract calculate function for testing
function calculate(prev: string, current: string, op: string | null): string {
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

describe("Calculator - Arithmetic Operations", () => {
  describe("Addition", () => {
    it("should add two positive numbers", () => {
      const result = calculate("5", "3", "+");
      expect(result).toBe("8");
    });

    it("should add zero", () => {
      const result = calculate("5", "0", "+");
      expect(result).toBe("5");
    });

    it("should add two zeros", () => {
      const result = calculate("0", "0", "+");
      expect(result).toBe("0");
    });

    it("should add negative numbers", () => {
      const result = calculate("-5", "3", "+");
      expect(result).toBe("-2");
    });

    it("should add decimal numbers", () => {
      const result = calculate("2.5", "1.5", "+");
      expect(result).toBe("4");
    });

    it("should add large numbers", () => {
      const result = calculate("999999", "1", "+");
      expect(result).toBe("1000000");
    });
  });

  describe("Subtraction", () => {
    it("should subtract two positive numbers", () => {
      const result = calculate("10", "4", "-");
      expect(result).toBe("6");
    });

    it("should produce negative result", () => {
      const result = calculate("5", "10", "-");
      expect(result).toBe("-5");
    });

    it("should subtract zero", () => {
      const result = calculate("10", "0", "-");
      expect(result).toBe("10");
    });

    it("should subtract negative numbers", () => {
      const result = calculate("5", "-3", "-");
      expect(result).toBe("8");
    });

    it("should subtract decimal numbers", () => {
      const result = calculate("5.5", "2.5", "-");
      expect(result).toBe("3");
    });
  });

  describe("Multiplication", () => {
    it("should multiply two positive numbers", () => {
      const result = calculate("7", "6", "*");
      expect(result).toBe("42");
    });

    it("should multiply by zero", () => {
      const result = calculate("5", "0", "*");
      expect(result).toBe("0");
    });

    it("should multiply two zeros", () => {
      const result = calculate("0", "0", "*");
      expect(result).toBe("0");
    });

    it("should multiply negative numbers", () => {
      const result = calculate("-5", "3", "*");
      expect(result).toBe("-15");
    });

    it("should multiply two negative numbers", () => {
      const result = calculate("-5", "-3", "*");
      expect(result).toBe("15");
    });

    it("should multiply decimal numbers", () => {
      const result = calculate("2.5", "4", "*");
      expect(result).toBe("10");
    });
  });

  describe("Division", () => {
    it("should divide two positive numbers", () => {
      const result = calculate("20", "4", "/");
      expect(result).toBe("5");
    });

    it("should divide with decimal result", () => {
      const result = calculate("5", "2", "/");
      expect(result).toBe("2.5");
    });

    it("should divide by one", () => {
      const result = calculate("42", "1", "/");
      expect(result).toBe("42");
    });

    it("should divide zero", () => {
      const result = calculate("0", "5", "/");
      expect(result).toBe("0");
    });

    it("should handle division by zero", () => {
      const result = calculate("5", "0", "/");
      expect(result).toBe("Error");
    });

    it("should handle zero divided by zero", () => {
      const result = calculate("0", "0", "/");
      expect(result).toBe("Error");
    });

    it("should divide negative numbers", () => {
      const result = calculate("-20", "4", "/");
      expect(result).toBe("-5");
    });

    it("should divide two negative numbers", () => {
      const result = calculate("-20", "-4", "/");
      expect(result).toBe("5");
    });

    it("should divide decimal numbers", () => {
      const result = calculate("5.5", "2", "/");
      expect(result).toBe("2.75");
    });
  });
});

describe("Calculator - Edge Cases", () => {
  it("should handle very large numbers", () => {
    const result = calculate("999999999", "1", "+");
    expect(result).toBe("1000000000");
  });

  it("should handle very small decimals", () => {
    const result = calculate("0.0001", "0.0002", "+");
    expect(Number(result)).toBeCloseTo(0.0003, 4);
  });

  it("should handle scientific notation from division", () => {
    const result = calculate("1", "1000000", "/");
    expect(Number(result)).toBeCloseTo(0.000001, 6);
  });

  it("should return current when operation is null", () => {
    const result = calculate("5", "3", null);
    expect(result).toBe("3");
  });

  it("should return current when previous is empty", () => {
    const result = calculate("", "3", "+");
    expect(result).toBe("3");
  });

  it("should handle NaN gracefully", () => {
    const result = calculate("invalid", "3", "+");
    expect(result).toBe("3");
  });

  it("should handle invalid previous number", () => {
    const result = calculate("abc", "5", "+");
    expect(result).toBe("5");
  });

  it("should handle invalid current number", () => {
    const result = calculate("5", "xyz", "+");
    expect(result).toBe("xyz");
  });
});

describe("Calculator - Chained Operations", () => {
  it("should handle multiple additions", () => {
    let result = calculate("2", "3", "+");
    expect(result).toBe("5");
    result = calculate(result, "4", "+");
    expect(result).toBe("9");
  });

  it("should handle mixed operations left to right", () => {
    let result = calculate("10", "5", "+");
    expect(result).toBe("15");
    result = calculate(result, "2", "-");
    expect(result).toBe("13");
  });

  it("should handle multiplication after addition", () => {
    let result = calculate("2", "3", "+");
    expect(result).toBe("5");
    result = calculate(result, "4", "*");
    expect(result).toBe("20");
  });

  it("should handle division after multiplication", () => {
    let result = calculate("5", "4", "*");
    expect(result).toBe("20");
    result = calculate(result, "4", "/");
    expect(result).toBe("5");
  });
});

describe("Calculator - Decimal Handling", () => {
  it("should handle decimal addition", () => {
    const result = calculate("1.5", "2.5", "+");
    expect(result).toBe("4");
  });

  it("should handle decimal subtraction", () => {
    const result = calculate("5.5", "2.5", "-");
    expect(result).toBe("3");
  });

  it("should handle decimal multiplication", () => {
    const result = calculate("2.5", "2", "*");
    expect(result).toBe("5");
  });

  it("should handle decimal division", () => {
    const result = calculate("7.5", "2.5", "/");
    expect(result).toBe("3");
  });

  it("should handle very small decimal precision", () => {
    const result = calculate("0.1", "0.2", "+");
    expect(Number(result)).toBeCloseTo(0.3, 5);
  });
});

describe("Calculator - Negative Numbers", () => {
  it("should add positive to negative", () => {
    const result = calculate("-5", "3", "+");
    expect(result).toBe("-2");
  });

  it("should subtract from negative", () => {
    const result = calculate("-10", "5", "-");
    expect(result).toBe("-15");
  });

  it("should multiply negative by positive", () => {
    const result = calculate("-5", "4", "*");
    expect(result).toBe("-20");
  });

  it("should divide negative by positive", () => {
    const result = calculate("-20", "4", "/");
    expect(result).toBe("-5");
  });

  it("should handle negative divided by negative", () => {
    const result = calculate("-20", "-4", "/");
    expect(result).toBe("5");
  });
});

describe("Calculator - Input Validation", () => {
  it("should handle empty string as previous", () => {
    const result = calculate("", "5", "+");
    expect(result).toBe("5");
  });

  it("should handle empty string as current", () => {
    const result = calculate("5", "", "+");
    expect(result).toBe("");
  });

  it("should handle whitespace as previous", () => {
    const result = calculate("   ", "5", "+");
    expect(result).toBe("5");
  });

  it("should handle special characters", () => {
    const result = calculate("@#$", "5", "+");
    expect(result).toBe("5");
  });

  it("should handle null operation gracefully", () => {
    const result = calculate("5", "3", null);
    expect(result).toBe("3");
  });

  it("should handle undefined operation as null", () => {
    const result = calculate("5", "3", undefined as any);
    expect(result).toBe("3");
  });
});

describe("Calculator - Special Operators", () => {
  it("should handle all four operators", () => {
    const operators = ["+", "-", "*", "/"];
    operators.forEach((op) => {
      if (op === "/") {
        const result = calculate("10", "2", op);
        expect(result).toBe("5");
      } else {
        const result = calculate("10", "5", op);
        expect(typeof result).toBe("string");
      }
    });
  });

  it("should handle invalid operator", () => {
    const result = calculate("5", "3", "%");
    expect(result).toBe("3");
  });

  it("should handle empty operator string", () => {
    const result = calculate("5", "3", "");
    expect(result).toBe("3");
  });
});
