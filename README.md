# Wowzawebrtcplayerjmu

## Example

```
<!DOCTYPE html>
<html lang="en">
     <head>
        <meta charset="UTF-8" />
        <title>Wowzawebrtcplayerjmu Wowza WebRTC Player example</title>

        <script src="wowzawebrtcplayerjmu.js"></script> // include palyer

    </head>
    <body>
        <video id="ticon-webrtc-wowza-player" autoplay playsinline muted controls></video>
    </body>

    <script>

         let options = {
            applicationName: "application name", //wowza application name
            streamName: "stream name", //wowza stream name
            wssUrl: "websocket url", //wowza server websocket url
            videoElementId: "video_element_id", //A html5 video element's id in which the video will be played
        };
        let ticonWowZaPlayer = new Wowzawebrtcplayerjmu( options ); //instantiate the Wowzawebrtcplayerjmu class
        ticonWowZaPlayer.init(); //initialize the Wowzawebrtcplayerjmu class

    </script>
</html>
```
