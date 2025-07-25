import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ReduxDemo from "./ReduxDemo"; // Phase 1 Redux demo
import "./index.css";


// Create router
const router = createBrowserRouter([
  {
    path: '/',
    element: <ReduxDemo />, // Use Redux demo for Phase 1
  },
]);

// Create root and render
ReactDOM.createRoot(document.getElementById("root")).render(
    <RouterProvider router={router} />
);
