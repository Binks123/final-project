import { RawRecipe } from '../../src/types';
export declare class RecipeParser {
    private readonly howToCookPath;
    constructor(howToCookPath?: string);
    parseAllRecipes(): Promise<RawRecipe[]>;
    private parseCategory;
    private parseRecipeFile;
    private extractDishName;
    private parseMarkdownSections;
    private generateContentHash;
    private getDirectories;
}
//# sourceMappingURL=RecipeParser.d.ts.map