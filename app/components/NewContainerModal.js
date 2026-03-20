"use client";

import { useState } from "react";

export default function NewContainerModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [port, setPort] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim() && image.trim()) {
      onCreate({ name: name.trim(), image: image.trim(), port: port.trim() });
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create Container</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              placeholder="my-app"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Image
            <input
              type="text"
              placeholder="nginx:latest"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              required
            />
          </label>
          <label>
            Port
            <input
              type="text"
              placeholder="8080:80"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
