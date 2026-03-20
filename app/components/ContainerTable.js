export default function ContainerTable({ containers, onToggle, onRemove }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Image</th>
          <th>Status</th>
          <th>Port</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {containers.map((c) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>
              <code>{c.image}</code>
            </td>
            <td>
              <span className={`status status--${c.status}`}>{c.status}</span>
            </td>
            <td>{c.port}</td>
            <td className="action-btns">
              <button onClick={() => onToggle(c.id)}>
                {c.status === "running" ? "⏹ Stop" : "▶ Start"}
              </button>
              <button className="btn-danger" onClick={() => onRemove(c.id)}>
                🗑
              </button>
            </td>
          </tr>
        ))}
        {containers.length === 0 && (
          <tr>
            <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>
              No containers yet
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
