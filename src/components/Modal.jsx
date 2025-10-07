// NameModal.js
import React, { useState } from "react";
import ReactDOM from "react-dom";

function NameModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name);
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return ReactDOM.createPortal(
    <div style={styles.overlay}>
      <div style={styles.modal} className="p-4">
        <h4 className="mb-3 text-center">Enter Your Name</h4>
        <input
          type="text"
          className="form-control mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Your name..."
          autoFocus
        />
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root")
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1050,
  },
  modal: {
    background: "#fff",
    borderRadius: "10px",
    minWidth: "350px",
    maxWidth: "400px",
    boxShadow: "0px 8px 20px rgba(0,0,0,0.3)",
  },
};

export default NameModal;
