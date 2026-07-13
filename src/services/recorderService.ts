// recorderService.ts — gravação de áudio via expo-av (web e nativo).
//
// Isola toda a interação com microfone/expo-av. O resto do app só vê
// startRecording() / stopRecording() e recebe o áudio pronto em base64.
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface RecordedAudio {
  /** Conteúdo do áudio codificado em base64 (sem prefixo data:). */
  base64: string;
  /** MIME type real do arquivo gravado (varia por plataforma). */
  mimeType: string;
}

let recording: Audio.Recording | null = null;

/** Opções de gravação: m4a/AAC no nativo (aceito pelo Gemini), webm/opus no web. */
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

function mimeTypeForPlatform(uri: string): string {
  if (Platform.OS === 'web') return 'audio/webm';
  if (uri.endsWith('.3gp')) return 'audio/3gpp';
  // Preset HIGH_QUALITY grava .m4a (AAC) em iOS e Android.
  return 'audio/mp4';
}

/** Converte um blob URI (web) em base64 puro. */
async function blobUriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o áudio gravado.'));
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const idx = dataUrl.indexOf('base64,');
      if (idx === -1) {
        reject(new Error('Áudio gravado em formato inesperado.'));
        return;
      }
      resolve(dataUrl.slice(idx + 'base64,'.length));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Pede permissão de microfone e inicia a gravação.
 * Lança erro com mensagem amigável se a permissão for negada.
 */
export async function startRecording(): Promise<void> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error(
      'Permissão de microfone negada. Habilite o microfone nas configurações para agendar por voz.',
    );
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  // Descarta qualquer gravação anterior que tenha ficado pendurada.
  if (recording) {
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // já estava parada — ignorar
    }
    recording = null;
  }

  const { recording: rec } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
  recording = rec;
}

/** Para a gravação em andamento e devolve o áudio em base64. */
export async function stopRecording(): Promise<RecordedAudio> {
  if (!recording) {
    throw new Error('Nenhuma gravação em andamento.');
  }
  const rec = recording;
  recording = null;

  await rec.stopAndUnloadAsync();
  if (Platform.OS !== 'web') {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  }

  const uri = rec.getURI();
  if (!uri) {
    throw new Error('A gravação não produziu áudio. Tente novamente.');
  }

  const mimeType = mimeTypeForPlatform(uri);
  const base64 =
    Platform.OS === 'web'
      ? await blobUriToBase64(uri)
      : await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

  if (!base64) {
    throw new Error('Áudio vazio. Fale mais perto do microfone e tente de novo.');
  }

  return { base64, mimeType };
}

/** Cancela e descarta a gravação em andamento (se houver). */
export async function discardRecording(): Promise<void> {
  if (!recording) return;
  const rec = recording;
  recording = null;
  try {
    await rec.stopAndUnloadAsync();
  } catch {
    // já estava parada — ignorar
  }
}
