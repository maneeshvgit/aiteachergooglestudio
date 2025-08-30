
import React, { useRef } from 'react';

interface InputBarProps {
  userInput: string;
  setUserInput: (value: string) => void;
  onSubmit: (query: string) => void;
  isLoading: boolean;
  isFloating: boolean;
  onInterrupt: () => void;
  onOmit: () => void;
}

export const InputBar: React.FC<InputBarProps> = ({
  userInput,
  setUserInput,
  onSubmit,
  isLoading,
  isFloating,
  onInterrupt,
  onOmit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(userInput);
  };
  
  const handleInterruptClick = () => {
      onInterrupt();
      if(inputRef.current) {
          inputRef.current.focus();
      }
  }

  return (
    <div className="w-full max-w-3xl p-4 z-30">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 flex items-center space-x-2">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={isLoading ? "Thinking..." : "Ask about a science topic..."}
          className="flex-grow bg-transparent text-white placeholder-gray-500 focus:outline-none px-3 py-2"
          disabled={isLoading}
          onKeyDown={(e) => e.key === 'Enter' && handleFormSubmit(e)}
        />
        {isFloating ? (
          <>
            <button
              onClick={handleInterruptClick}
              className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-50"
              disabled={isLoading}
              aria-label="Interrupt the teacher and ask a question"
            >
              Interrupt
            </button>
            <button
              onClick={onOmit}
              className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-400 transition-colors duration-200 disabled:opacity-50"
              disabled={isLoading}
              aria-label="Show the teacher's full response immediately"
            >
              Show All
            </button>
          </>
        ) : (
          <button
            onClick={handleFormSubmit}
            className="px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !userInput.trim()}
            aria-label="Send your message to the teacher"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "Send"}
          </button>
        )}
      </div>
    </div>
  );
};
