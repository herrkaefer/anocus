---
title: "Introducing SwiftEdgeTTS"
date: "2025-11-02"
tags: ["Swift", "open source", "TTS", "iOS", "macOS"]
draft: false
---

Have been working on a language learning app on macOS. Realized that there's no usable edge-tts package for Swift. So I made one. [SwiftEdgeTTS](https://github.com/herrkaefer/SwiftEdgeTTS)

It is expected to be working the same way as the Python package [edge-tts](https://github.com/rany2/edge-tts), but without any Python dependencies.

Example usage:

```swift
import SwiftEdgeTTS

let ttsService = EdgeTTSService()
let outputURL = FileManager.default.temporaryDirectory
    .appendingPathComponent("output.mp3")

let audioURL = try await ttsService.synthesize(
    text: "Hello, world!",
    voice: "en-US-JennyNeural",
    outputURL: outputURL
)
```
