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

  /**
   * @description the current timestamp in milliseconds when the value was taken
   */
  timestamp: number;
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
  let timer: NodeJS.Timeout | undefined;
  let frameSubscription: EmitterSubscription | undefined;
  let listeners: Array<(data: SoundLevelMonitorResult) => void> = [];

  function callListeners(data: SoundLevelMonitorResult) {
    listeners.forEach(callback => {
      callback(data);
    });
  }

  function start() {
    if (hasStarted) return;
    hasStarted = true;

    if (isDesktop) {
      timer = setInterval(async () => {
        const dataStr: string = await SoundLevelModule.measure();
        const data: SoundLevelMonitorResult = JSON.parse(dataStr);
        callListeners(data);
      }, monitorInterval);
    } else {
      frameSubscription = NativeAppEventEmitter.addListener(
        'frame',
        (data: SoundLevelMonitorResult) => {
          callListeners(data);
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

  function addListener(
    callback: (data: SoundLevelMonitorResult) => void
  ) {
    listeners.push(callback);

    return () => {
      const index = listeners.indexOf(callback);
      listeners = listeners.splice(index, 1);
    };
  }

  return { start, stop, addListener };
}

export default soundLevelMonitor;
