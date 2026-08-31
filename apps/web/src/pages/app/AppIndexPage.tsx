// apps/web/src/pages/app/AppIndexPage.tsx
// Route: "/app" — redirects to /app/task (task list is the default landing in the user panel)
import { Navigate } from "react-router";

export default function AppIndexPage(): React.ReactElement {
  return <Navigate to="/app/task" replace />;
}
