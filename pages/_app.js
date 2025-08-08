// /pages/_app.js
import "@/styles/globals.css";
import { StoryProvider } from "@/context/StoryContext";

export default function App({ Component, pageProps }) {
  return (
    <StoryProvider>
      <Component {...pageProps} />
    </StoryProvider>
  );
}
