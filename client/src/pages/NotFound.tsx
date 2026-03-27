import { NavLink } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="App">
      <h1>404 | Page Not Found</h1>
      <NavLink to="/">Go back to Main Menu →</NavLink>
    </div>
  );
};