import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const hideSplashScreen = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.classList.add("hide");
    setTimeout(() => {
      splash.remove();
    }, 500);
  }
};

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

requestAnimationFrame(() => {
  setTimeout(hideSplashScreen, 300);
});
