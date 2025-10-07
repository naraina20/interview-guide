import { BrowserRouter as Router, Routes, Route } from 'react-router'
import VideoProctor from './pages/VideoProctor'
import LiveSession from './pages/LiveSession'
import Dashboard from './pages/Dashboard'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Home from './pages/Home';



function App() {

  return (
    <Router>
      <Routes>
        <Route exact path='/' Component={Home} />
        <Route exact path='/live/interview' Component={VideoProctor} />
        <Route exact path='dashboard/:candidate/live/:session_id' Component={LiveSession} />
        <Route exact path='/dashboard' Component={Dashboard} />
      </Routes>
    </Router>
  )
}

export default App
