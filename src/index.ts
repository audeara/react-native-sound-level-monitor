import {
  NativeModules,
  NativeAppEventEmitter,
  Platform,
  EmitterSubscription
} from 'react-native';

export type SoundLevelMonitorResult = {
  /**
   * @description value in dBFS
   * @description The returned value ranges from –160 dBFS, indicating minimum power, to 0 dBFS, indicating maximum power.
   */
  value: number;
};

const isDesktop =
  Platform.OS === 'macos' || Platform.OS === 'windows';

const SoundLevelModule = isDesktop
  ? NativeModules.RNSoundLevel
  : NativeModules.RNSoundLevelModule;

function soundLevelMonitor(
  /**
   * @description frame rate interval
   */
  monitorInterval = 250
) {
  let hasStarted = false;
  let timer: NodeJS.Timer | undefined;
  let frameSubscription: EmitterSubscription | undefined;
  let listeners: Array<(soundLevel: number) => void> = [];

  function callListeners(soundLevel: number) {
    listeners.forEach(callback => {
      callback(soundLevel);
    });
  }

  function start() {
    if (hasStarted) return;
    hasStarted = true;

    if (isDesktop) {
      timer = setInterval(async () => {
        const frame = await SoundLevelModule.measure();

        const { value } = JSON.parse(
          frame
        ) as SoundLevelMonitorResult;

        callListeners(value);
      }, monitorInterval);
    } else {
      frameSubscription = NativeAppEventEmitter.addListener(
        'frame',
        ({ value }: SoundLevelMonitorResult) => {
          callListeners(value);
        }
      );
    }

    // Monitoring interval not supported for Desktop yet. Feel free to add and do a pull request. :)
    return !isDesktop
      ? SoundLevelModule.start(monitorInterval)
      : SoundLevelModule.start();
  }

  function stop() {
    SoundLevelModule.stop();
    if (frameSubscription) frameSubscription.remove();
    clearInterval(timer);
    hasStarted = false;
  }

  function addListener(callback: (soundLevel: number) => void) {
    listeners.push(callback);

    return () => {
      const index = listeners.indexOf(callback);
      listeners = listeners.splice(index, 1);
    };
  }

  return { start, stop, addListener };
}

export default soundLevelMonitor;
