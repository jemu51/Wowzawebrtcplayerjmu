class Wowzawebrtcplayerjmu {
    constructor(options = {}) {
        this.applicationName = options.applicationName;
        if (!this.applicationName) {
            throw new Error("applicationName is required");
        }
        this.streamName = options.streamName;
        if (!this.streamName) {
            throw new Error("streamName is required");
        }
        this.wssUrl = options.wssUrl;
        if (!this.wssUrl) {
            throw new Error("wssUrl is required");
        }
        this.wsConnection = null;
        this.videoElement = null;
        this.iceServers = { iceServers: [] };
        this.peerConnection = null;
        this.repeaterRetryCount = 0;
        this.streamInfo = {
            applicationName: this.applicationName,
            streamName: this.streamName,
            sessionId: ""
        };
    }
    wsConnect() {
        let _this = this;

        try {
            this.wsConnection = new WebSocket(this.wssUrl);
        } catch (e) {
            console.log(e);
        }
        this.wsConnection.binaryType = "arraybuffer";

        this.wsConnection.onopen = () => {
            this.peerConnection.onicecandidate = _this.gotIceCandidate;

            this.peerConnection.ontrack = () => {
                try {
                    this.videoElement.srcObject = event.streams[0];
                } catch (error) {
                    this.videoElement.src = window.URL.createObjectURL(event.streams[0]);
                }
            };
            this.sendPlayGetOffer();
        };

        this.wsConnection.onmessage = (evt) => {
            let msgJSON = JSON.parse(evt.data);
            let msgStatus = Number(msgJSON["status"]);
            let msgCommand = msgJSON["command"];

            if (msgStatus == 514) {
                this.repeaterRetryCount++;
                if (this.repeaterRetryCount < 10) {
                    setTimeout(this.sendPlayGetOffer(), 500);
                } else {
                    this.stop();
                }
            } else if (msgStatus != 200) {
                this.stop();
            } else {
                let streamInfoResponse = msgJSON["streamInfo"];
                if (streamInfoResponse !== undefined) {
                    _this.streamInfo.sessionId = streamInfoResponse.sessionId;
                }

                let sdpData = msgJSON["sdp"];
                if (sdpData != null) {
                    if (_this.mungeSDP != null) {
                        msgJSON.sdp.sdp = _this.mungeSDP(msgJSON.sdp.sdp);
                    }
                    _this.peerConnection
                        .setRemoteDescription(new RTCSessionDescription(msgJSON.sdp))
                        .then(() =>
                            _this.peerConnection.createAnswer().then((description) => {
                                _this.peerConnection
                                    .setLocalDescription(description)
                                    .then(() => {
                                        _this.wsConnection.send(
                                            '{"direction":"play", "command":"sendResponse", "streamInfo":' +
                                            JSON.stringify(_this.streamInfo) +
                                            ', "sdp":' +
                                            JSON.stringify(description) +
                                            ', "userData":' +
                                            JSON.stringify(_this.iceServers) +
                                            "}"
                                        );
                                    })
                                    .catch((err) =>
                                        console.log("set local description error", err)
                                    );
                            })
                        )
                        .catch((err) => console.log("set remote description error", err));
                }

                let iceCandidates = msgJSON["iceCandidates"];
                if (iceCandidates != null) {
                    for (let index in iceCandidates) {
                        _this.peerConnection.addIceCandidate(
                            new RTCIceCandidate(iceCandidates[index])
                        );
                    }
                }
            }

            if ("sendResponse".localeCompare(msgCommand) == 0) {
                if (_this.wsConnection != null) {
                    _this.wsConnection.close();
                }

                _this.wsConnection = null;
            }
        };

        this.wsConnection.onclose = () => {
            console.log("Connection closed");
        };

        this.wsConnection.onerror = (evt) => {
            console.log(evt);
        };
    };
    gotIceCandidate(event) {
        if (event.candidate != null) {
            // console.log('gotIceCandidate: ' + JSON.stringify({ 'ice': event.candidate }));
        }
    }
    sendPlayGetOffer() {
        this.wsConnection.send(
            '{"direction":"play", "command":"getOffer", "streamInfo":' +
            JSON.stringify(this.streamInfo) +
            ', "userData":' +
            JSON.stringify(this.iceServers) +
            "}"
        );
    };

    mungeSDP(sdpStr) {
        let sdpLines = sdpStr.split(/\r\n/);
        let sdpStrRet = "";

        for (var sdpIndex in sdpLines) {
            var sdpLine = sdpLines[sdpIndex];

            if (sdpLine.length == 0) continue;

            if (sdpLine.includes("profile-level-id")) {
                // The profile-level-id string has three parts: XXYYZZ, where
                //   XX: 42 baseline, 4D main, 64 high
                //   YY: constraint
                //   ZZ: level ID
                // Look for codecs higher than baseline and force downward.
                let profileLevelId = sdpLine.substr(
                    sdpLine.indexOf("profile-level-id") + 17,
                    6
                );
                let profile = Number("0x" + profileLevelId.substr(0, 2));
                let constraint = Number("0x" + profileLevelId.substr(2, 2));
                let level = Number("0x" + profileLevelId.substr(4, 2));
                if (profile > 0x42) {
                    profile = 0x42;
                    constraint = 0xe0;
                    level = 0x1f;
                }
                let newProfileLevelId =
                    ("00" + profile.toString(16)).slice(-2).toLowerCase() +
                    ("00" + constraint.toString(16)).slice(-2).toLowerCase() +
                    ("00" + level.toString(16)).slice(-2).toLowerCase();

                sdpLine = sdpLine.replace(profileLevelId, newProfileLevelId);
            }

            sdpStrRet += sdpLine;
            sdpStrRet += "\r\n";
        }

        return sdpStrRet;
    };

    init() {

        if (this.peerConnection != null) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if (this.wsConnection != null) {
            this.wsConnection.close();
            this.wsConnection = null;
        }
        if (this.videoElement != null) {
            this.videoElement.src = "";
        }
        this.videoElement = options.videoElementId ? document.getElementById(options.videoElementId) : document.getElementById("ticon-webrtc-wowza-player");
        this.peerConnection = new RTCPeerConnection(this.iceServers);
        this.repeaterRetryCount = 0;
        this.wsConnect();
    };
    stop() {
        if (this.peerConnection != null) {
            this.peerConnection.close();
        }
        if (this.wsConnection != null) {
            this.wsConnection.close();
        }
        this.peerConnection = null;
        this.wsConnection = null;
        this.videoElement.src = "";
    };
}
