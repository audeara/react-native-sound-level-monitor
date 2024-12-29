"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
const isDesktop = react_native_1.Platform.OS === 'macos' || react_native_1.Platform.OS === 'windows';
const SoundLevelModule = isDesktop
    ? react_native_1.NativeModules.RNSoundLevel
    : react_native_1.NativeModules.RNSoundLevelModule;
function soundLevelMonitor(
/**
 * @description frame rate interval
 */
monitorInterval = 250) {
    let hasStarted = false;
    let timer;
    let frameSubscription;
    let listeners = [];
    function callListeners(data) {
        listeners.forEach(callback => {
            callback(data);
        });
    }
    function start() {
        if (hasStarted)
            return;
        hasStarted = true;
        if (isDesktop) {
            timer = setInterval(async () => {
                const dataStr = await SoundLevelModule.measure();
                const data = JSON.parse(dataStr);
                callListeners(data);
            }, monitorInterval);
        }
        else {
            frameSubscription = react_native_1.NativeAppEventEmitter.addListener('frame', (data) => {
                callListeners(data);
            });
        }
        // Monitoring interval not supported for Desktop yet. Feel free to add and do a pull request. :)
        return !isDesktop
            ? SoundLevelModule.start(monitorInterval)
            : SoundLevelModule.start();
    }
    function stop() {
        SoundLevelModule.stop();
        if (frameSubscription)
            frameSubscription.remove();
        clearInterval(timer);
        hasStarted = false;
    }
    function addListener(callback) {
        listeners.push(callback);
        return () => {
            const index = listeners.indexOf(callback);
            listeners = listeners.splice(index, 1);
        };
    }
    return { start, stop, addListener };
}
exports.default = soundLevelMonitor;
