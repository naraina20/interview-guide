// src/utils/downloadReport.js
import jsPDF from "jspdf";
import axios from "axios";

export async function downloadReport(sessionId) {
  try {
    console.log("Fetching session data for ID:", sessionId);
    const { data } = await axios.get(`${"https://api.interview-guide.devnest.homes"}/api/events/${sessionId}`);
    const events = data.rows;

    if (!events || events.length === 0) {
      console.warn("No events found for this session. Generating a basic report.");
      // Handle cases where no data is returned
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Proctoring Report", 14, 20);
      doc.setFontSize(12);
      doc.text(`Session ID: ${sessionId}`, 14, 30);
      doc.text("No data available for this session.", 14, 40);
      doc.save(`report-${sessionId}.pdf`);
      return;
    }

    console.log("all evensts ", events)
    const submittedData = events[0].is_submit;
    const candidateName = events[0].candidate_name;
    console.log("candidate name ",submittedData, candidateName)
    const sessionStartTime = events[0].start_time ? new Date(events[0].start_time).toLocaleString() : 'N/A';
    const sessionEndTime = events[events.length-1].end_time ? new Date(events[events.length-1].end_time).toLocaleString() : 'N/A';


    const doc = new jsPDF();
    let yPos = 20; // Initial Y position for content

    // --- Header Section ---
    doc.setFillColor(40, 53, 147); // Dark blue color
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, 'F'); // Filled rectangle for header
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255); // White text
    doc.text("Proctoring Report", 14, yPos);

    // Reset text color for body
    doc.setTextColor(0, 0, 0); // Black text
    yPos = 40; // Adjust yPos after header

    // --- Candidate Information Section ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Candidate Information", 14, yPos);
    yPos += 7;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, doc.internal.pageSize.getWidth() - 14, yPos); // Horizontal line
    yPos += 5;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${candidateName}`, 14, yPos);
    yPos += 7;
    doc.text(`Session ID: ${sessionId}`, 14, yPos);
    yPos += 7;
    doc.text(`Session Start: ${sessionStartTime}`, 14, yPos);
    yPos += 7;
    doc.text(`Session End: ${sessionEndTime}`, 14, yPos);
    yPos += 7
    doc.text(`Submission Status: ${submittedData ? "Submitted" : "Not Submitted"}`, 14, yPos);
    yPos += 15;

    // --- Events Section ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Distractions & Focus Events", 14, yPos);
    yPos += 7;
    doc.line(14, yPos, doc.internal.pageSize.getWidth() - 14, yPos); // Horizontal line
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (events.length > 0) {
        // Table Headers
        doc.setFont("helvetica", "bold");
        doc.text("No.", 14, yPos);
        doc.text("Event Name", 25, yPos);
        doc.text("Start Time", 85, yPos);
        doc.text("End Time", 135, yPos);
        doc.text("Duration (s)", 180, yPos);
        yPos += 5;
        doc.line(14, yPos, doc.internal.pageSize.getWidth() - 14, yPos); // Line under headers
        yPos += 5;
        doc.setFont("helvetica", "normal");

      events.forEach((e, index) => {
        // Check for page break
        if (yPos > doc.internal.pageSize.getHeight() - 40) { // 40 for footer margin
          doc.addPage();
          yPos = 20; // Reset Y position for new page
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Distractions & Focus Events (Continued)", 14, yPos);
          yPos += 7;
          doc.line(14, yPos, doc.internal.pageSize.getWidth() - 14, yPos);
          yPos += 10;
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
            // Repeat table headers on new page
            doc.setFont("helvetica", "bold");
            doc.text("No.", 14, yPos);
            doc.text("Event Name", 25, yPos);
            doc.text("Start Time", 85, yPos);
            doc.text("End Time", 135, yPos);
            doc.text("Duration (s)", 180, yPos);
            yPos += 5;
            doc.line(14, yPos, doc.internal.pageSize.getWidth() - 14, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
        }
        
        const startTime = new Date(e.start_time).toLocaleString();
        const endTime = e.end_time ? new Date(e.end_time).toLocaleString() : "N/A";
        const duration = e.duration_sec || "-";

        doc.text(`${index + 1}.`, 14, yPos);
        doc.text(`${e.event_name}`, 25, yPos);
        doc.text(`${startTime}`, 85, yPos);
        doc.text(`${endTime}`, 135, yPos);
        doc.text(`${duration}s`, 180, yPos);
        yPos += 7; // Line spacing for events
      });
    } else {
      doc.text("No significant distractions or focus events detected.", 14, yPos);
      yPos += 10;
    }

    // --- Footer Section ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100); // Grey text for footer
    doc.text(
      "Generated by ProctorGuard AI - Ensuring fair and secure interviews.",
      14,
      doc.internal.pageSize.getHeight() - 15 // Position at bottom
    );
    doc.text(
        `Report Date: ${new Date().toLocaleDateString()}`,
        doc.internal.pageSize.getWidth() - 60,
        doc.internal.pageSize.getHeight() - 15
    );


    // Save PDF
    doc.save(`report-${candidateName}-${sessionId}.pdf`); // Sanitize filename
  } catch (err) {
    console.error("Error generating report:", err);
    alert("Failed to generate report. Please check the console for details."); // User feedback
  }
}