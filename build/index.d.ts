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
declare function soundLevelMonitor(
/**
 * @description frame rate interval
 */
monitorInterval?: number): {
    start: () => any;
    stop: () => void;
    addListener: (callback: (data: SoundLevelMonitorResult) => void) => () => void;
};
export default soundLevelMonitor;
