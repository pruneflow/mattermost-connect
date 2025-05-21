import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App"; // Main application with authentication flow
import MattermostDemo from "./MattermostDemo"; // New component implementation
import "./index.css";


// Create router
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/demo',
    element: <MattermostDemo />,
  }
]);

// Create root and render
ReactDOM.createRoot(document.getElementById("root")).render(
    <RouterProvider router={router} />
);
