import { APITester } from "./APITester";
import { useEffect, useState } from "react";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

// src/App.tsx
export function App() {
  const [display, setDisplay] = useState("0");
  const [previous, setPrevious] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const buttons = [
    "C", "(", ")", "/",
    "7", "8", "9", "*",
    "4", "5", "6", "-",
    "1", "2", "3", "+",
    "0", ".", "=",
  ];

  const calculate = (prev: string, current: string, op: string | null): string => {
    if (!op || !previous) return current;

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
  };

  const handleButtonClick = (label: string) => {
    // Handle digit input
    if (label >= "0" && label <= "9") {
      if (waitingForNewValue) {
        setDisplay(label);
        setWaitingForNewValue(false);
      } else {
        setDisplay((prev) => (prev === "0" ? label : prev + label));
      }
      return;
    }

    // Handle decimal point
    if (label === ".") {
      if (waitingForNewValue) {
        setDisplay("0.");
        setWaitingForNewValue(false);
      } else if (!display.includes(".")) {
        setDisplay((prev) => prev + ".");
      }
      return;
    }

    // Handle clear
    if (label === "C") {
      setDisplay("0");
      setPrevious(null);
      setOperation(null);
      setWaitingForNewValue(false);
      return;
    }

    // Handle parentheses (for future enhancement)
    if (label === "(" || label === ")") {
      return; // Can be enhanced later for complex expressions
    }

    // Handle operators (+, -, *, /)
    if (["+", "-", "*", "/"].includes(label)) {
      if (operation && previous && !waitingForNewValue) {
        const result = calculate(previous, display, operation);
        setDisplay(result === "Error" ? "Error" : result);
        setPrevious(result);
      } else {
        setPrevious(display);
      }
      setOperation(label);
      setWaitingForNewValue(true);
      return;
    }

    // Handle equals
    if (label === "=") {
      if (operation && previous) {
        const result = calculate(previous, display, operation);
        setDisplay(result);
        setPrevious(null);
        setOperation(null);
        setWaitingForNewValue(true);
      }
      return;
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key;

      // Numbers and decimal
      if ((key >= "0" && key <= "9") || key === ".") {
        e.preventDefault();
        handleButtonClick(key);
      }

      // Operators
      if (key === "+" || key === "-" || key === "*" || key === "/") {
        e.preventDefault();
        handleButtonClick(key);
      }

      // Equals
      if (key === "=" || key === "Enter") {
        e.preventDefault();
        handleButtonClick("=");
      }

      // Clear
      if (key === "Escape" || key.toLowerCase() === "c") {
        e.preventDefault();
        handleButtonClick("C");
      }

      // Backspace
      if (key === "Backspace") {
        e.preventDefault();
        setDisplay((prev) => (prev.length === 1 ? "0" : prev.slice(0, -1)));
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [operation, previous, display, waitingForNewValue]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#F9FAFB",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "320px",
          padding: "1.5rem",
          borderRadius: "1rem",
          background: "#020617",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
          border: "1px solid #1f2937",
        }}
      >
        <h1 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600" }}>
          Calculator
        </h1>
        <div
          style={{
            borderRadius: "0.5rem",
            padding: "1rem",
            background: "#0f172a",
            border: "2px solid #1f2937",
            textAlign: "right",
            fontSize: "2rem",
            fontWeight: "500",
            minHeight: "3rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            wordWrap: "break-word",
            overflow: "hidden",
            marginBottom: "1rem",
            color: display === "Error" ? "#ef4444" : "#F9FAFB",
          }}
        >
          {display}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "0.5rem",
          }}
        >
          {buttons.map((label) => (
            <button
              key={label}
              className="calculator-button"
              onClick={() => handleButtonClick(label)}
              style={{
                backgroundColor:
                  label === "=" ? "#3b82f6" :
                  label === "C" ? "#ef4444" :
                  ["+", "-", "*", "/"].includes(label) ? "#8b5cf6" :
                  "#1f2937",
                fontWeight: label === "=" || label === "C" ? "600" : "500",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = "scale(1.05)";
                (e.target as HTMLButtonElement).style.background =
                  label === "=" ? "#2563eb" :
                  label === "C" ? "#dc2626" :
                  ["+", "-", "*", "/"].includes(label) ? "#7c3aed" :
                  "#374151";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = "scale(1)";
                (e.target as HTMLButtonElement).style.background =
                  label === "=" ? "#3b82f6" :
                  label === "C" ? "#ef4444" :
                  ["+", "-", "*", "/"].includes(label) ? "#8b5cf6" :
                  "#1f2937";
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "1rem", textAlign: "center" }}>
          Use keyboard: numbers, +−*/=, Backspace, Escape to clear
        </p>
      </div>
    </div>
  );
}

export default App;
