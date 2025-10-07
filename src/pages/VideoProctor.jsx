import React, { useCallback, useEffect, useRef, useState } from "react";
import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
import io from "socket.io-client";
import NameModal from "../components/Modal";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;

// Global variables
let faceLandmarker;
let lastVideoTime = -1;
let results;
const videoWidth = 480;
let mediaRecorder;
let chunkSeq = 0;
let sending = false;
let candidateName = "";

// Calculate distraction
let distractionStartTime = null;
const DISTRACTION_THRESHOLD_SEC = 5;
const FOCUS_THRESHOLDS = {
  eyeLookOut: 0.5,      // eye looking away from center
  eyeLookUpDown: 0.5,   // looking too high/low
  jawLeftRight: 0.005,    // head turned sideways
  jawForward: 0.3,      // head leaned forward
  maxFaces: 1            // more than 1 face is suspicious
};

// Track distraction events separately
const distractionEvents = {
  eye_away: { start: null },
  face_not_straight: { start: null },
  multi_face: { start: null }
};
let lastLogTime = 0
let secondsCounter = 0;

// websocket connection
const SIGNAL_SERVER_URL = "https://api.interview-guide.devnest.homes";
let sessionId = "session_" + Date.now();

const VideoProctor = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const blendShapesRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const [webcamRunning, setWebcamRunning] = useState(false)
  const [btnDisable, setBtnDisable] = useState(true)
  const [nameModelOpen, setNameModalOpen] = useState(true)
  const [candidateName, setCandidateName] = useState("unknown")
  const [ROOM_ID, setRoomId] = useState(`${candidateName}-${sessionId}`)
  const navigate = useNavigate()

  // Webcam detection loop
  const detectWebCam = async () => {
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    const ctx = canvasEl.getContext("2d");

    if (!videoEl || !canvasEl || !faceLandmarker) return;

    const radio = videoEl.videoHeight / videoEl.videoWidth;
    videoEl.style.width = videoWidth + "px";
    videoEl.style.height = videoWidth * radio + "px";
    canvasEl.style.width = videoWidth + "px";
    canvasEl.style.height = videoWidth * radio + "px";
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;

    // await faceLandmarker.setOptions({ runningMode: "VIDEO" });

    const startTimeMs = performance.now();
    if (lastVideoTime !== videoEl.currentTime) {
      lastVideoTime = videoEl.currentTime;
      results = faceLandmarker.detectForVideo(videoEl, startTimeMs);
    }

    if (results?.faceBlendshapes) {
      const numFaces = results.faceLandmarks.length;
      checkDistraction(results.faceBlendshapes, numFaces);
    }

    requestAnimationFrame(detectWebCam);
  };


  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    // Set canvas width/height to match video element
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Optional: also match CSS size
    canvasRef.current.style.width = `${videoRef.current.clientWidth}px`;
    canvasRef.current.style.height = `${videoRef.current.clientHeight}px`;
    if (!hasGetUserMedia()) {
      console.log("getUserMedia() not supported.");
      return;
    }
    createFaceLandmarker().then(() => {
      // enableCam();
      setBtnDisable(false)
    });


    // Socket initialization
    socketRef.current = io(SIGNAL_SERVER_URL, {
      transports: ["websocket"], // optional, ensures it uses WebSocket
    });

    // Setup PeerConnection through ICE
    pcRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ]
    });

    // Send ICE candidates to backend
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("signal", {
          roomId: ROOM_ID,
          payload: { type: "candidate", candidate: event.candidate }
        });
      }
    };

    const testInterval = setInterval(()=>{
      socketRef.current.emit("test", {test : "here's your test"})
    }, 1000)

    return () => {
      socketRef.current.disconnect();
      pcRef.current.close();
      clearInterval(testInterval)
    };
  }, []);

  const peerConnections = {};

  const toggleWebcam = useCallback(async function () {
    if (!videoRef.current) return;
    if (!webcamRunning) {
      // Turn ON webcam
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true,audio : true });
        videoRef.current.srcObject = stream;
        const videoEl = videoRef.current;
        videoEl.srcObject = stream;
        videoEl.addEventListener("loadeddata", detectWebCam);
        setWebcamRunning(true);

        // Adding all stream tracks for send to interviewer
        stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));

        // Handle signaling from backend
        socketRef.current.on("signal", async ({ payload }) => {
          if (payload.type === "answer") {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp)); 
          }
          if (payload.type === "candidate") {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.error("Error adding ICE candidate", e);
            }
          }
        });

        // Sending the video to interviewer
        await startStreaming()

        socketRef.current.on("send-offer-to-late-joiner", async ({ newPeerId }) => {
          // Send ICE candidates as usual
          pcRef.current.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit("signal", {
                roomId: ROOM_ID,
                payload: { type: "ice-candidate", candidate: event.candidate, target: newPeerId }
              });
            }
          };

          // Create offer
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);

          // Send offer directly to late joiner
          socketRef.current.emit("signal", {
            roomId: ROOM_ID,
            payload: { type: "offer", sdp: offer.sdp, target: newPeerId }
          });

          // Keep this PeerConnection reference somewhere (map by newPeerId)
          peerConnections[newPeerId] = pcRef.current;
        });


        // Record the video
        const options = { mimeType: "video/webm; codecs=vp8,opus" };
        mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = async (e) => {
          if (!e.data || e.data.size === 0) return;
          // Send chunk to backend
          await sendChunk(e.data, sessionId, ++chunkSeq);
        };

        // mediaRecorder.start(2000);
        // sending = true;
        console.log("Webcam is ON")
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    } else {
      // Toggling off the webcam
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      sending = false;
      // Turn OFF webcam
      if (videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setWebcamRunning(false);
      console.log("Webcam is OFF");
      socketRef.current.emit("submitted", {
        roomId : ROOM_ID 
      })

      await axios.get(`${"https://api.interview-guide.devnest.homes"}/api/submitted/${sessionId}`);
      navigate("/")
    }
  }, [ROOM_ID,webcamRunning])


  const sendChunk = useCallback(async function (blob, sessionId, seq) {
    try {
      // use fetch with raw body
      const url = `${"https://api.interview-guide.devnest.homes"}/upload/chunk?sessionId=${encodeURIComponent(sessionId)}&candidate_name=${candidateName}&seq=${seq}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "video/webm"
        },
        body: blob
      });
      if (!res.ok) {
        console.error("Chunk upload failed", res.statusText);
      } else {
        console.log("Uploaded chunk", seq);
      }
    } catch (err) {
      console.error("Error sending chunk", err);
    }
  }, [ROOM_ID])


  const checkDistraction = useCallback(async function (blendShapes, numFaces) {
    if (!blendShapes?.length) return;

    const categories = {};
    blendShapes[0].categories.forEach((shape) => {
      categories[shape.categoryName] = shape.score;
    });

    let distracted = false;

    // Eyes away from screen
    const eyeLookOut = Math.max(
      categories["eyeLookOutLeft"] || 0,
      categories["eyeLookOutRight"] || 0
    );
    const eyeLookUpDown = Math.max(
      categories["eyeLookUpLeft"] || 0,
      categories["eyeLookUpRight"] || 0,
      categories["eyeLookDownLeft"] || 0,
      categories["eyeLookDownRight"] || 0
    );
    const isEyeAway = (eyeLookOut > FOCUS_THRESHOLDS.eyeLookOut || eyeLookUpDown > FOCUS_THRESHOLDS.eyeLookUpDown);

    // Head not straight
    const jawLeftRight = Math.max(
      categories["jawLeft"] || 0,
      categories["jawRight"] || 0
    );
    const jawForward = categories["jawForward"] || 0;
    const isFaceNotStraight = (jawLeftRight > FOCUS_THRESHOLDS.jawLeftRight || jawForward > FOCUS_THRESHOLDS.jawForward);

    // Multiple faces
    const isMultiFace = (numFaces > FOCUS_THRESHOLDS.maxFaces);

    // Track distraction time (global)
    const now = Date.now();
    if (!distractionStartTime) distractionStartTime = now;
    const distractedSec = (now - distractionStartTime) / 1000;

    // ********** Logging after every 2 secs
    if (now - lastLogTime >= 2000) {
      secondsCounter += 2
      lastLogTime = now;
      console.log("eyeLookOut ", FOCUS_THRESHOLDS.eyeLookOut, eyeLookOut.toFixed(2))
      console.log("eyeLookUpDown ", FOCUS_THRESHOLDS.eyeLookUpDown, eyeLookUpDown.toFixed(2))
      console.log("jawLeftRight ", FOCUS_THRESHOLDS.jawLeftRight, jawLeftRight.toFixed(4))
      console.log("jawForward ", FOCUS_THRESHOLDS.jawForward, jawForward.toFixed(4))
      console.log("maxFaces ", FOCUS_THRESHOLDS.maxFaces, numFaces)
      console.log("second ", secondsCounter)
      console.log("***********************************")
      lastLogTime = now;
    }

    await handleEvent("eye_away", isEyeAway);
    await handleEvent("face_not_straight", isFaceNotStraight);
    await handleEvent("multi_face", isMultiFace);

    async function handleEvent(eventName, isActive) {
      const event = distractionEvents[eventName];

      if (isActive) {
        if (!event.start) event.start = now; // mark start
        const duration = (now - event.start) / 1000;
        if (duration >= 2) {
          // Save event in DB
          await axios.post(`${"https://api.interview-guide.devnest.homes"}/api/events/`, { sessionId, candidateName, eventName, startTime: event.start, endTime: now, duration });
          console.warn(`⚠️ Event logged:${candidateName} ${eventName} for ${duration.toFixed(1)} sec`);
          event.start = null; // reset after storing
          distractionStartTime = now;
        }
      } else {
        event.start = null; // reset if no longer distracted
        distractionStartTime = null;
      }
    }

    // // for developer testing *******************
    // distracted = isEyeAway || isFaceNotStraight || isMultiFace;

    // if (distracted) {
    //   if (distractedSec >= DISTRACTION_THRESHOLD_SEC) {
    //     console.warn("⚠️ Candidate distracted for more than 2 minutes!");
    //     distractionStartTime = now; // reset after warning
    //   }
    // } else {
    //   distractionStartTime = null; // reset timer if candidate is focused
    // }
  }, [ROOM_ID,candidateName])


  const createFaceLandmarker = useCallback(async function () {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1
    });
  }, [])

  const hasGetUserMedia = useCallback(function () {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, [])

  const startStreaming = useCallback(async () => {
    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit("signal", {
        roomId: ROOM_ID,
        payload: { type: "offer", sdp: offer }
      });
    } catch (err) {
      console.log("error in streaming ", err)
    }

  }, [ROOM_ID])

  function setCandidateRoomid(name) {
    setCandidateName(name)
    setRoomId(`${name}-${sessionId}`)
    socketRef.current.emit("join", { roomId: `${name}-${sessionId}` });
  }

  return (
    <div className="container py-4">
      <NameModal
        isOpen={nameModelOpen}
        onClose={() => setNameModalOpen(false)}
        onSave={(name) => setCandidateRoomid(name)}
      />
      <div className="row justify-content-center">
        <div className="col-md-8 text-center">
          <h2 className="mb-4 fw-bold">Interview Proctoring System</h2>
          <h4 className="mb-4">All the best for your interview <span className="fw-bold text-danger">{candidateName}</span></h4>
          <p className="text-muted mb-4">
            Please keep your face clearly visible. The system will track your eye
            movement, head position, and distractions in real-time.
          </p>

          {/* Webcam Section */}
          <section className="border rounded shadow-lg p-2 position-relative bg-dark">
            <video
              ref={videoRef}
              id="webcam"
              className="rounded w-100"
              controls
              autoPlay
              playsInline
              style={{ maxHeight: "520px" }}
            ></video>
            <canvas
              ref={canvasRef}
              className="output_canvas position-absolute top-0 start-0 w-100 h-100"
              id="output_canvas"
            ></canvas>
          </section>

          {/* Webcam Toggle Button */}
          <div className="mt-4">
            <button
              onClick={toggleWebcam}
              disabled={btnDisable}
              className={`btn ${webcamRunning ? "btn-danger" : "btn-success"} btn-lg px-5`}
            >
              {webcamRunning ? "Submit Intgerview" : "Start Interview"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );


};

export default VideoProctor;

