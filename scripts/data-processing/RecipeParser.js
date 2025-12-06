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
exports.RecipeParser = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class RecipeParser {
    constructor(howToCookPath = './HowToCook') {
        this.howToCookPath = howToCookPath;
    }
    async parseAllRecipes() {
        const dishesPath = path.join(this.howToCookPath, 'dishes');
        const categories = await this.getDirectories(dishesPath);
        const allRecipes = [];
        for (const category of categories) {
            console.log(`Processing category: ${category}`);
            const categoryPath = path.join(dishesPath, category);
            const recipes = await this.parseCategory(category, categoryPath);
            allRecipes.push(...recipes);
        }
        return allRecipes;
    }
    async parseCategory(category, categoryPath) {
        const items = await fs.readdir(categoryPath, { withFileTypes: true });
        const recipes = [];
        for (const item of items) {
            if (item.isFile() && item.name.endsWith('.md')) {
                // Direct markdown file in category
                const recipe = await this.parseRecipeFile(category, path.join(categoryPath, item.name));
                if (recipe)
                    recipes.push(recipe);
            }
            else if (item.isDirectory()) {
                // Directory containing recipe files
                const dirPath = path.join(categoryPath, item.name);
                const dirFiles = await fs.readdir(dirPath);
                const mdFile = dirFiles.find(file => file.endsWith('.md'));
                if (mdFile) {
                    const recipe = await this.parseRecipeFile(category, path.join(dirPath, mdFile));
                    if (recipe)
                        recipes.push(recipe);
                }
            }
        }
        return recipes;
    }
    async parseRecipeFile(category, filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const relativePath = path.relative(this.howToCookPath, filePath);
            // Extract dish name from file path
            const dishName = this.extractDishName(filePath);
            // Parse sections using regex
            const rawContent = this.parseMarkdownSections(content);
            // Generate content hash
            const contentHash = this.generateContentHash(content);
            return {
                dishName,
                sourceFile: relativePath,
                contentHash,
                category,
                rawContent
            };
        }
        catch (error) {
            console.error(`Error parsing recipe file ${filePath}:`, error);
            return null;
        }
    }
    extractDishName(filePath) {
        // Extract dish name from filename, removing .md extension
        const fileName = path.basename(filePath, '.md');
        // If filename is just dish name, return it
        // Otherwise, extract from directory name (for cases like "糖醋排骨/糖醋排骨.md")
        const dirName = path.basename(path.dirname(filePath));
        // Use directory name if it's not a category and file is in subdirectory
        if (dirName && !['aquatic', 'breakfast', 'condiment', 'dessert', 'drink', 'meat_dish', 'semi-finished', 'soup', 'staple', 'vegetable_dish'].includes(dirName)) {
            return dirName;
        }
        return fileName;
    }
    parseMarkdownSections(content) {
        const sections = {};
        // Extract description (content before first ## heading)
        const descMatch = content.match(/^([\s\S]*?)(?=##|$)/);
        if (descMatch) {
            sections.description = descMatch[1].trim();
        }
        // Extract 必备原料和工具 section
        const ingredientsMatch = content.match(/##\s*必备原料和工具\s*\n([\s\S]*?)(?=##|$)/);
        if (ingredientsMatch) {
            sections.ingredientsAndTools = ingredientsMatch[1].trim();
        }
        // Extract 计算 section
        const calculationMatch = content.match(/##\s*计算\s*\n([\s\S]*?)(?=##|$)/);
        if (calculationMatch) {
            sections.calculation = calculationMatch[1].trim();
        }
        // Extract 操作 section
        const stepsMatch = content.match(/##\s*操作\s*\n([\s\S]*?)(?=##|$)/);
        if (stepsMatch) {
            sections.steps = stepsMatch[1].trim();
        }
        // Extract 附加内容 section
        const additionalMatch = content.match(/##\s*附加内容\s*\n([\s\S]*?)(?=##|$)/);
        if (additionalMatch) {
            sections.additionalContent = additionalMatch[1].trim();
        }
        return sections;
    }
    generateContentHash(content) {
        return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
    }
    async getDirectories(dirPath) {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        return items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .filter(name => !name.startsWith('.'));
    }
}
exports.RecipeParser = RecipeParser;
//# sourceMappingURL=RecipeParser.js.map