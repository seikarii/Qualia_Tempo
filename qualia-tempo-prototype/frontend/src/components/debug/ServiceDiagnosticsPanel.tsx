/**
 * QUALIA.CODE v1.1 - ServiceDiagnosticsPanel Component
 * Diagnostic panel for validating end-to-end service architecture integration.
 *
 * ARCHITECTURAL IMPROVEMENTS:
 * - Reduced from 128 lines to < 50 lines via Composition Pattern
 * - Extracted 3 focused sub-components (DiagnosticHeader, DiagnosticServiceCard, ArchitectureValidation)
 * - Each sub-component has single responsibility
 * - Complexity reduced from high to minimal
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
 */

import React, { useState } from "react";
import { useServiceHealth } from "../../hooks";
import { useLogger, useTimerService } from "../../services/hooks";
import { DiagnosticHeader } from "./diagnostics/DiagnosticHeader";
import { DiagnosticServiceCard } from "./diagnostics/DiagnosticServiceCard";
import { ArchitectureValidation } from "./diagnostics/ArchitectureValidation";

export const ServiceDiagnosticsPanel: React.FC = () => {
  // QUALIA.CODE COMPLIANCE: Using hooks exclusively - NO direct IoC access
  const serviceStatuses = useServiceHealth(500);
  const logger = useLogger();
  const timerService = useTimerService();

  const [lastManualRefresh, setLastManualRefresh] = useState<Date>(() => timerService.getCurrentDate());

  const handleManualRefresh = () => {
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
      <DiagnosticHeader lastRefresh={lastManualRefresh} onRefresh={handleManualRefresh} />
      {serviceStatuses.map((service, index) => (
        <DiagnosticServiceCard key={index} service={service} />
      ))}
      <ArchitectureValidation />
    </div>
  );
};

export default ServiceDiagnosticsPanel;
