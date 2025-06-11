// gemini-cache-manager.js
// A utility for managing Gemini API caches

const { GoogleGenAI, createUserContent, createPartFromUri } = require('@google/genai');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask a question and return a promise
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Helper function to format remaining time until cache expiration
function formatRemainingTime(expireTimeStr) {
  if (!expireTimeStr) return "unknown";
  
  const now = new Date();
  const expireTime = new Date(expireTimeStr);
  const remainingMs = expireTime.getTime() - now.getTime();
  
  if (remainingMs <= 0) return "expired";
  
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${remainingHours}h ${remainingMinutes}m`;
}

// Global AI client
let ai;

async function initializeClient() {
  const apiKeyFromEnv = process.env.GEMINI_API_KEY;
  if (!apiKeyFromEnv) {
    console.error("ERROR: GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
  }
  ai = new GoogleGenAI({ apiKey: apiKeyFromEnv });
  console.log("Gemini AI Client Initialized.");
}

async function listCaches() {
  if (!ai || !ai.caches || typeof ai.caches.list !== 'function') {
    console.error("ERROR: AI client or ai.caches.list is not available.");
    return []; // Return empty array on error
  }
  console.log("\n--- Listing all project caches ---");
  try {
    const listParams = { pageSize: 20 }; // Get more caches at once
    const listResponsePager = await ai.caches.list(listParams);

    const caches = [];
    let cachesFound = false;
    for await (const cache of listResponsePager) {
      cachesFound = true;
      const remainingTime = formatRemainingTime(cache.expireTime);
      console.log(`  - Name (ID): ${cache.name}`);
      console.log(`    Model: ${cache.model}`);
      console.log(`    Display Name: ${cache.displayName || 'N/A'}`);
      console.log(`    Expires: ${new Date(cache.expireTime).toLocaleString()} (Remaining: ${remainingTime})`);
      if (cache.ttl) {
        console.log(`    TTL: ${cache.ttl}`);
      }
      console.log(`    ------------------------------------`);
      caches.push(cache); // Store for potential use by other functions
    }
    if (!cachesFound) {
      console.log("  No caches found for this project.");
    }
    return caches;
  } catch (listError) {
    console.error(`ERROR: Failed to list project caches.`);
    console.error("Error details:", listError.message);
    if (listError.stack) console.error("Stack trace:", listError.stack);
    return []; // Return empty array on error
  } finally {
    console.log(`--- End of Cache Listing ---`);
  }
}

async function createNewCache() {
  if (!ai || !ai.caches || typeof ai.caches.create !== 'function' || 
      !ai.files || typeof ai.files.list !== 'function') {
    console.error("ERROR: AI client or required functions are not available.");
    return;
  }
  
  console.log("\n--- Create a new cache ---");
  
  // First, list existing files to select one
  const allFiles = await listFiles();
  if (allFiles.length === 0) {
    console.log("No files available to create a cache. Please upload a file first.");
    return;
  }
  
  // Display a numbered list of files
  console.log("\nAvailable files:");
  allFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} - ${file.displayName || 'No display name'} - Size: ${file.sizeBytes || 'N/A'} bytes`);
  });
  
  const fileChoice = await askQuestion("\nEnter the number of the file to use for the cache: ");
  const fileIndex = parseInt(fileChoice) - 1;
  
  if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= allFiles.length) {
    console.log("Invalid file selection. Cache creation aborted.");
    return;
  }
  
  const selectedFile = allFiles[fileIndex];
  console.log(`\nSelected file: ${selectedFile.name} (${selectedFile.displayName || 'N/A'})`);
  
  // Get the model name
  const modelName = await askQuestion("\nEnter the model name (default: gemini-2.5-pro-preview-05-06): ");
  const finalModelName = modelName || 'gemini-2.5-pro-preview-05-06';
  
  // Get the TTL (time to live)
  const ttlHours = await askQuestion("\nEnter TTL in hours (default: 4): ");
  const parsedTTL = parseInt(ttlHours) || 4;
  const ttlSeconds = parsedTTL * 3600;
  const ttlString = `${ttlSeconds}s`;
  
  // Get a local file path to associate with this cache
  const localFilePath = await askQuestion("\nEnter the full path to the local file (default: none): ");
  
  // Prepare system instruction (base instructions)
  const sysInstruction = await askQuestion("\nEnter system instruction (default: empty): ");
  
  // Create the cache
  try {
    console.log("\nCreating cache...");
    
    const cacheConfig = {
      model: finalModelName,
      config: {
        // IMPORTANT: displayName needs to be INSIDE config for it to show up in listings
        displayName: localFilePath || selectedFile.displayName || selectedFile.name,
        contents: [createUserContent(createPartFromUri(selectedFile.uri, selectedFile.mimeType))],
        systemInstruction: sysInstruction || "",
        ttl: ttlString
      }
    };
    
    console.log("Cache configuration:", JSON.stringify({
      model: cacheConfig.model,
      config: {
        displayName: cacheConfig.config.displayName,
        contents: "[Content from file URI]",
        systemInstruction: sysInstruction ? "[System instruction provided]" : "[No system instruction]",
        ttl: cacheConfig.config.ttl
      }
    }, null, 2));
    
    const createStartTime = new Date();
    const createdCache = await ai.caches.create(cacheConfig);
    const createEndTime = new Date();
    const createDurationSec = (createEndTime.getTime() - createStartTime.getTime()) / 1000;
    
    console.log(`\nCache created successfully in ${createDurationSec.toFixed(2)} seconds:`);
    console.log(`Cache Name (ID): ${createdCache.name}`);
    console.log(`Model: ${createdCache.model}`);
    console.log(`Display Name: ${createdCache.displayName || 'N/A'}`);
    console.log(`Expires: ${new Date(createdCache.expireTime).toLocaleString()}`);
    
    if (createdCache.usageMetadata) {
      console.log(`Input Token Count: ${createdCache.usageMetadata.totalTokenCount || 
                                       createdCache.usageMetadata.cachedContentTokenCount || 'N/A'}`);
    }
    
    return createdCache;
    
  } catch (createError) {
    console.error(`\nERROR: Failed to create cache.`);
    console.error("Error details:", createError.message);
    if (createError.stack) console.error("Stack trace:", createError.stack);
    return null;
  } finally {
    console.log(`--- End of Cache Creation ---`);
  }
}

