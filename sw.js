const CACHE_NAME = "aqhi-cache-v1";

// Files to cache for offline use
const ASSETS = [
  "./",
  "./index.html",
  "./js/main.js",
  "./js/purpleair.js",
  "./js/click_engine.js",
  "./history/sensor_compare.html"
];

// Install
self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("fetch", () => {});


