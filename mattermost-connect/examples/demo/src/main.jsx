import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App"; // Original implementation
import SimplifiedDemo from "./SimplifiedDemo"; // New simplified implementation
import "./index.css";

// Landing page to choose between implementations
function LandingPage() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <h1>Mattermost Connect Demo</h1>
      <p>Choose an implementation to explore:</p>
      
      <div style={{
        display: 'flex',
        gap: '20px',
        marginTop: '30px'
      }}>
        <a
          href="/original"
          style={{
            display: 'block',
            padding: '15px 30px',
            backgroundColor: '#0058CC',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          Original Implementation
        </a>
        
        <a
          href="/simplified"
          style={{
            display: 'block',
            padding: '15px 30px',
            backgroundColor: '#4A154B',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          Simplified Implementation
        </a>
      </div>
      
      <div style={{
        marginTop: '40px',
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        <h3>About this demo</h3>
        <p>
          This demo showcases two different implementations of the Mattermost Connect library:
        </p>
        <ul style={{ textAlign: 'left' }}>
          <li><strong>Original Implementation:</strong> The current production version with comprehensive features.</li>
          <li><strong>Simplified Implementation:</strong> A modernized version with React Query, React Context, and a more streamlined architecture.</li>
        </ul>
      </div>
    </div>
  );
}

// Create router
const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/original',
    element: <App />,
  },
  {
    path: '/simplified',
    element: <SimplifiedDemo />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

// Create root and render
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
