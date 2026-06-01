import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { PropertyProvider } from "./context/PropertyContext";
import { LanguageProvider } from "./context/LanguageContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PropertyProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </PropertyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
