import {
  NativeModules,
  NativeAppEventEmitter,
  Platform,
  EmitterSubscription
} from 'react-native';

export type SoundLevelMonitorResult = {
  /**
   * @description Frame number
   */
  id: number;

  /**
   * @description Sound level in decibels
   * @description -160 is a silence
   */
  value: number;

  /**
   * @description raw level value, OS-depended
   */
  rawValue: number;
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
  let listeners: Array<(result: SoundLevelMonitorResult) => void> =
    [];

  function callListeners(result: SoundLevelMonitorResult) {
    listeners.forEach(callback => {
      callback(result);
    });
  }

  function start() {
    if (hasStarted) return;
    hasStarted = true;

    if (isDesktop) {
      timer = setInterval(async () => {
        const frame = await SoundLevelModule.measure();
        const data = JSON.parse(frame) as SoundLevelMonitorResult;
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
    return isDesktop
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
    callback: (result: SoundLevelMonitorResult) => void
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
