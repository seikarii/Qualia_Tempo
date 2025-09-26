import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import QualiaMainMenu from "../components/QualiaMainMenu";
import { useService } from "../services/hooks";
import { TYPES } from "../services/inversify.types";
import type { IEventBus } from "../services/interfaces/IEventBus";

// Mock the hooks
vi.mock("../services/hooks");

// Mock framer-motion to avoid animation complexities in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock services
const mockEventBus = {
  emit: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockReturnValue('listener-id'),
  unsubscribe: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
  getStats: vi.fn().mockReturnValue({
    totalListeners: 0,
    eventTypes: [],
    historySize: 0,
    isDestroyed: false,
  }),
};

describe('QualiaMainMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the useService hook to return our mock services
    (useService as any).mockImplementation((type: symbol) => {
      if (type === TYPES.IEventBus) {
        return mockEventBus;
      }
      throw new Error(`Unmocked service type: ${type.toString()}`);
    });
  });

  test('renders main menu with title and start button', () => {
    render(<QualiaMainMenu />);

    // Check for QUALIA and TEMPO separately since they're in separate spans
    expect(screen.getByText('QUALIA')).toBeTruthy();
    expect(screen.getByText('TEMPO')).toBeTruthy();
    expect(screen.getByText('INITIATE NEURAL SYNC')).toBeTruthy();
    expect(screen.getByText('IMMERSE IN GPU-RENDERED QUALIA')).toBeTruthy();
  });

  test('uses IoC container services instead of direct instantiation', () => {
    render(<QualiaMainMenu />);

    // Verify that services are resolved via useService hook
    expect(useService).toHaveBeenCalledWith(TYPES.IEventBus);
  });

  test('integrates with EventBus for game state management', async () => {
    render(<QualiaMainMenu />);

    const startButton = screen.getByText('INITIATE NEURAL SYNC');
    expect(startButton).toBeTruthy();
    
    fireEvent.click(startButton);

    // Wait for the emit call to be made
    await waitFor(() => {
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PlayerAction',
          action: 'StartGame',
          source: 'QualiaMainMenu'
        })
      );
    }, { timeout: 1000 });
  });
});