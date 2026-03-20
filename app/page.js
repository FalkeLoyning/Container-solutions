"use client";

import { useState } from "react";
import Dashboard from "./components/Dashboard";
import ContainerTable from "./components/ContainerTable";
import NewContainerModal from "./components/NewContainerModal";

const initialContainers = [
  { id: 1, name: "web-server", image: "nginx:1.25", status: "running", port: "8080:80" },
  { id: 2, name: "api-gateway", image: "node:20-alpine", status: "running", port: "3000:3000" },
  { id: 3, name: "redis-cache", image: "redis:7", status: "running", port: "6379:6379" },
  { id: 4, name: "postgres-db", image: "postgres:16", status: "stopped", port: "5432:5432" },
  { id: 5, name: "monitoring", image: "grafana/grafana:latest", status: "running", port: "3001:3000" },
];

const mockImages = 6;
const mockNetworks = 3;

export default function Home() {
  const [containers, setContainers] = useState(initialContainers);
  const [showModal, setShowModal] = useState(false);
  const [nextId, setNextId] = useState(initialContainers.length + 1);

  const running = containers.filter((c) => c.status === "running").length;
  const stopped = containers.filter((c) => c.status === "stopped").length;

  function toggleContainer(id) {
    setContainers((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "running" ? "stopped" : "running" }
          : c
      )
    );
  }

  function removeContainer(id) {
    setContainers((prev) => prev.filter((c) => c.id !== id));
  }

  function addContainer({ name, image, port }) {
    setContainers((prev) => [
      ...prev,
      { id: nextId, name, image, status: "running", port: port || "—" },
    ]);
    setNextId((n) => n + 1);
    setShowModal(false);
  }

  return (
    <div className="app">
      <header>
        <h1>🐳 Container Solutions</h1>
        <p className="subtitle">Mock Frontend – Prototype & Test Ideas</p>
      </header>

      <main>
        <Dashboard
          running={running}
          stopped={stopped}
          images={mockImages}
          networks={mockNetworks}
        />

        <section className="container-list">
          <h2>Containers</h2>
          <div className="actions">
            <button onClick={() => setShowModal(true)}>+ New Container</button>
          </div>
          <ContainerTable
            containers={containers}
            onToggle={toggleContainer}
            onRemove={removeContainer}
          />
        </section>
      </main>

      {showModal && (
        <NewContainerModal
          onClose={() => setShowModal(false)}
          onCreate={addContainer}
        />
      )}
    </div>
  );
}
