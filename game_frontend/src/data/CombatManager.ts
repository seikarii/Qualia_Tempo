import { CombatData } from './CombatData';

export class CombatManager {
    private combatData: Map<string, CombatData> = new Map();

    constructor() {
        // In a real application, you would load these from files.
        // For now, we can hardcode some dummy data or load from a known path.
    }

    public async loadCombatData(path: string): Promise<CombatData | undefined> {
        try {
            const response = await fetch(path);
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

    public getCombatData(id: string): CombatData | undefined {
        return this.combatData.get(id);
    }

    public getAllCombatIds(): string[] {
        return Array.from(this.combatData.keys());
    }
}
