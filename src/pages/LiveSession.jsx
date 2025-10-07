// LiveSession.js
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Toast } from "bootstrap";
import { toast } from "react-toastify";

const LiveSession = () => {
  const { candidate, session_id } = useParams(); // get from URL
  const ROOM_ID = `${candidate}-${session_id}`;
  const navigate = useNavigate()

  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(0);

  // Initialize WebRTC + Socket.IO
  useEffect(() => {
    socketRef.current = io("https://api.interview-guide.devnest.homes"); // backend signaling server
    pcRef.current = new RTCPeerConnection();

    socketRef.current.on("test", (data)=>{
      console.log("test : ", data.test)
      toast.error(`testing : ${data.test}`)
    })

    // Set remote stream
    pcRef.current.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    // Join room as interviewer
    socketRef.current.emit("join", { roomId: ROOM_ID });
    socketRef.current.emit("request-offers", { roomId: ROOM_ID });

    // Handle signaling
    socketRef.current.on("signal", async ({ payload }) => {
      if (payload.type === "offer") {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketRef.current.emit("signal", {
          roomId: ROOM_ID,
          payload: { type: "answer", sdp: answer }
        });

      } else if (payload.type === "candidate") {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.error("Error adding ICE candidate", e);
        }
      }
    });

    socketRef.current.on("submitted", ({ roomId }) => {
      if(ROOM_ID == roomId){
        toast.info("Interview Completed")
        navigate("/dashboard")
      }
    })

    // ICE candidates
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("signal", {
          roomId: ROOM_ID,
          payload: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    return () => {
      socketRef.current.disconnect();
      pcRef.current.close();
    };
  }, [ROOM_ID]);

  // Fetch distraction events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axios.get(
          `${"https://api.interview-guide.devnest.homes"}/api/events/${session_id}`
        );
        setEvents(res.data.rows || []);
        setIsSubmitted(res.data?.rows[0]?.is_submit)
      } catch (err) {
        console.error("Error fetching events", err);
      }
    };
    fetchEvents();

    const interval = setInterval(fetchEvents, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, [ROOM_ID]);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center my-3">
        <h3 className="mb-3">Live Session: {candidate}  <span className="badge bg-danger">{isSubmitted ? "Submitted" : "Live"}</span></h3>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
      </div>

      <div className="row" style={{ height: "85vh" }}>
        {/* Video Section */}
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-body">
              {isSubmitted ? <video src={`${"https://api.interview-guide.devnest.homes"}/video/${candidate}-${session_id}.webm`} controls playsInline style={{ width: "100%", borderRadius: "8px" }}>

              </video>: <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: "100%", borderRadius: "8px" }}
              ></video>}
              
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="col-md-4 h-100 p-3">
          <div className="card shadow-sm h-100">
            <div className="card-body h-100 overflow-y-hidden">
              <h5 className="mb-3">Distraction Events</h5>
              {events.length === 0 ? (
                <p className="text-muted">No events logged yet.</p>
              ) : (
                <ul className="list-group h-100 overflow-y-auto">
                  {events.map((e, idx) => (
                    <li key={idx} className="list-group-item">
                      <strong className="badge bg-info">{e.event_name}</strong>
                      {e.duration_sec ? <p><strong className="d-block">Duration : {e.duration_sec?.toFixed(1)} Sec</strong></p> : ''}
                      <hr />
                      <div className="d-flex flex-column">
                        {e.start_time ? <p><strong>Start at:</strong><small className="text-muted">
                          {new Date(e.start_time).toLocaleString()}
                        </small></p> : ''}
                        
                        {e.end_time? <p><strong >End at:</strong><small className="text-muted">
                          {new Date(e.end_time).toLocaleString()}
                        </small></p> : '' }
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;
