/**
 * DiagnosticServiceCard Component
 * 
 * QUALIA.CODE COMPLIANT: Single Responsibility - Renders a single service diagnostic card
 * Presentational component with no business logic
 */

import React from "react";

interface ServiceStatus {
  name: string;
  isRunning: boolean;
  status: string;
  error?: string;
  stats?: Record<string, unknown>;
}

interface DiagnosticServiceCardProps {
  service: ServiceStatus;
}

export const DiagnosticServiceCard: React.FC<DiagnosticServiceCardProps> = ({ service }) => {
  return (
    <div
      style={{
        marginBottom: "15px",
        padding: "15px",
        border: `1px solid ${service.isRunning ? "#00ff00" : "#ff0000"}`,
        borderRadius: "4px",
        background: service.isRunning ? "#001100" : "#110000",
      }}
    >
      <h3
        style={{
          margin: "0 0 10px 0",
          color: service.isRunning ? "#00ff00" : "#ff0000",
        }}
      >
        {service.isRunning ? "✅" : "❌"} {service.name}
      </h3>

      <p>
        <strong>Status:</strong> {service.status}
      </p>

      {service.error && (
        <p style={{ color: "#ff0000" }}>
          <strong>Error:</strong> {service.error}
        </p>
      )}

      {service.stats && (
        <div>
          <strong>Statistics:</strong>
          <pre
            style={{
              background: "#000000",
              padding: "10px",
              borderRadius: "4px",
              overflow: "auto",
              fontSize: "12px",
              color: "#00cccc",
            }}
          >
            {JSON.stringify(service.stats, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
