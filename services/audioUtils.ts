import { AudioTrack } from '../types';

// Constants
const SAMPLE_RATE = 44100;

export const createAudioContext = (): AudioContext => {
  return new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
  });
};

export const decodeAudioFile = async (
  file: File,
  context: AudioContext
): Promise<AudioBuffer> => {
  const arrayBuffer = await file.arrayBuffer();
  return await context.decodeAudioData(arrayBuffer);
};

export const mixAudioTracks = (
  tracks: AudioTrack[],
  context: AudioContext
): AudioBuffer => {
  if (tracks.length === 0) {
    return context.createBuffer(2, SAMPLE_RATE, SAMPLE_RATE); // Empty 1s buffer
  }

  // Calculate total duration
  const totalDuration = tracks.reduce((max, track) => {
    return Math.max(max, track.startTime + track.duration);
  }, 0);

  // Create an empty output buffer (Stereo)
  const outputBuffer = context.createBuffer(
    2,
    Math.ceil(totalDuration * SAMPLE_RATE),
    SAMPLE_RATE
  );

  // Loop through tracks and mix them
  for (const track of tracks) {
    const startSample = Math.floor(track.startTime * SAMPLE_RATE);
    
    // Process each channel (usually 2 for stereo)
    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      
      // If the track is mono, use channel 0 for both output channels
      const trackChannelData = track.buffer.getChannelData(
        channel < track.buffer.numberOfChannels ? channel : 0
      );

      for (let i = 0; i < trackChannelData.length; i++) {
        if (startSample + i < outputData.length) {
          // Simple additive mixing
          outputData[startSample + i] += trackChannelData[i];
        }
      }
    }
  }

  return outputBuffer;
};

// Helper to convert AudioBuffer to WAV Blob for download/playback
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this simple encoder)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(offset, sample, true); // write 16-bit sample
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(offset, data, true);
    offset += 2;
  }

  function setUint32(data: number) {
    view.setUint32(offset, data, true);
    offset += 4;
  }
};
