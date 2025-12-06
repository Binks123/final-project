"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseBuilder = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class DatabaseBuilder {
    constructor(dataDir = './data') {
        this.dataDir = dataDir;
    }
    async buildDatabases(processedRecipes) {
        console.log(`Building databases for ${processedRecipes.length} recipes...`);
        // Ensure data directory exists
        await fs.mkdir(this.dataDir, { recursive: true });
        // Build recipes_index.json (lightweight for filtering)
        const index = processedRecipes.map(recipe => ({
            dishName: recipe.dishName,
            category: recipe.category,
            difficulty: recipe.difficulty,
            tags: recipe.tags
        }));
        // Build recipes_data.json (complete data keyed by dishName)
        const data = {};
        processedRecipes.forEach(recipe => {
            data[recipe.dishName] = recipe;
        });
        // Write files
        const indexPath = path.join(this.dataDir, 'recipes_index.json');
        const dataPath = path.join(this.dataDir, 'recipes_data.json');
        await Promise.all([
            fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8'),
            fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8')
        ]);
        console.log(`Successfully wrote databases:`);
        console.log(`- ${indexPath} (${index.length} recipes)`);
        console.log(`- ${dataPath} (${Object.keys(data).length} recipes)`);
        // Generate statistics
        await this.generateStatistics(processedRecipes);
    }
    async loadExistingData() {
        try {
            const dataPath = path.join(this.dataDir, 'recipes_data.json');
            const content = await fs.readFile(dataPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            console.log('No existing data found, starting fresh...');
            return {};
        }
    }
    async generateStatistics(recipes) {
        const stats = {
            totalRecipes: recipes.length,
            categories: this.getCategoryStats(recipes),
            difficulty: this.getDifficultyStats(recipes),
            tags: this.getTagStats(recipes),
            generatedAt: new Date().toISOString()
        };
        const statsPath = path.join(this.dataDir, 'statistics.json');
        await fs.writeFile(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
        console.log(`Generated statistics: ${statsPath}`);
        console.log(`Categories: ${Object.keys(stats.categories).join(', ')}`);
        console.log(`Difficulty range: ${Math.min(...Object.keys(stats.difficulty).map(Number))} - ${Math.max(...Object.keys(stats.difficulty).map(Number))}`);
    }
    getCategoryStats(recipes) {
        const stats = {};
        recipes.forEach(recipe => {
            stats[recipe.category] = (stats[recipe.category] || 0) + 1;
        });
        return stats;
    }
    getDifficultyStats(recipes) {
        const stats = {};
        recipes.forEach(recipe => {
            const difficulty = recipe.difficulty || 1;
            stats[difficulty] = (stats[difficulty] || 0) + 1;
        });
        return stats;
    }
    getTagStats(recipes) {
        const stats = {
            taste: {},
            cookingStyle: {},
            season: {},
            suitability: {}
        };
        recipes.forEach(recipe => {
            // Count taste tags
            recipe.tags.taste.forEach(tag => {
                stats.taste[tag] = (stats.taste[tag] || 0) + 1;
            });
            // Count cooking style tags
            recipe.tags.cookingStyle.forEach(tag => {
                stats.cookingStyle[tag] = (stats.cookingStyle[tag] || 0) + 1;
            });
            // Count season tags
            recipe.tags.season.forEach(tag => {
                stats.season[tag] = (stats.season[tag] || 0) + 1;
            });
            // Count suitability tags
            recipe.tags.suitability.forEach(tag => {
                stats.suitability[tag] = (stats.suitability[tag] || 0) + 1;
            });
        });
        return stats;
    }
}
exports.DatabaseBuilder = DatabaseBuilder;
//# sourceMappingURL=DatabaseBuilder.js.map