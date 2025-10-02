/**
 * QUALIA.CODE v1.1 - ServiceDiagnosticsPanel Component
 * Diagnostic panel for validating end-to-end service architecture integration.
 *
 * ARCHITECTURAL VALIDATION:
 * This component serves as the proof-of-concept for the UI → Hooks → Services flow.
 * It exclusively uses hooks to access services, never directly instantiating
 * or accessing the IoC container.
 *
 * ARCHITECTURE EVOLUTION (Event-Driven Pattern):
 * - Uses useServiceHealth() hook for real-time service status monitoring
 * - Hook polls cached service statuses every 500ms (configurable)
 * - Service statuses are populated via ServiceStatusUpdateEvent (push pattern)
 * - No direct service method calls - pure event-driven aggregation
 *
 * PURPOSE: Validate that our IoC and event-driven architecture work correctly
 * in practice by showing real-time service statistics and status information.
 */

import React, { useState } from "react";
import { useServiceHealth } from "../../hooks";
import { useLogger, useTimerService } from "../../services/hooks";

export const ServiceDiagnosticsPanel: React.FC = () => {
  // QUALIA.CODE COMPLIANCE: Using hooks exclusively - NO direct IoC access
  // ARCHITECTURE: Event-driven pattern - useServiceHealth polls cached statuses
  const serviceStatuses = useServiceHealth(500); // Poll every 500ms for near-real-time updates
  const logger = useLogger();
  const timerService = useTimerService();

  const [lastManualRefresh, setLastManualRefresh] = useState<Date>(() => timerService.getCurrentDate());

  const handleManualRefresh = () => {
    // Manual refresh just updates the timestamp - the hook automatically provides fresh data
    setLastManualRefresh(timerService.getCurrentDate());
    logger.info('Manual refresh triggered - displaying current cached service statuses');
  };

  return (
    <div
      style={{
        background: "#1a1a1a",
        color: "#00ff00",
        padding: "20px",
        fontFamily: "monospace",
        border: "2px solid #00ff00",
        margin: "20px",
        borderRadius: "8px",
      }}
    >
      <h2>🔧 SERVICE DIAGNOSTICS PANEL</h2>
      <p style={{ color: "#ffff00" }}>
        QUALIA.CODE v1.1 Event-Driven Architecture | Real-Time Monitoring (500ms polling) | Last Manual Refresh:{" "}
        {lastManualRefresh.toLocaleTimeString()}
      </p>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleManualRefresh}
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

      {serviceStatuses.map((service, index) => (
        <div
          key={index}
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
      ))}

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          background: "#000033",
          border: "1px solid #0066cc",
          borderRadius: "4px",
        }}
      >
        <h4 style={{ color: "#0099ff" }}>🏗️ ARCHITECTURE VALIDATION (Event-Driven Pattern)</h4>
        <ul style={{ color: "#cccccc", fontSize: "12px" }}>
          <li>
            ✅ All services accessed via hooks (NO direct IoC container access)
          </li>
          <li>✅ React functional component pattern</li>
          <li>✅ Type-safe service method invocation</li>
          <li>✅ Real-time service statistics display (500ms polling)</li>
          <li>✅ Event-driven architecture: Services emit ServiceStatusUpdateEvent</li>
          <li>✅ DebugOrchestratorService passively aggregates events (push pattern)</li>
          <li>✅ useServiceHealth() polls cached data (ultra-fast, synchronous)</li>
          <li>✅ Zero coupling: No direct service-to-service method calls</li>
        </ul>
      </div>
    </div>
  );
};

export default ServiceDiagnosticsPanel;
