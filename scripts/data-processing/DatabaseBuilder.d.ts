import { ProcessedRecipe } from '../../src/types';
export declare class DatabaseBuilder {
    private dataDir;
    constructor(dataDir?: string);
    buildDatabases(processedRecipes: ProcessedRecipe[]): Promise<void>;
    loadExistingData(): Promise<Record<string, ProcessedRecipe>>;
    private generateStatistics;
    private getCategoryStats;
    private getDifficultyStats;
    private getTagStats;
}
//# sourceMappingURL=DatabaseBuilder.d.ts.map