async function listFiles() {
  if (!ai || !ai.files || typeof ai.files.list !== 'function') {
    console.error("ERROR: AI client or ai.files.list is not available.");
    return []; // Return empty array on error
  }
  console.log("\n--- Listing all project files ---");
  try {
    const listParams = {}; // Default parameters
    const listResponsePager = await ai.files.list(listParams);

    const files = [];
    let filesFound = false;
    for await (const file of listResponsePager) {
      filesFound = true;
      console.log(`  - Name (ID): ${file.name}`);
      console.log(`    Display Name: ${file.displayName || 'N/A'}`);
      console.log(`    URI: ${file.uri}`);
      console.log(`    Size: ${file.sizeBytes || 'N/A'} bytes`);
      console.log(`    MIME Type: ${file.mimeType}`);
      console.log(`    State: ${file.state || 'N/A'}`);
      console.log(`    Create Time: ${file.createTime ? new Date(file.createTime).toLocaleString() : 'N/A'}`);
      console.log(`    Expiration Time: ${file.expirationTime ? new Date(file.expirationTime).toLocaleString() : 'N/A'}`);
      console.log(`    ------------------------------------`);
      files.push(file); // Store for potential use by other functions
    }
    if (!filesFound) {
      console.log("  No files found for this project.");
    }
    return files;
  } catch (listError) {
    console.error(`ERROR: Failed to list project files.`);
    console.error("Error details:", listError.message);
    if (listError.stack) console.error("Stack trace:", listError.stack);
    return []; // Return empty array on error
  } finally {
    console.log(`--- End of File Listing ---`);
  }
}

