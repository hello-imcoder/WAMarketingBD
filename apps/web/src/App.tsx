// apps/web/src/App.tsx
import { RouterProvider } from "react-router";
import { router } from "@/routes";

export default function App(): React.ReactElement {
  return <RouterProvider router={router} />;
}
