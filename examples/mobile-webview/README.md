# Mobile WebView integration

`geeky-webview.html` is self-contained: inline styles, runtime, rig and demo controls. It needs no network request. Load it as an app-owned bundled HTML document using the supported local-content API of your WebView framework. Keep JavaScript enabled, restrict navigation to app-owned content and avoid exposing privileged native functions to arbitrary pages. Test the target device's local-asset policy. This kit does not configure a native application.

After the page's ready event, run a controlled JavaScript call in your own WebView:

```js
window.GeekyBridge.receive({type:'playState',state:'orbit'});
window.GeekyBridge.receive({type:'gaze',degrees:90});
window.GeekyBridge.receive({type:'pause'});
window.GeekyBridge.receive({type:'resume'});
window.GeekyBridge.receive({type:'reducedMotion',value:true});
```

`receive` accepts a command object or its JSON string. Other commands are `{type:'speed',value:1.2}` and `{type:'seek',seconds:1.5}` (seek pauses first). A playState command can include boolean `loop` and numeric `transitionMs`. Null gaze returns natural animation. `getState()` returns the current runtime snapshot. Unknown commands and invalid values throw.

The bridge emits `ready`, `statechange` and non-looping `complete` messages through the first available callback:

1. React Native: `window.ReactNativeWebView.postMessage(JSON.stringify(payload))`
2. WKWebView: `window.webkit.messageHandlers.geeky.postMessage(payload)`
3. Android/custom shell: `window.GeekyNative.postMessage(JSON.stringify(payload))`

Register only the handler your shell uses. Use the ready event as the loading handshake; do not send commands before initialization. Pass native reduced-motion preferences explicitly if your embedded browser does not reflect them. Keep app workflow state independent of animation completion, especially in reduced-motion mode. Pause on app backgrounding and resume intentionally; the page also pauses on `pagehide`.

For a production avatar-only view, remove the demo `<nav>` controls while keeping the `#geeky` host and initialization, or embed the player directly in your app-owned HTML. The standalone demo includes controls deliberately so you can test behavior.

See the guide for official platform documentation links and React Native `source.html` guidance. Native shell code, bridge registration, framework packaging and on-device rendering remain to be implemented and tested in your application.
