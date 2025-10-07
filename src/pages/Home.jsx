import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './HomePage.css'; // We'll update this too
import { useNavigate } from 'react-router';


const HomePage = () => {
  const navigate = useNavigate()
  return (
    <Container fluid className="home-page-container d-flex flex-column"> {/* Added d-flex flex-column */}
      {/* Main content area */}
      <Row className="flex-grow-1 justify-content-center align-items-center py-4 px-3"> {/* Adjusted padding */}
        <Col md={10} lg={8}>
          <h1 className="text-center mb-md-4 mb-3 text-primary custom-h1">Welcome to the Video Proctoring System</h1>
          <p className="lead text-center mb-md-4 mb-3 text-secondary custom-p">
            Your secure and reliable solution for remote exam proctoring. Choose your role to get started.
          </p>

          <Row className="g-4 justify-content-center"> {/* Added justify-content-center */}
            <Col xs={12} md={6} className="d-flex"> {/* Added d-flex for equal height cards */}
              <Card className="shadow-lg h-100 border-0 rounded-4 custom-card">
                <Card.Img 
                  variant="top" 
                  src="/candidate.png" // Updated path
                  alt="Candidate starting interview" 
                  className="card-img-top rounded-top-4 custom-card-img"
                />
                <Card.Body className="d-flex flex-column justify-content-between p-3"> {/* Adjusted padding */}
                  <Card.Title className="h5 text-center mb-2 text-dark custom-card-title">Candidate Portal</Card.Title> {/* Adjusted heading size */}
                  <Card.Text className="text-center text-muted flex-grow-1 custom-card-text mb-3">
                    Begin your proctored examination. Ensure your environment is ready for a smooth experience.
                  </Card.Text>
                  <div className="d-grid">
                    <Button variant="success" size="lg" className="rounded-pill px-4 py-2 shadow-sm custom-button" onClick={()=> window.open("/live/interview", "_blank")}> {/* Adjusted padding */}
                      Start Interview
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={6} className="d-flex"> {/* Added d-flex for equal height cards */}
              <Card className="shadow-lg h-100 border-0 rounded-4 custom-card">
                <Card.Img 
                  variant="top" 
                  src="/interviewer.png" 
                  alt="Proctor accessing dashboard" 
                  className="card-img-top rounded-top-4 custom-card-img"
                />
                <Card.Body className="d-flex flex-column justify-content-between p-3"> {/* Adjusted padding */}
                  <Card.Title className="h5 text-center mb-2 text-dark custom-card-title">Proctor Access</Card.Title> {/* Adjusted heading size */}
                  <Card.Text className="text-center text-muted flex-grow-1 custom-card-text mb-3">
                    Manage exams, monitor candidates, and review proctoring sessions. Your control center for secure assessments.
                  </Card.Text>
                  <div className="d-grid">
                    <Button variant="primary" size="lg" className="rounded-pill px-4 py-2 shadow-sm custom-button" onClick={()=> window.open("/dashboard", "_blank")}> 
                      Access Dashboard
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Footer */}
      <Row className="py-2 bg-light custom-footer flex-shrink-0"> {/* Adjusted padding, added flex-shrink-0 */}
        <Col className="text-center text-muted">
          <p className="mb-0 custom-footer-text">&copy; {new Date().getFullYear()} Video Proctoring System. All rights reserved.</p>
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage;