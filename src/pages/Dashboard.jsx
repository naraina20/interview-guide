import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { downloadReport } from "../utils/report";


const Dashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [reportDownloading, setReportDownloading] = useState(false);
  const navigate = useNavigate();

  // Fetch users from backend
  useEffect(() => {
    
    const fetchCandidates = async () => {
      try {
        const res = await axios.get(`${"https://api.interview-guide.devnest.homes"}/api/candidates`); // create this API on backend
        if (res.data.ok) {
          setCandidates(res.data.rows); // assuming backend returns { rows: [{ name, sessionId }, ...] }
        }
      } catch (err) {
        console.error("Error fetching candidates:", err);
      }
    };

    fetchCandidates();
  }, []);

  const candidateReport = (sid) =>{
    setReportDownloading(true)
    downloadReport(sid)
    setReportDownloading(false)
  }

  const handleCandidateClick = (sessionId,candidate) => {
    // Redirect to live stream page with sessionId
    navigate(`${candidate}/live/${sessionId}`);
  };
  return (
    <div className="container mt-4">
      
      <h2 className="mb-3">Candidate Dashboard</h2>
      <table className="table table-striped table-bordered">
        <thead>
          <tr>
            <th>Name</th>
            <th>Session ID</th>
            <th>Joined On</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate, idx) => (
            <tr key={idx}>
              <td>{candidate.candidate_name}</td>
              <td>{candidate.session_id}</td>
              <td>{new Date(candidate.start_time).toLocaleString()}</td>
              <td>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleCandidateClick(candidate.session_id,candidate.candidate_name)}
                >
                  {candidate.is_submit? "Recording" : "Live"}
                </button>
                <button
                  className="btn btn-primary btn-sm ms-1"
                  onClick={() => candidateReport(candidate.session_id)}
                >
                  Download Report <span className={reportDownloading ? "spinner-border spinner-border-sm": "d-none"} role="status" aria-hidden="true"></span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
