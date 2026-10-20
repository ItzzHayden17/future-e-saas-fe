
import './App.css';
import Login from './Pages/Login/Login';
import { BrowserRouter,Routes,Route } from 'react-router-dom';
import Home from './Pages/Home/Home';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './Components/Navbar/Navbar';
import Sms from './Components/Sms/Sms';
import Email from './Pages/EmailPage/EmailPage';
import ProtectedRoute from './ProtectedRoute/ProtectedRoute';
import { useEffect } from 'react';
import ClientPage from './Pages/Clients/ClientPage';
import LogsPage from './Pages/Log/LogsPage';
import ClaimsPage from './Pages/Claims/ClaimsPage';


function App() {
  

  return (
    <div className="App">
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/sms" element={<ProtectedRoute><Sms /></ProtectedRoute>} />
        <Route path="/email" element={<ProtectedRoute><Email /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><ClientPage/></ProtectedRoute>} />
        <Route path="/logpage" element={<ProtectedRoute><LogsPage/></ProtectedRoute>} />
        <Route path="/claims" element={<ProtectedRoute><ClaimsPage/></ProtectedRoute>} />
      </Routes>
      </BrowserRouter>
      <ToastContainer />
      
    </div>
  );
}

export default App;
