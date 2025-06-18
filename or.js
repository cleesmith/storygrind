const OpenAI = require('openai');
require('dotenv').config();

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function listModels() {
  try {
    console.log('Listing available models...\n');
    const models = await openrouter.models.list();
    
    const claudeModels = models.data;
    // Filter for Claude models
    // const claudeModels = models.data.filter(model => 
    //   model.id.includes('claude') || model.id.includes('anthropic')
    // );
    
    // Sort models alphabetically by ID
    claudeModels.sort((a, b) => a.id.localeCompare(b.id));
    
    console.log('Claude models available:');
    claudeModels.forEach(model => {
      console.log(`- ${model.id}`);
    });
    
    console.log(`\nTotal models: ${models.data.length}`);
    console.log(`Claude models: ${claudeModels.length}\n`);
    
    return models.data;
  } catch (error) {
    console.error('Error listing models:', error.message);
    return [];
  }
}

async function testStreamingChat() {
  try {
    console.log('Testing streaming chat with claude-sonnet-4 . . .\n');
    
    const stream = await openrouter.chat.completions.create({
      model: "anthropic/claude-sonnet-4",
      messages: [
        {
          role: "user",
          content: "Hello! Can you tell me what 2+2 equals and also mention that you're running on OpenRouter? Please respond in a friendly way."
        }
      ],
      max_tokens: 150,
      stream: true
    });

    console.log('Streaming response:');
    console.log('-------------------');
    
    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        process.stdout.write(content);
        fullResponse += content;
      }
    }
    
    console.log('\n-------------------');
    console.log('\nStreaming test successful! ✅');
    
  } catch (error) {
    console.error('Error in streaming chat:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function main() {
  console.log('OpenRouter API Test (Streaming)\n');
  console.log('===============================\n');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('Error: OPENROUTER_API_KEY not found in environment variables');
    console.log('Please add OPENROUTER_API_KEY to your .env file');
    return;
  }
  
  await listModels();
  // await testStreamingChat();
}

main().catch(console.error);
