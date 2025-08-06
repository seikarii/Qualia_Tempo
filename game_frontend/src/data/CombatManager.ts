import type { CombatData } from '../types/CombatData';
import { config } from '../config';

/**
 * Manages combat data, including loading and providing access to it.
 */
export class CombatManager {
    private combatData: Map<string, CombatData> = new Map();

    constructor() {
        // In a real application, you would load these from files.
        // For now, we can hardcode some dummy data or load from a known path.
    }

    /**
     * Loads combat data from a given path.
     * @param path The path to the combat data.
     * @returns The loaded combat data, or undefined if an error occurred.
     */
    public async loadCombatData(path: string): Promise<CombatData | undefined> {
        try {
            const response = await fetch(`${config.COMBAT_DATA_URL}/${path}`);
            if (!response.ok) {
                throw new Error(`Failed to load combat data from ${path}: ${response.statusText}`);
            }
            const data: CombatData = await response.json();
            this.combatData.set(data.id, data);
            return data;
        } catch (error) {
            console.error(`Error loading combat data from ${path}:`, error);
            return undefined;
        }
    }

    /**
     * Gets combat data by its ID.
     * @param id The ID of the combat data.
     * @returns The combat data, or undefined if not found.
     */
    public getCombatData(id: string): CombatData | undefined {
        return this.combatData.get(id);
    }

    /**
     * Gets all combat data IDs.
     * @returns An array of all combat data IDs.
     */
    public getAllCombatIds(): string[] {
        return Array.from(this.combatData.keys());
    }
}
