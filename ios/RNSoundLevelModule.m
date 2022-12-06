//
//  RNSoundLevelModule.h
//  RNSoundLevelModule
//
//  Created by Vladimir Osipov on 2018-07-09.
//  Copyright (c) 2018 Vladimir Osipov. All rights reserved.
//

#import "RNSoundLevelModule.h"
#import <React/RCTConvert.h>
#import <React/RCTBridge.h>
#import <React/RCTUtils.h>
#import <React/RCTEventDispatcher.h>
#import <AVFoundation/AVFoundation.h>

@implementation RNSoundLevelModule {
  AVAudioRecorder *_audioRecorder;
  id _progressUpdateTimer;
  int _progressUpdateInterval;
  NSDate *_prevProgressUpdateTime;
  AVAudioSession *_recordSession;
}

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE();

- (void)sendProgressUpdate {
  if (!_audioRecorder || !_audioRecorder.isRecording) {
    return;
  }

  if (_prevProgressUpdateTime == nil ||
   (([_prevProgressUpdateTime timeIntervalSinceNow] * -1000.0) >= _progressUpdateInterval)) {
      NSMutableDictionary *body = [[NSMutableDictionary alloc] init];

      long long timestamp = (long long)([[NSDate date] timeIntervalSince1970] * 1000.0);
      [_audioRecorder updateMeters];
      float value = [_audioRecorder peakPowerForChannel: 0];

      [body setObject:[NSNumber numberWithFloat:value] forKey:@"value"];
      [body setObject:[NSNumber numberWithLongLong:timestamp] forKey:@"timestamp"];

      [self.bridge.eventDispatcher sendAppEventWithName:@"frame" body:body];

    _prevProgressUpdateTime = [NSDate date];
  }
}

- (void)stopProgressTimer {
  [_progressUpdateTimer invalidate];
}

- (void)startProgressTimer:(int)monitorInterval {
  _progressUpdateInterval = monitorInterval;

  [self stopProgressTimer];

  _progressUpdateTimer = [CADisplayLink displayLinkWithTarget:self selector:@selector(sendProgressUpdate)];
  [_progressUpdateTimer addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSDefaultRunLoopMode];
}

RCT_EXPORT_METHOD(start:(int)monitorInterval)
{
  NSLog(@"Start Monitoring");
  _prevProgressUpdateTime = nil;
  [self stopProgressTimer];

  NSDictionary *recordSettings = [NSDictionary dictionaryWithObjectsAndKeys:
          [NSNumber numberWithInt:AVAudioQualityLow], AVEncoderAudioQualityKey,
          [NSNumber numberWithInt:kAudioFormatMPEG4AAC], AVFormatIDKey,
          [NSNumber numberWithInt:1], AVNumberOfChannelsKey,
          [NSNumber numberWithFloat:22050.0], AVSampleRateKey,
          nil];

  NSError *error = nil;

  _recordSession = [AVAudioSession sharedInstance];
  [_recordSession setCategory:AVAudioSessionCategoryMultiRoute error:nil];

  NSURL *_tempFileUrl = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:@"temp"]];

  _audioRecorder = [[AVAudioRecorder alloc]
                initWithURL:_tempFileUrl
                settings:recordSettings
                error:&error];

  _audioRecorder.delegate = self;

  if (error) {
      NSLog(@"error: %@", [error localizedDescription]);
    } else {
      [_audioRecorder prepareToRecord];
  }

  _audioRecorder.meteringEnabled = YES;

  [self startProgressTimer:monitorInterval];
  [_recordSession setActive:YES error:nil];
  [_audioRecorder record];
}

RCT_EXPORT_METHOD(stop)
{
  [_audioRecorder stop];
  [_recordSession setCategory:AVAudioSessionCategoryPlayback error:nil];
  _prevProgressUpdateTime = nil;
}

@end
