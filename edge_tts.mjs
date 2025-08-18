import pkg from '@andresaya/edge-tts';
const { EdgeTTS } = pkg;
import Speaker from 'speaker';
import { Readable } from 'stream';

async function tryAudioFormat(audioData, channels, bitDepth, sampleRate, description) {
    return new Promise((resolve) => {
        console.log(`\nTrying format: ${description}`);
        console.log(`  Channels: ${channels}, Bit Depth: ${bitDepth}, Sample Rate: ${sampleRate}`);
        
        const speaker = new Speaker({
            channels: channels,
            bitDepth: bitDepth,
            sampleRate: sampleRate
        });
        
        const audioStream = Readable.from(audioData);
        audioStream.pipe(speaker);
        
        speaker.on('close', () => {
            console.log(`  Finished playing with ${description}`);
            resolve();
        });
        
        speaker.on('error', (error) => {
            console.error(`  Error with ${description}:`, error.message);
            resolve();
        });
        
        // Give it 3 seconds then move to next format
        setTimeout(() => {
            speaker.end();
            resolve();
        }, 3000);
    });
}

async function readAloudInNodeJs(text, voice) {
    try {
        const client = new EdgeTTS();
        
        console.log('Initial audio format:', client.audio_format);
        
        // Try to set to raw format
        client.audio_format = 'raw';
        console.log('Set audio format to:', client.audio_format);
        
        console.log('Synthesizing speech with voice:', voice);
        await client.synthesize(text, voice);
        
        // Get raw audio data
        console.log('Getting raw audio data...');
        const audioData = await client.toRaw();
        console.log(`Got raw audio data: ${audioData.length} bytes`);
        
        // Calculate some info about the data
        const duration = 2; // Approximate duration in seconds
        console.log('\nAnalyzing audio data:');
        console.log(`Total bytes: ${audioData.length}`);
        
        // Try different common audio formats
        const formats = [
            // Most common Edge TTS formats
            { channels: 1, bitDepth: 16, sampleRate: 16000, desc: "16kHz Mono 16-bit (Edge TTS common)" },
            { channels: 1, bitDepth: 16, sampleRate: 24000, desc: "24kHz Mono 16-bit (Edge TTS HD)" },
            { channels: 1, bitDepth: 16, sampleRate: 48000, desc: "48kHz Mono 16-bit (High quality)" },
            
            // Try stereo versions
            { channels: 2, bitDepth: 16, sampleRate: 16000, desc: "16kHz Stereo 16-bit" },
            { channels: 2, bitDepth: 16, sampleRate: 24000, desc: "24kHz Stereo 16-bit" },
            { channels: 2, bitDepth: 16, sampleRate: 48000, desc: "48kHz Stereo 16-bit" },
            
            // Try 8-bit versions
            { channels: 1, bitDepth: 8, sampleRate: 16000, desc: "16kHz Mono 8-bit" },
            { channels: 1, bitDepth: 8, sampleRate: 8000, desc: "8kHz Mono 8-bit (Phone quality)" },
            
            // Standard audio formats
            { channels: 1, bitDepth: 16, sampleRate: 22050, desc: "22.05kHz Mono 16-bit" },
            { channels: 1, bitDepth: 16, sampleRate: 44100, desc: "44.1kHz Mono 16-bit (CD quality)" },
        ];
        
        console.log('\nTesting different audio formats - listen for clear speech:');
        console.log('=' .repeat(50));
        
        for (const format of formats) {
            // Calculate expected bytes for ~2 seconds of audio
            const expectedBytes = format.sampleRate * format.channels * (format.bitDepth / 8) * duration;
            const ratio = audioData.length / expectedBytes;
            
            // Only try formats that make sense for the data size
            if (ratio > 0.5 && ratio < 2) {
                await tryAudioFormat(
                    audioData,
                    format.channels,
                    format.bitDepth,
                    format.sampleRate,
                    format.desc
                );
                
                console.log('  Expected bytes for 2 sec:', expectedBytes);
                console.log('  Actual/Expected ratio:', ratio.toFixed(2));
                
                // Ask user for feedback
                console.log('\nDid that sound correct? If yes, use these settings:');
                console.log(`  channels: ${format.channels}, bitDepth: ${format.bitDepth}, sampleRate: ${format.sampleRate}`);
                console.log('Press Ctrl+C to stop if you found the right format.\n');
                
                // Wait a bit between tests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('\nFormat testing complete.');
        console.log('If none sounded right, the audio might not be raw PCM.');
        
    } catch (error) {
        console.error('Error with Edge TTS or audio playback:', error);
        throw error;
    }
}

const textToSpeak = "Hello, this is a test of Edge TTS in Node.js.";
const selectedVoice = "en-US-JennyNeural";

readAloudInNodeJs(textToSpeak, selectedVoice)
    .then(() => console.log('Testing completed.'))
    .catch((error) => console.error('An error occurred:', error));
