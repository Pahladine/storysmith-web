import "@/styles/globals.css";
import { StoryProvider } from "@/context/StoryContext";

function MyApp({ Component, pageProps }) {
  return (
    <StoryProvider>
      <Component {...pageProps} />
    </StoryProvider>
  );
}

export default MyApp;
