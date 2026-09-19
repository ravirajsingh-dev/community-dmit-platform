import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./assets/scss/index.scss";

import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import store from "./store.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <div id="Index">
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </div>
);
