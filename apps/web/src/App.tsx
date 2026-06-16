import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GroupsScreen } from "./screens/GroupsScreen.js";
import { GroupScreen } from "./screens/GroupScreen.js";
import { ImportScreen } from "./screens/ImportScreen.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GroupsScreen />} />
        <Route path="/g/:id" element={<GroupScreen />} />
        <Route path="/import" element={<ImportScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
