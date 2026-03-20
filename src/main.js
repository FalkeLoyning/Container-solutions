// Mock data - simulerer backend-data
const mockContainers = [
  { id: 1, name: "web-server", image: "nginx:1.25", status: "running", port: "8080:80" },
  { id: 2, name: "api-gateway", image: "node:20-alpine", status: "running", port: "3000:3000" },
  { id: 3, name: "redis-cache", image: "redis:7", status: "running", port: "6379:6379" },
  { id: 4, name: "postgres-db", image: "postgres:16", status: "stopped", port: "5432:5432" },
  { id: 5, name: "monitoring", image: "grafana/grafana:latest", status: "running", port: "3001:3000" },
];

const mockImages = ["nginx:1.25", "node:20-alpine", "redis:7", "postgres:16", "grafana/grafana:latest", "python:3.12-slim"];
const mockNetworks = ["bridge", "host", "app-network"];

let containers = [...mockContainers];
let nextId = containers.length + 1;

// --- Dashboard ---
function updateDashboard() {
  document.getElementById("running-count").textContent = containers.filter(c => c.status === "running").length;
  document.getElementById("stopped-count").textContent = containers.filter(c => c.status === "stopped").length;
  document.getElementById("images-count").textContent = mockImages.length;
  document.getElementById("networks-count").textContent = mockNetworks.length;
}

// --- Table ---
function renderTable() {
  const tbody = document.getElementById("container-table-body");
  tbody.innerHTML = "";

  containers.forEach(container => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(container.name)}</td>
      <td><code>${escapeHtml(container.image)}</code></td>
      <td><span class="status status--${container.status}">${container.status}</span></td>
      <td>${escapeHtml(container.port || "—")}</td>
      <td class="action-btns">
        ${container.status === "running"
          ? `<button onclick="toggleContainer(${container.id})">⏹ Stop</button>`
          : `<button onclick="toggleContainer(${container.id})">▶ Start</button>`
        }
        <button class="btn-danger" onclick="removeContainer(${container.id})">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Actions ---
window.toggleContainer = function(id) {
  const container = containers.find(c => c.id === id);
  if (container) {
    container.status = container.status === "running" ? "stopped" : "running";
    renderTable();
    updateDashboard();
  }
};

window.removeContainer = function(id) {
  containers = containers.filter(c => c.id !== id);
  renderTable();
  updateDashboard();
};

// --- Dialog ---
const dialog = document.getElementById("new-container-dialog");
const form = document.getElementById("new-container-form");

document.getElementById("btn-add").addEventListener("click", () => dialog.showModal());
document.getElementById("btn-cancel").addEventListener("click", () => dialog.close());

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("input-name").value.trim();
  const image = document.getElementById("input-image").value.trim();
  const port = document.getElementById("input-port").value.trim();

  if (name && image) {
    containers.push({
      id: nextId++,
      name,
      image,
      status: "running",
      port: port || "—",
    });
    renderTable();
    updateDashboard();
    form.reset();
    dialog.close();
  }
});

document.getElementById("btn-refresh").addEventListener("click", () => {
  renderTable();
  updateDashboard();
});

// --- Init ---
renderTable();
updateDashboard();
