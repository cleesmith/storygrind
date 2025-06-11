const { GoogleGenAI } = require('@google/genai');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask a question and return a promise
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
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
      console.log(`    State: ${file.state || 'N/A'}`); // Added state if available
      console.log(`    Create Time: ${file.createTime ? new Date(file.createTime).toLocaleString() : 'N/A'}`);
      console.log(`    Update Time: ${file.updateTime ? new Date(file.updateTime).toLocaleString() : 'N/A'}`);
      console.log(`    Expiration Time: ${file.expirationTime ? new Date(file.expirationTime).toLocaleString() : 'N/A'}`);
      console.log(`    SHA256 Hash: ${file.sha256Hash || 'N/A'}`);
      console.log(`    ------------------------------------`);
      files.push(file); // Store for potential use by other functions
    }
    if (!filesFound) {
      console.log("  No files found for this project.");
    }
    return files;
  } catch (listError) {
    console.error(`ERROR: Failed to list project files.`);
    console.error("File listing error details:", listError.message);
    if (listError.stack) console.error("Listing Stack:", listError.stack);
    return []; // Return empty array on error
  } finally {
    console.log(`--- End of File Listing ---`);
  }
}

// async function deleteSpecificFile() {
//   if (!ai || !ai.files || typeof ai.files.delete !== 'function') {
//     console.error("ERROR: AI client or ai.files.delete is not available.");
//     return;
//   }
//   console.log("\n--- Delete a Specific File ---");
//   const currentFiles = await listFiles();
//   if (currentFiles.length === 0) {
//     console.log("No files available to delete.");
//     return;
//   }

//   const fileNameToDelete = await askQuestion("Enter the full 'Name (ID)' of the file to delete (e.g., files/xxxxxxx): ");
//   if (!fileNameToDelete || !fileNameToDelete.startsWith('files/')) {
//     console.log("Invalid file name format. Must start with 'files/'. Aborting deletion.");
//     return;
//   }

//   // Verify the file exists in the list
//   const fileExists = currentFiles.some(f => f.name === fileNameToDelete);
//   if (!fileExists) {
//       console.log(`File with ID '${fileNameToDelete}' not found in the current list. Please check the ID and try again.`);
//       return;
//   }

//   const confirmation = await askQuestion(`Are you sure you want to delete the file '${fileNameToDelete}'? This cannot be undone. (yes/no): `);
//   if (confirmation.toLowerCase() !== 'yes') {
//     console.log("Deletion aborted by user.");
//     return;
//   }

//   try {
//     const deleteParams = { name: fileNameToDelete };
//     console.log("Calling ai.files.delete() with params:", JSON.stringify(deleteParams));
//     await ai.files.delete(deleteParams);
//     console.log(`File ${fileNameToDelete} deleted successfully.`);
//   } catch (deleteError) {
//     console.error(`ERROR: Failed to delete file '${fileNameToDelete}'.`);
//     console.error("File deletion error details:", deleteError.message);
//     if (deleteError.stack) console.error("Deletion Stack:", deleteError.stack);
//   }
//   console.log(`--- End of Specific File Deletion Attempt ---`);
// }

async function deleteAllFiles() {
  if (!ai || !ai.files || typeof ai.files.delete !== 'function' || typeof ai.files.list !== 'function') {
    console.error("ERROR: AI client or ai.files.delete/list is not available.");
    return;
  }
  console.log("\n--- Delete ALL Project Files ---");
  console.warn("WARNING: This action will attempt to delete ALL files associated with your project key.");

  const filesToList = await listFiles(); // List them first
  if (filesToList.length === 0) {
    console.log("No files found to delete.");
    return;
  }

  const count = filesToList.length;
  const confirmPrompt = `You are about to delete ALL ${count} file(s) listed above. This action CANNOT BE UNDONE.
Type 'sure' to confirm: `;
  const confirmation = await askQuestion(confirmPrompt);

  if (confirmation !== 'sure') {
    console.log("Deletion of all files aborted by user.");
    return;
  }

  console.log(`Proceeding with deletion of ${count} file(s)...`);
  let successCount = 0;
  let errorCount = 0;

  for (const file of filesToList) {
    try {
      const deleteParams = { name: file.name };
      // console.log(`Attempting to delete ${file.name}...`); // Can be verbose
      await ai.files.delete(deleteParams);
      console.log(`  Successfully deleted ${file.name}`);
      successCount++;
    } catch (deleteError) {
      console.error(`  ERROR: Failed to delete file '${file.name}'.`);
      console.error("  File deletion error details:", deleteError.message);
      errorCount++;
    }
  }
  console.log("\n--- Summary of Delete All Files ---");
  console.log(`Successfully deleted: ${successCount} file(s)`);
  console.log(`Failed to delete: ${errorCount} file(s)`);
  console.log(`--- End of Delete All Files Operation ---`);
}


async function showMenu() {
  console.log("\nGemini File Manager Menu:");
  console.log("1. List all files");
  // console.log("2. Delete a specific file");
  console.log("2. Delete ALL project files (be sure!)");
  console.log("3. Exit");

  const choice = await askQuestion("Enter your choice (1-3): ");
  return choice;
}

async function runFileManager() {
  await initializeClient();

  let running = true;
  while (running) {
    const choice = await showMenu();
    switch (choice) {
      case '1':
        await listFiles();
        break;
      // case '2':
      //   await deleteSpecificFile();
      //   break;
      case '2':
        await deleteAllFiles();
        break;
      case '3':
        running = false;
        break;
      default:
        console.log("Invalid choice. Please enter a number between 1 and 4.");
    }
  }
  console.log("Exiting Gemini File Manager.");
  rl.close();
}

runFileManager().catch(err => {
  console.error("\n--- A FATAL UNHANDLED ERROR OCCURRED IN FILE MANAGER ---");
  console.error("Error message:", err.message);
  if (err.stack) console.error("Stack trace:", err.stack);
  rl.close();
  process.exit(1);
});
