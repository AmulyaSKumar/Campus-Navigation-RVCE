mergeInto(LibraryManager.library, {
    
    /**
     * JavaScript Geolocation API for WebGL
     * Provides access to browser's geolocation services
     */
    
    // Request geolocation permission
    RequestGeolocationPermission: function() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    SendMessage('ARNavigationManager', 'OnGeolocationPermissionGranted');
                },
                function(error) {
                    SendMessage('ARNavigationManager', 'OnGeolocationPermissionDenied', error.message);
                },
                { enableHighAccuracy: true }
            );
        } else {
            SendMessage('ARNavigationManager', 'OnGeolocationPermissionDenied', 'Geolocation not supported');
        }
    },
    
    // Start watching position
    StartWatchingPosition: function() {
        if ('geolocation' in navigator) {
            window.geolocationWatchId = navigator.geolocation.watchPosition(
                function(position) {
                    var data = JSON.stringify({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        heading: position.coords.heading || 0,
                        speed: position.coords.speed || 0
                    });
                    SendMessage('ARNavigationManager', 'OnPositionUpdate', data);
                },
                function(error) {
                    SendMessage('ARNavigationManager', 'OnPositionError', error.message);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 1000,
                    timeout: 15000
                }
            );
        }
    },
    
    // Stop watching position
    StopWatchingPosition: function() {
        if (window.geolocationWatchId !== undefined) {
            navigator.geolocation.clearWatch(window.geolocationWatchId);
            window.geolocationWatchId = undefined;
        }
    },
    
    /**
     * Device Orientation API for compass heading
     */
    
    // Request device orientation permission (iOS 13+)
    RequestDeviceOrientationPermission: function() {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires explicit permission
            DeviceOrientationEvent.requestPermission()
                .then(function(permissionState) {
                    if (permissionState === 'granted') {
                        SendMessage('ARNavigationManager', 'OnOrientationPermissionGranted');
                        window.startOrientationTracking();
                    } else {
                        SendMessage('ARNavigationManager', 'OnOrientationPermissionDenied');
                    }
                })
                .catch(function(error) {
                    SendMessage('ARNavigationManager', 'OnOrientationPermissionDenied');
                });
        } else {
            // Android and older iOS don't require permission
            SendMessage('ARNavigationManager', 'OnOrientationPermissionGranted');
            window.startOrientationTracking();
        }
    },
    
    // Start orientation tracking
    StartOrientationTracking: function() {
        window.startOrientationTracking = function() {
            var smoothedHeading = 0;
            var SMOOTHING_FACTOR = 0.3;
            var hasAbsoluteOrientation = false;
            
            var handleOrientation = function(event) {
                var heading = null;
                
                // iOS Safari uses webkitCompassHeading
                if (typeof event.webkitCompassHeading !== 'undefined' && event.webkitCompassHeading !== null) {
                    heading = event.webkitCompassHeading;
                }
                // For absolute orientation or regular orientation
                else if (event.alpha !== null) {
                    if (event.absolute === true || hasAbsoluteOrientation) {
                        heading = (360 - event.alpha) % 360;
                    } else {
                        heading = (360 - event.alpha) % 360;
                    }
                }
                
                if (heading !== null) {
                    heading = (heading + 360) % 360;
                    
                    // Apply low-pass filter
                    var diff = heading - smoothedHeading;
                    if (diff > 180) diff -= 360;
                    if (diff < -180) diff += 360;
                    
                    smoothedHeading = (smoothedHeading + diff * SMOOTHING_FACTOR + 360) % 360;
                    
                    SendMessage('ARNavigationManager', 'OnCompassUpdate', smoothedHeading.toString());
                }
            };
            
            // Try absolute orientation first (more accurate on Android)
            if (window.DeviceOrientationAbsoluteEvent) {
                hasAbsoluteOrientation = true;
                window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            } else {
                window.addEventListener('deviceorientation', handleOrientation, true);
            }
            
            window.orientationHandler = handleOrientation;
            window.hasAbsoluteOrientation = hasAbsoluteOrientation;
        };
        
        window.startOrientationTracking();
    },
    
    // Stop orientation tracking
    StopOrientationTracking: function() {
        if (window.orientationHandler) {
            if (window.hasAbsoluteOrientation) {
                window.removeEventListener('deviceorientationabsolute', window.orientationHandler, true);
            } else {
                window.removeEventListener('deviceorientation', window.orientationHandler, true);
            }
            window.orientationHandler = null;
        }
    },
    
    /**
     * Camera access for WebGL
     */
    
    // Request camera permission
    RequestCameraPermission: function() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            })
            .then(function(stream) {
                window.cameraStream = stream;
                SendMessage('WebGLCameraManager', 'OnCameraPermissionGranted');
            })
            .catch(function(error) {
                SendMessage('WebGLCameraManager', 'OnCameraPermissionDenied', error.message);
            });
        } else {
            SendMessage('WebGLCameraManager', 'OnCameraPermissionDenied', 'Camera not supported');
        }
    },
    
    // Stop camera
    StopCamera: function() {
        if (window.cameraStream) {
            window.cameraStream.getTracks().forEach(function(track) {
                track.stop();
            });
            window.cameraStream = null;
        }
    }
});
