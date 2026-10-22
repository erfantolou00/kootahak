import axios from "axios";

// Same-origin `/api/...` is rewritten to the backend service on Vercel.
// Set NEXT_PUBLIC_API_URL only when the API is on another origin, such as
// local Nest on http://localhost:8000. This client runs in the browser, so it
// cannot read a service binding (those exist only in server functions).
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});