async function deleteSpecificCache() {
  if (!ai || !ai.caches || typeof ai.caches.delete !== 'function') {
    console.error("ERROR: AI client or ai.caches.delete is not available.");
    return;
  }
  console.log("\n--- Delete a Specific Cache ---");
  const currentCaches = await listCaches();
  if (currentCaches.length === 0) {
    console.log("No caches available to delete.");
    return;
  }

  const cacheNameToDelete = await askQuestion("Enter the full 'Name (ID)' of the cache to delete (e.g., cachedContents/xxxxxxx): ");
  if (!cacheNameToDelete || !cacheNameToDelete.startsWith('cachedContents/')) {
    console.log("Invalid cache name format. Must start with 'cachedContents/'. Aborting deletion.");
    return;
  }

  // Verify the cache exists in the list
  const cacheExists = currentCaches.some(c => c.name === cacheNameToDelete);
  if (!cacheExists) {
      console.log(`Cache with ID '${cacheNameToDelete}' not found in the current list. Please check the ID and try again.`);
      return;
  }

  const confirmation = await askQuestion(`Are you sure you want to delete the cache '${cacheNameToDelete}'? This cannot be undone. (yes/no): `);
  if (confirmation.toLowerCase() !== 'yes') {
    console.log("Deletion aborted by user.");
    return;
  }

  try {
    const deleteParams = { name: cacheNameToDelete };
    console.log("Calling ai.caches.delete() with params:", JSON.stringify(deleteParams));
    await ai.caches.delete(deleteParams);
    console.log(`Cache ${cacheNameToDelete} deleted successfully.`);
  } catch (deleteError) {
    console.error(`ERROR: Failed to delete cache '${cacheNameToDelete}'.`);
    console.error("Cache deletion error details:", deleteError.message);
    if (deleteError.stack) console.error("Deletion Stack:", deleteError.stack);
  }
  console.log(`--- End of Specific Cache Deletion Attempt ---`);
}

async function deleteAllCaches() {
  if (!ai || !ai.caches || typeof ai.caches.delete !== 'function' || typeof ai.caches.list !== 'function') {
    console.error("ERROR: AI client or ai.caches.delete/list is not available.");
    return;
  }
  console.log("\n--- Delete ALL Project Caches ---");
  console.warn("WARNING: This action will attempt to delete ALL caches associated with your project key.");

  const cachesToList = await listCaches(); // List them first
  if (cachesToList.length === 0) {
    console.log("No caches found to delete.");
    return;
  }

  const count = cachesToList.length;
  const confirmPrompt = `You are about to delete ALL ${count} cache(s) listed above. This action CANNOT BE UNDONE.
Type 'sure' to confirm: `;
  const confirmation = await askQuestion(confirmPrompt);

  if (confirmation !== 'sure') {
    console.log("Deletion of all caches aborted by user.");
    return;
  }

  console.log(`Proceeding with deletion of ${count} cache(s)...`);
  let successCount = 0;
  let errorCount = 0;

  for (const cache of cachesToList) {
    try {
      const deleteParams = { name: cache.name };
      // console.log(`Attempting to delete ${cache.name}...`); // Can be verbose
      await ai.caches.delete(deleteParams);
      console.log(`  Successfully deleted ${cache.name}`);
      successCount++;
    } catch (deleteError) {
      console.error(`  ERROR: Failed to delete cache '${cache.name}'.`);
      console.error("  Cache deletion error details:", deleteError.message);
      errorCount++;
    }
  }
  console.log("\n--- Summary of Delete All Caches ---");
  console.log(`Successfully deleted: ${successCount} cache(s)`);
  console.log(`Failed to delete: ${errorCount} cache(s)`);
  console.log(`--- End of Delete All Caches Operation ---`);
}

async function showMenu() {
  console.log("\nGemini Cache Manager Menu:");
  console.log("1. List all caches");
  // console.log("2. Create a new cache");
  // console.log("3. Delete a specific cache");
  console.log("2. Delete ALL project caches (be sure!)");
  // console.log("5. List all files (for reference)");
  console.log("3. Exit");

  const choice = await askQuestion("Enter your choice (1-3): ");
  return choice;
}

async function runCacheManager() {
  await initializeClient();

  let running = true;
  while (running) {
    const choice = await showMenu();
    switch (choice) {
      case '1':
        await listCaches();
        break;
      // case '2':
      //   await createNewCache();
      //   break;
      // case '3':
      //   await deleteSpecificCache();
      //   break;
      case '2':
        await deleteAllCaches();
        break;
      // case '5':
      //   await listFiles();
      //   break;
      case '3':
        running = false;
        break;
      default:
        console.log("Invalid choice. Please enter a number between 1 and 3.");
    }
  }
  console.log("Exiting Gemini Cache Manager.");
  rl.close();
}

runCacheManager().catch(err => {
  console.error("\n--- A FATAL UNHANDLED ERROR OCCURRED IN CACHE MANAGER ---");
  console.error("Error message:", err.message);
  if (err.stack) console.error("Stack trace:", err.stack);
  rl.close();
  process.exit(1);
});
