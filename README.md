# react-native-sound-level-monitor

A package to dynamically measure sound input level in React Native applications.
Can be used to help user to adjust microphone sensitivity.

## Installation

Choose between `yarn add react-native-sound-level-monitor` or `npm install --save react-native-sound-level-monitor` and then run `pod install`

#### iOS

You need to add a usage description to `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>TEXT HERE</string>
```

#### Android

You need to add a permission to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

#### Installation on Ubuntu

1. Add to package.json: `"desktopExternalModules": [ "node_modules/react-native-sound-level-monitor/desktop" ]`
2. You may need to make QT's multimedia library accessible for linker
   `sudo ln -s $YOUR_QT_DIR/5.9.1/gcc_64/lib/libQt5Multimedia.so /usr/local/lib/libQt5Multimedia.so`

## Usage

```ts
import rnSoundLevelMonitor, {
  SoundLevelResultType
} from 'react-native-sound-level-monitor';

// OPTIONAL (default 250): the rate, in milliseconds, which to check for microphone sound
const monitorInterval = 50;

export const soundLevelMonitor =
  rnSoundLevelMonitor(monitorInterval);

// you can start monitoring anywhere in your code
soundLevelMonitor.start(); // optional argument

// you can stop monitoring anywhere in your code
soundLevelMonitor.stop();

// you can add listeners which will be called on every frame
const removeThisListener = soundLevelMonitor.addListener(
  (data: SoundLevelResultType) => {
    console.log('new frame', data);
  }
);

// you can then remove added listener by calling the returned callback of `addListener`
removeThisListener();
```

#### Full example

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import {
  PERMISSIONS,
  requestMultiple
} from 'react-native-permissions';
import rnSoundLevelMonitor from 'react-native-sound-level-monitor';

const soundLevelMonitor = rnSoundLevelMonitor(50);

const App: React.FunctionComponent = () => {
  const [canProceed, setCanProceed] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const requestPermissions = useCallback(async () => {
    const permissions = await requestMultiple(
      Platform.select({
        ios: [PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE],
        default: [
          PERMISSIONS.ANDROID.CAMERA,
          PERMISSIONS.ANDROID.RECORD_AUDIO
        ]
      })
    );

    setHasChecked(true);

    if (
      (permissions['android.permission.CAMERA'] === 'granted' &&
        permissions['android.permission.RECORD_AUDIO'] ===
          'granted') ||
      (permissions['ios.permission.CAMERA'] === 'granted' &&
        permissions['ios.permission.MICROPHONE'] === 'granted')
    )
      setCanProceed(true);
  }, []);

  useEffect(() => {
    if (!hasChecked) requestPermissions();
  }, [hasChecked, requestPermissions]);

  useEffect(() => {
    const removeListener = soundLevelMonitor.addListener(data => {
      console.log(data);
    });

    return removeListener;
  }, []);

  useEffect(() => {
    if (!canProceed) return;
    soundLevelMonitor.start();
    return soundLevelMonitor.stop;
  }, [canProceed]);

  if (!canProceed) return null;

  return <Text>Monitoring sound</Text>;
};

export default App;
```

## Credits

Originally forked from https://github.com/punarinta/react-native-sound-level. It seems like the original package is no longer being maintained so I forked it and made tons of improvements. Improvements made were also based on the PRs at the time.

- https://github.com/punarinta/react-native-sound-level/pull/24
- https://github.com/punarinta/react-native-sound-level/pull/21
- https://github.com/punarinta/react-native-sound-level/pull/13
