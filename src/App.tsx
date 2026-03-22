import "./index.css";
import { VehicleSimulation } from "./VehicleSimulation";

export function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#F9FAFB",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#0f172a",
      }}
    >
      <div style={{ width: "100%", maxWidth: "940px", padding: "1rem" }}>
        <VehicleSimulation />
      </div>
    </div>
  );
}

export default App;
