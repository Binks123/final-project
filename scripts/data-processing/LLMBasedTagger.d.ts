import { RawRecipe, ProcessedRecipe } from '../../src/types';
export declare class LLMBasedTagger {
    private configManager;
    private processingConfig;
    constructor();
    tagRecipe(rawRecipe: RawRecipe): Promise<ProcessedRecipe | null>;
    tagRecipesIncremental(rawRecipes: RawRecipe[], existingData?: Record<string, ProcessedRecipe>): Promise<ProcessedRecipe[]>;
    private buildPrompt;
    private estimateDifficulty;
    private delay;
    private generateFallbackTags;
    private getSystemPrompt;
}
//# sourceMappingURL=LLMBasedTagger.d.ts.map