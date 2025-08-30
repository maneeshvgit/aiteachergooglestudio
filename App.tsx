
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RobotAvatar } from './components/RobotAvatar';
import { MessageDisplay } from './components/MessageDisplay';
import { InputBar } from './components/InputBar';
import { getAiTeacherResponse } from './services/geminiService';
import type { MediaInfo } from './types';
import { Message, Role } from './types';
import { READING_SPEED_MS_PER_CHAR, MEDIA_OVERLAY_DURATION_MS } from './constants';

export default function App(): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [floatingText, setFloatingText] = useState<string>('');
  const [isFloating, setIsFloating] = useState<boolean>(false);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);

  // Fix: Use ReturnType<typeof setInterval> for browser compatibility instead of NodeJS.Timeout
  const textFloatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Fix: Use ReturnType<typeof setTimeout> for browser compatibility instead of NodeJS.Timeout
  const mediaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAiResponseRef = useRef<string>('');
  const floatingTextIndexRef = useRef<number>(0);
  const interruptedTextRef = useRef<string>('');

  const stopFloatingText = useCallback(() => {
    if (textFloatIntervalRef.current) {
      clearInterval(textFloatIntervalRef.current);
      textFloatIntervalRef.current = null;
    }
    setIsFloating(false);
  }, []);

  const handleCloseMedia = useCallback(() => {
    setMediaInfo(null);
    if (mediaTimeoutRef.current) {
      clearTimeout(mediaTimeoutRef.current);
      mediaTimeoutRef.current = null;
    }
  }, []);

  const parseAndDisplayMedia = useCallback((text: string) => {
    const imageRegex = /\(see: (.*?(\.png|\.jpg|\.jpeg))\)/i;
    const videoRegex = /\(YouTube: (https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+))\)/i;

    const imageMatch = text.match(imageRegex);
    const videoMatch = text.match(videoRegex);

    let newMediaInfo: MediaInfo | null = null;

    if (videoMatch && videoMatch[2]) {
      newMediaInfo = { type: 'video', url: `https://www.youtube.com/embed/${videoMatch[2]}` };
    } else if (imageMatch) {
      // Use a placeholder image as we can't access local file paths
      newMediaInfo = { type: 'image', url: `https://picsum.photos/seed/${encodeURIComponent(imageMatch[1])}/1280/720` };
    }

    if (newMediaInfo) {
      handleCloseMedia(); // Close any existing media first
      setMediaInfo(newMediaInfo);
      mediaTimeoutRef.current = setTimeout(() => setMediaInfo(null), MEDIA_OVERLAY_DURATION_MS);
    }
  }, [handleCloseMedia]);

  const startFloatingText = useCallback((fullText: string) => {
    stopFloatingText();
    setFloatingText('');
    floatingTextIndexRef.current = 0;
    currentAiResponseRef.current = fullText;
    setIsFloating(true);

    textFloatIntervalRef.current = setInterval(() => {
      if (floatingTextIndexRef.current < currentAiResponseRef.current.length) {
        const nextChar = currentAiResponseRef.current[floatingTextIndexRef.current];
        setFloatingText(prev => prev + nextChar);
        floatingTextIndexRef.current++;
        
        const currentDisplayedText = currentAiResponseRef.current.substring(0, floatingTextIndexRef.current);
        // Only parse when a potential media link might have just completed
        if (currentDisplayedText.endsWith(')')) { 
             parseAndDisplayMedia(currentDisplayedText);
        }
      } else {
        stopFloatingText();
        // Final media check on the whole text
        parseAndDisplayMedia(currentAiResponseRef.current);
      }
    }, READING_SPEED_MS_PER_CHAR);
  }, [stopFloatingText, parseAndDisplayMedia]);

  const handleSubmit = async (query: string) => {
    if (!query.trim() || isLoading) return;

    const interruptionContext = interruptedTextRef.current;
    interruptedTextRef.current = ''; // Clear after use

    stopFloatingText();
    setFloatingText('');
    
    const userMessage: Message = { role: Role.USER, content: query };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setUserInput('');
    setIsLoading(true);

    try {
      const aiResponse = await getAiTeacherResponse(query, messages, interruptionContext || undefined);
      const aiMessage: Message = { role: Role.ASSISTANT, content: aiResponse };
      setMessages(prev => [...prev, aiMessage]);
      startFloatingText(aiResponse);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      const errorMessage: Message = { role: Role.ASSISTANT, content: "Oh dear, it seems my circuits are a bit scrambled. Could you try asking again?" };
      setMessages(prev => [...prev, errorMessage]);
      setFloatingText(errorMessage.content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterrupt = () => {
    stopFloatingText();
    interruptedTextRef.current = floatingText;
  };
  
  const handleOmit = () => {
    stopFloatingText();
    setFloatingText(currentAiResponseRef.current);
    parseAndDisplayMedia(currentAiResponseRef.current);
  };

  useEffect(() => {
    return () => { // Cleanup on unmount
      stopFloatingText();
      if (mediaTimeoutRef.current) clearTimeout(mediaTimeoutRef.current);
    };
  }, [stopFloatingText]);

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      <div className="relative w-full max-w-4xl h-[80vh] flex flex-col items-center justify-center">
        <RobotAvatar mediaInfo={mediaInfo} onClose={handleCloseMedia} isSpeaking={isFloating} />
        <MessageDisplay text={floatingText} />
      </div>
      <InputBar
        userInput={userInput}
        setUserInput={setUserInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        isFloating={isFloating}
        onInterrupt={handleInterrupt}
        onOmit={handleOmit}
      />
    </div>
  );
}
