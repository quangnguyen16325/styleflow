import { useEffect, useState } from "react";
import { getApiHealth } from "./api";
import "./App.css";

export default function App() {
  const [status, setStatus] = useState("Checking backend...");

  useEffect(() => {
    getApiHealth()
      .then(() => setStatus("Backend connected"))
      .catch(() => setStatus("Backend not reachable"));
  }, []);

  return (
    <main className="app">
      <h1>Order App Base (Web)</h1>
      <p>This is a clean base template.</p>
      <p>Status: {status}</p>
    </main>
  );
}
