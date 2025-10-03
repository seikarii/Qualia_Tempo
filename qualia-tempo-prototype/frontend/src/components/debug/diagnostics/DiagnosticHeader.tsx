/**
 * DiagnosticHeader Component
 * 
 * QUALIA.CODE COMPLIANT: Single Responsibility - Renders diagnostic panel header with refresh controls
 */

import React from "react";

interface DiagnosticHeaderProps {
  lastRefresh: Date;
  onRefresh: () => void;
}

export const DiagnosticHeader: React.FC<DiagnosticHeaderProps> = ({ lastRefresh, onRefresh }) => {
  return (
    <>
      <h2>🔧 SERVICE DIAGNOSTICS PANEL</h2>
      <p style={{ color: "#ffff00" }}>
        QUALIA.CODE v1.1 Event-Driven Architecture | Real-Time Monitoring (500ms polling) | Last Manual Refresh:{" "}
        {lastRefresh.toLocaleTimeString()}
      </p>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={onRefresh}
          style={{
            marginRight: "10px",
            padding: "8px 16px",
            background: "#003300",
            border: "1px solid #00ff00",
            color: "#00ff00",
            cursor: "pointer",
          }}
        >
          🔄 Manual Refresh
        </button>
        <span style={{ color: "#cccccc", fontSize: "12px" }}>
          (Auto-refreshing every 500ms from event-driven cache)
        </span>
      </div>
    </>
  );
};
