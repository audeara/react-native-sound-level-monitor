package com.punarinta.RNSoundLevel;

import android.content.Context;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;

import java.util.Timer;
import java.util.TimerTask;

import android.media.MediaRecorder;
import android.util.Log;
import com.facebook.react.modules.core.DeviceEventManagerModule;

class RNSoundLevelModule extends ReactContextBaseJavaModule {

  private static final String TAG = "RNSoundLevel";

  private Context context;
  private MediaRecorder recorder;
  private boolean isRecording = false;
  private Timer timer;

  public RNSoundLevelModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.context = reactContext;
  }

  @Override
  public String getName() {
    return "RNSoundLevelModule";
  }

  @ReactMethod
  public void start(int monitorInterval, Promise promise) {
    if (isRecording) {
      logAndRejectPromise(promise, "INVALID_STATE", "Please call stop before starting");
      return;
    }

    recorder = new MediaRecorder();
    try {
      recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
      recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
      recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
      recorder.setAudioSamplingRate(22050);
      recorder.setAudioChannels(1);
      recorder.setAudioEncodingBitRate(32000);
      recorder.setOutputFile(this.getReactApplicationContext().getCacheDir().getAbsolutePath() + "/soundlevel");
    } catch(final Exception e) {
      logAndRejectPromise(promise, "COULDNT_CONFIGURE_MEDIA_RECORDER" , "Make sure you've added RECORD_AUDIO permission to your AndroidManifest.xml file " + e.getMessage());
      return;
    }

    try {
      recorder.prepare();
    } catch (final Exception e) {
      logAndRejectPromise(promise, "COULDNT_PREPARE_RECORDING", e.getMessage());
    }

    recorder.start();

    isRecording = true;
    startTimer(monitorInterval);
    promise.resolve(true);
  }

  @ReactMethod
  public void stop(Promise promise) {
    if (!isRecording) {
      logAndRejectPromise(promise, "INVALID_STATE", "Please call start before stopping recording");
      return;
    }

    stopTimer();
    isRecording = false;

    try {
      recorder.stop();
      recorder.release();
    } catch (final RuntimeException e) {
      logAndRejectPromise(promise, "RUNTIME_EXCEPTION", "No valid audio data received. You may be using a device that can't record audio.");
      return;
    } finally {
      recorder = null;
    }

    promise.resolve(true);
  }

  private void startTimer(int monitorInterval) {
    timer = new Timer();

    timer.scheduleAtFixedRate(new TimerTask() {
      @Override
      public void run() {
          WritableMap body = Arguments.createMap();
          double timestamp = System.currentTimeMillis();
          double maxAmplitude = recorder.getMaxAmplitude();

          if (maxAmplitude == 0) {
            body.putDouble("value", -160.0);
          } else {
            double dBFS = 20 * Math.log((Math.abs(maxAmplitude)) / 32768.0);
            body.putDouble("value", dBFS);
          }

          body.putDouble("timestamp", timestamp);
          sendEvent("frame", body);
      }
    }, 0, monitorInterval);
  }

  private void stopTimer() {
    if (timer != null) {
      timer.cancel();
      timer.purge();
      timer = null;
    }
  }

  private void sendEvent(String eventName, Object params) {
    getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
  }

  private void logAndRejectPromise(Promise promise, String errorCode, String errorMessage) {
    Log.e(TAG, errorMessage);
    promise.reject(errorCode, errorMessage);
  }
}