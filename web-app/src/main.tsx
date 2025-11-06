import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {RouterProvider} from "react-router";
import {routes} from "./routes.ts";

const root = document.getElementById('root')

createRoot(root!).render(
  <StrictMode>
    <RouterProvider router={routes} />
  </StrictMode>,
)
