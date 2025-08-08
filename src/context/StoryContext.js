import { createContext, useState, useContext } from "react";

const StoryContext = createContext();

export function StoryProvider({ children }) {
  const [storyState, setStoryState] = useState({
    story_content: {},
    story_data: {},
  });

  const [sharedResponse, setSharedResponse] = useState("");

  return (
    <StoryContext.Provider
      value={{ storyState, setStoryState, sharedResponse, setSharedResponse }}
    >
      {children}
    </StoryContext.Provider>
  );
}

export function useStory() {
  return useContext(StoryContext);
}
