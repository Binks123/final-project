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
const dotenv = __importStar(require("dotenv"));
const RecipeParser_1 = require("./data-processing/RecipeParser");
const LLMBasedTagger_1 = require("./data-processing/LLMBasedTagger");
const DatabaseBuilder_1 = require("./data-processing/DatabaseBuilder");
// Load environment variables
dotenv.config();
async function main() {
    console.log('=== CookingAgent Data Processing Pipeline ===');
    console.log('Starting data processing...\n');
    try {
        // Step 1: Parse all recipes from HowToCook
        console.log('📖 Step 1: Parsing recipes from HowToCook...');
        const parser = new RecipeParser_1.RecipeParser('./HowToCook');
        const rawRecipes = await parser.parseAllRecipes();
        console.log(`Parsed ${rawRecipes.length} recipes\n`);
        // Step 2: Load existing data and tag recipes incrementally
        console.log('🏷️  Step 2: Tagging recipes with LLM...');
        const tagger = new LLMBasedTagger_1.LLMBasedTagger();
        const databaseBuilder = new DatabaseBuilder_1.DatabaseBuilder('./data');
        const existingData = await databaseBuilder.loadExistingData();
        console.log(`Found ${Object.keys(existingData).length} existing processed recipes`);
        const processedRecipes = await tagger.tagRecipesIncremental(rawRecipes, existingData);
        console.log(`Processed ${processedRecipes.length} recipes total\n`);
        // Step 3: Build databases
        console.log('💾 Step 3: Building databases...');
        await databaseBuilder.buildDatabases(processedRecipes);
        console.log('Databases built successfully!\n');
        console.log('✅ Data processing pipeline completed successfully!');
        console.log('You can now run the CookingAgent with: npm run dev');
    }
    catch (error) {
        console.error('❌ Error in data processing pipeline:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Process interrupted by user');
    process.exit(0);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Run the main function
if (require.main === module) {
    main();
}
//# sourceMappingURL=process-data.js.map